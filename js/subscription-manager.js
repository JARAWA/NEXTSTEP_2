/**
 * subscription-manager.js
 * 
 * Enhanced subscription management with Razorpay payment integration
 */
import { 
    getAuth, 
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    getDoc, 
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

class SubscriptionManager {
    constructor() {
        this.auth = getAuth();
        this.db = getFirestore();
        this.currentUser = null;
        this.isPremium = false;
        this._isShowingModal = false;
        
        // Backend API URL - UPDATE THIS WITH YOUR ACTUAL RENDER BACKEND URL
        this.BACKEND_URL = 'https://nextstep-backend-xdd7.onrender.com';
        // For local testing: this.BACKEND_URL = 'http://localhost:5000';
        
        // Razorpay configuration
        this.razorpayKeyId = 'rzp_live_GgEM5tXGq55aA0';
        
        // Subscription plan - Single plan
        this.subscriptionPlans = {
            premium: {
                id: 'plan_premium_2months',
                name: '2 Months Premium Access',
                amount: 10000, // Amount in paise (₹100)
                currency: 'INR',
                duration: 60, // 60 days
                dailyLimit: 5,
                features: [
                    'Access to all preference list generators',
                    '5 preference lists per day',
                    'Advanced analytics and insights',
                    'Priority support',
                    'Valid for 2 months'
                ]
            }
        };
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the subscription manager
     */
    init() {
        console.log('🔄 Subscription Manager with Razorpay initializing...');
        
        // Load Razorpay SDK
        this.loadRazorpaySDK();
        
        // Ensure modal is hidden at startup
        this._ensureModalHidden();
        
        this.setupAuthListener();
        
        // Wait for DOM to be ready before setting up event listeners
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(() => this.setupEventListeners(), 100);
        } else {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        }
        
        console.log('✅ Subscription Manager initialized');
    }
    
    /**
     * Load Razorpay SDK dynamically
     */
    loadRazorpaySDK() {
        if (document.getElementById('razorpay-sdk')) return;
        
        const script = document.createElement('script');
        script.id = 'razorpay-sdk';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.head.appendChild(script);
        
        script.onload = () => {
            console.log('✅ Razorpay SDK loaded');
        };
    }
    
    /**
     * Ensure modal is hidden on startup
     */
    _ensureModalHidden() {
        const modal = document.getElementById('subscriptionModal');
        if (modal) {
            console.log('🔒 Ensuring modal is hidden on startup');
            modal.style.display = 'none';
        }
    }
    
    /**
     * Set up Firebase auth state listener
     */
    setupAuthListener() {
        onAuthStateChanged(this.auth, async (user) => {
            console.log('👤 Auth state changed:', user ? 'User logged in' : 'User logged out');
            
            if (user) {
                this.currentUser = user;
                await this.checkPremiumStatus();
            } else {
                this.currentUser = null;
                this.isPremium = false;
                
                // Hide modal if user logs out
                this.hideSubscriptionModal();
            }
            // Update UI after auth state changes
            this.updatePremiumUI();
        });
    }
    
    /**
     * Set up event listeners for subscription modal
     */
    setupEventListeners() {
        console.log('🔄 Setting up subscription event listeners');
        
        // Update modal content to show plans instead of code input
        this.updateModalContent();
        
        // Ensure modal exists before setting up events
        const modal = document.getElementById('subscriptionModal');
        if (!modal) {
            console.warn('⚠️ Subscription modal not found in DOM yet, will retry in 500ms');
            setTimeout(() => this.setupEventListeners(), 500);
            return;
        }
        
        // Ensure modal is hidden by default
        modal.style.display = 'none';
        
        // Close modal when clicking the X
        const closeButton = document.getElementById('close-subscription-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                console.log('❌ Close button clicked');
                this.hideSubscriptionModal();
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                console.log('🔄 Clicked outside modal');
                this.hideSubscriptionModal();
            }
        });
        
        // Update all premium-required buttons
        this.updatePremiumButtons();
        
        console.log('✅ Subscription event listeners setup complete');
    }
    
    /**
     * Update modal content to show subscription plans
     */
    updateModalContent() {
        const modalContent = document.querySelector('.subscription-content');
        if (!modalContent) return;
        
        const plan = this.subscriptionPlans.premium;
        
        modalContent.innerHTML = `
            <h2>Get Premium Access</h2>
            <p>Unlock all features and create your perfect college preference lists</p>
            
            <div class="subscription-plan-single">
                <div class="plan-card premium-plan">
                    <div class="plan-header">
                        <h3>${plan.name}</h3>
                        <div class="plan-price">
                            <span class="currency">₹</span>
                            <span class="amount">${(plan.amount / 100)}</span>
                            <span class="period">for 2 months</span>
                        </div>
                    </div>
                    
                    <div class="plan-features">
                        <h4>What's Included:</h4>
                        <ul>
                            ${plan.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <button class="btn btn-primary select-plan-btn" onclick="window.SubscriptionManager.selectPlan('premium')">
                        <i class="fas fa-crown"></i> Get Premium Access
                    </button>
                    
                    <div class="plan-note">
                        <i class="fas fa-info-circle"></i> 
                        <span>One-time payment. No recurring charges.</span>
                    </div>
                </div>
            </div>
            
            <div class="secure-payment-info">
                <i class="fas fa-lock"></i>
                <span>Secure payment powered by Razorpay</span>
            </div>
            
            <style>
                .subscription-plan-single {
                    display: flex;
                    justify-content: center;
                    margin: 30px 0;
                }
                
                .plan-card.premium-plan {
                    max-width: 400px;
                    width: 100%;
                    padding: 30px;
                    border: 2px solid var(--primary-color, #006B6B);
                    border-radius: 15px;
                    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                    box-shadow: 0 10px 30px rgba(0, 107, 107, 0.1);
                    transition: all 0.3s ease;
                }
                
                .plan-card.premium-plan:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 40px rgba(0, 107, 107, 0.15);
                }
                
                .plan-header {
                    text-align: center;
                    margin-bottom: 25px;
                }
                
                .plan-header h3 {
                    color: var(--primary-color, #006B6B);
                    margin-bottom: 15px;
                    font-size: 24px;
                }
                
                .plan-price {
                    display: flex;
                    align-items: baseline;
                    justify-content: center;
                    gap: 5px;
                }
                
                .plan-price .currency {
                    font-size: 24px;
                    color: #666;
                }
                
                .plan-price .amount {
                    font-size: 48px;
                    font-weight: bold;
                    color: var(--primary-color, #006B6B);
                }
                
                .plan-price .period {
                    font-size: 16px;
                    color: #666;
                    margin-left: 5px;
                }
                
                .plan-features {
                    margin: 25px 0;
                }
                
                .plan-features h4 {
                    font-size: 16px;
                    color: #333;
                    margin-bottom: 15px;
                }
                
                .plan-features ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .plan-features li {
                    padding: 8px 0;
                    color: #555;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .plan-features li i {
                    color: #27ae60;
                    font-size: 14px;
                }
                
                .select-plan-btn {
                    width: 100%;
                    padding: 15px;
                    font-size: 18px;
                    font-weight: 600;
                    background: var(--primary-color, #006B6B);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                
                .select-plan-btn:hover {
                    background: #005555;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0, 107, 107, 0.3);
                }
                
                .select-plan-btn.loading {
                    position: relative;
                    color: transparent;
                }
                
                .select-plan-btn.loading::after {
                    content: "";
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    top: 50%;
                    left: 50%;
                    margin-left: -10px;
                    margin-top: -10px;
                    border: 3px solid #f3f3f3;
                    border-radius: 50%;
                    border-top: 3px solid #006B6B;
                    animation: spin 1s linear infinite;
                }
                
                .plan-note {
                    text-align: center;
                    margin-top: 15px;
                    font-size: 13px;
                    color: #666;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }
                
                .plan-note i {
                    color: #3498db;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .secure-payment-info {
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 14px;
                }
                
                .secure-payment-info i {
                    color: #27ae60;
                    margin-right: 5px;
                }
                
                @media (max-width: 768px) {
                    .plan-card.premium-plan {
                        padding: 20px;
                    }
                    
                    .plan-price .amount {
                        font-size: 36px;
                    }
                    
                    .select-plan-btn {
                        font-size: 16px;
                        padding: 12px;
                    }
                }
            </style>
        `;
    }
    
    /**
     * Handle plan selection and initiate payment
     */
    async selectPlan(planKey) {
        if (!this.currentUser) {
            alert('Please log in to continue');
            return;
        }
        
        const plan = this.subscriptionPlans[planKey];
        if (!plan) {
            console.error('Invalid plan selected');
            return;
        }
        
        try {
            // Show loading state on button
            const button = event.target;
            if (button) {
                button.classList.add('loading');
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
            
            // Call your backend API to create order
            const response = await fetch(`${this.BACKEND_URL}/api/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.uid,
                    userEmail: this.currentUser.email,
                    planId: plan.id,
                    amount: plan.amount,
                    currency: plan.currency
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create order');
            }
            
            const result = await response.json();
            console.log('Order created:', result);
            
            // Initialize Razorpay payment with the order ID from server
            this.initiateRazorpayPayment(plan, result.orderId);
            
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Error processing your request. Please try again.');
        } finally {
            // Reset button state
            if (event.target) {
                const button = event.target;
                button.classList.remove('loading');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-crown"></i> Get Premium Access';
            }
        }
    }
    
    /**
     * Initialize Razorpay payment
     */
    initiateRazorpayPayment(plan, orderId) {
        const options = {
            key: this.razorpayKeyId,
            amount: plan.amount,
            currency: plan.currency,
            name: 'NextStep Premium',
            description: plan.name,
            order_id: orderId,
            prefill: {
                name: this.currentUser.displayName || '',
                email: this.currentUser.email,
                contact: '' // Add if you have user's phone number
            },
            theme: {
                color: '#006B6B'
            },
            handler: async (response) => {
                // Payment successful - send to backend for verification
                await this.handlePaymentSuccess(response, plan, orderId);
            },
            modal: {
                ondismiss: () => {
                    console.log('Payment cancelled by user');
                }
            }
        };
        
        // Check if Razorpay is loaded
        if (typeof Razorpay === 'undefined') {
            alert('Payment system is loading. Please try again in a moment.');
            return;
        }
        
        const razorpay = new Razorpay(options);
        razorpay.open();
    }
    
    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(response, plan, orderId) {
        console.log('Payment successful:', response);
        
        try {
            // Show processing message
            if (window.showToast) {
                window.showToast('Verifying payment...', 'info');
            }
            
            // Call backend to verify payment
            const verifyResponse = await fetch(`${this.BACKEND_URL}/api/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: orderId,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    userId: this.currentUser.uid
                })
            });
            
            if (!verifyResponse.ok) {
                throw new Error('Payment verification failed');
            }
            
            const result = await verifyResponse.json();
            
            if (result.success) {
                // Update local state
                this.isPremium = true;
                this.updatePremiumUI();
                
                // Hide modal and show success
                this.hideSubscriptionModal();
                
                if (window.showToast) {
                    window.showToast('Premium subscription activated successfully!', 'success');
                } else {
                    alert('Premium subscription activated successfully!');
                }
                
                // Refresh page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(result.error || 'Payment verification failed');
            }
            
        } catch (error) {
            console.error('Error verifying payment:', error);
            alert('Payment verification failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
        }
    }
    
    /**
     * Update all buttons requiring premium access
     */
    updatePremiumButtons() {
        console.log('🔄 Updating premium buttons, isPremium:', this.isPremium);
        
        // Update button styling for all premium buttons
        document.querySelectorAll('[data-requires-premium="true"]').forEach(button => {
            button.classList.toggle('premium-active', this.isPremium);
        });
        
        // Register with ButtonHandlerCoordinator if available
        if (window.ButtonHandlerCoordinator) {
            window.ButtonHandlerCoordinator.registerHandler('premium', async (button, event) => {
                const isPremium = await this.checkPremiumStatus();
                if (!isPremium) {
                    this.showSubscriptionModal();
                    return false;
                }
                return true;
            });
            console.log('✅ Premium handler registered with ButtonHandlerCoordinator');
        }
    }
    
    /**
     * Check if the current user has premium access
     */
    async checkPremiumStatus() {
        if (!this.currentUser) {
            console.log('👤 No user logged in, premium status: false');
            this.isPremium = false;
            return false;
        }
        
        try {
            console.log('🔄 Checking premium status for user:', this.currentUser.uid);
            
            // Get user document from Firestore
            const userDoc = await getDoc(doc(this.db, "users", this.currentUser.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Check if user has subscription and if it's still valid
                if (userData.subscription) {
                    const now = new Date();
                    const expiryDate = new Date(userData.subscription.expiryDate);
                    
                    this.isPremium = expiryDate > now && userData.subscription.isActive;
                    console.log(`✅ Premium status: ${this.isPremium ? 'Active' : 'Inactive'}, Expiry: ${expiryDate.toLocaleDateString()}`);
                    
                    // If subscription has expired, update the status
                    if (!this.isPremium && userData.subscription.isActive) {
                        await this.updateSubscriptionStatus({
                            isActive: false
                        });
                    }
                } else {
                    this.isPremium = false;
                    console.log('⚠️ No subscription data found for user');
                }
            } else {
                this.isPremium = false;
                console.log('⚠️ User document not found in Firestore');
            }
            
            // Update UI to reflect premium status
            this.updatePremiumUI();
            
            return this.isPremium;
        } catch (error) {
            console.error("❌ Error checking premium status:", error);
            this.isPremium = false;
            return false;
        }
    }
    
    /**
     * Update UI to reflect premium status
     */
    updatePremiumUI() {
        // Update premium-only buttons
        document.querySelectorAll('[data-requires-premium="true"]').forEach(button => {
            button.classList.toggle('premium-active', this.isPremium);
        });
        
        // Update premium badge in user dropdown if available
        if (typeof window.updatePremiumStatus === 'function') {
            window.updatePremiumStatus(this.isPremium);
        }
    }
    
    /**
     * Update user's subscription status in Firestore
     */
    async updateSubscriptionStatus(updates) {
        if (!this.currentUser) return false;
        
        try {
            const userRef = doc(this.db, "users", this.currentUser.uid);
            
            await updateDoc(userRef, {
                'subscription.isActive': updates.isActive,
                'subscription.updatedAt': new Date().toISOString()
            });
            
            console.log('✅ Subscription status updated');
            return true;
        } catch (error) {
            console.error("❌ Error updating subscription status:", error);
            return false;
        }
    }
    
    /**
     * Show subscription modal
     */
    async showSubscriptionModal() {
        console.log('🔄 showSubscriptionModal called, checking premium status');
        
        try {
            this._isShowingModal = true;
            
            // Always do a fresh check of premium status before showing modal
            const isPremium = await this.checkPremiumStatus();
            console.log('🔄 Fresh premium check result:', isPremium);
            
            // Only show modal if user is NOT premium
            if (!isPremium) {
                const modal = document.getElementById('subscriptionModal');
                if (modal) {
                    console.log('🔄 Showing subscription modal');
                    modal.style.display = 'block';
                } else {
                    console.error('❌ Subscription modal not found in DOM');
                }
            } else {
                console.log('👑 User already has premium, not showing modal');
                if (window.showToast) {
                    window.showToast('You already have an active premium subscription!', 'info');
                } else {
                    alert('You already have an active premium subscription!');
                }
            }
        } catch (error) {
            console.error('❌ Error in showSubscriptionModal:', error);
        } finally {
            setTimeout(() => {
                this._isShowingModal = false;
            }, 200);
        }
    }
    
    /**
     * Hide subscription modal
     */
    hideSubscriptionModal() {
        console.log('🔄 Hiding subscription modal');
        const modal = document.getElementById('subscriptionModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Check if a feature requires premium and show modal if necessary
     */
    async checkPremiumAccess(callback) {
        console.log('🔄 Checking premium access');
        
        // Always do a fresh check
        const isPremium = await this.checkPremiumStatus();
        
        if (isPremium) {
            console.log('✅ Premium access confirmed');
            if (typeof callback === 'function') {
                callback();
            }
            return true;
        } else {
            console.log('⚠️ Premium access required but not active');
            this.showSubscriptionModal();
            return false;
        }
    }
}

// Initialize subscription manager
let subscriptionManager = null;

// Initialize function to be called after DOM is loaded
function initSubscriptionManager() {
    console.log('🔄 initSubscriptionManager called');
    
    if (!subscriptionManager) {
        console.log('🔄 Creating new SubscriptionManager instance');
        subscriptionManager = new SubscriptionManager();
        
        // Expose to global scope for access from other scripts
        window.SubscriptionManager = subscriptionManager;
        
        console.log('✅ Subscription Manager with Razorpay initialized and exposed globally');
    } else {
        console.log('⚠️ SubscriptionManager already exists, reusing instance');
    }
    
    return subscriptionManager;
}

// Export for module imports
export default subscriptionManager || new SubscriptionManager();

// Make initialization function available globally
window.initSubscriptionManager = initSubscriptionManager;
