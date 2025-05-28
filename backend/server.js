const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://nextstepedu.co.in',
    'https://www.nextstepedu.co.in',
    'http://localhost:3000',
    'http://localhost:5000'
  ]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase Admin with service account
// You'll need to add your service account JSON
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_GgEM5tXGq55aA0',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'N4iVoB5DrLDfIPM5tBscRgFB'
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'NextStep Backend API is running' });
});

// Create Razorpay Order
app.post('/api/create-order', async (req, res) => {
  try {
    const { userId, userEmail, planId, amount, currency = 'INR' } = req.body;

    // Validate input
    if (!userId || !planId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: userId, planId, and amount'
      });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount, // Amount in paise
      currency: currency,
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId,
        planId: planId
      }
    });

    // Store order in Firestore
    await db.collection('subscription_orders').doc(order.id).set({
      orderId: order.id,
      userId: userId,
      userEmail: userEmail,
      planId: planId,
      amount: amount,
      currency: currency,
      status: 'created',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify Payment
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { orderId, paymentId, signature, userId } = req.body;

    // Validate input
    if (!orderId || !paymentId || !signature || !userId) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'N4iVoB5DrLDfIPM5tBscRgFB')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({
        error: 'Invalid payment signature'
      });
    }

    // Get order details
    const orderDoc = await db.collection('subscription_orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();

    // Verify order belongs to user
    if (orderData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Calculate subscription expiry
    const now = new Date();
    const expiryDate = new Date(now);
    
    // Determine duration based on amount
    let duration = 30; // Default 30 days
    if (orderData.amount === 2499) duration = 90;
    else if (orderData.amount === 7999) duration = 365;
    
    expiryDate.setDate(now.getDate() + duration);

    // Update order and user subscription
    const batch = db.batch();

    // Update order
    batch.update(db.collection('subscription_orders').doc(orderId), {
      status: 'paid',
      paymentId: paymentId,
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user subscription
    batch.update(db.collection('users').doc(userId), {
      subscription: {
        isActive: true,
        planId: orderData.planId,
        activatedAt: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        paymentId: paymentId,
        orderId: orderId,
        lastPaymentAmount: orderData.amount,
        lastPaymentDate: now.toISOString()
      }
    });

    await batch.commit();

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      expiryDate: expiryDate.toISOString()
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Razorpay Webhook
app.post('/api/razorpay-webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    
    if (secret) {
      // Verify webhook signature
      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== req.headers['x-razorpay-signature']) {
        return res.status(400).send('Invalid signature');
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log('Webhook event:', event);

    // Handle different events
    switch (event) {
      case 'payment.captured':
        console.log('Payment captured:', payload.payment.entity.id);
        break;
      
      case 'payment.failed':
        console.log('Payment failed:', payload.payment.entity.id);
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
