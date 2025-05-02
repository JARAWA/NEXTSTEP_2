/**
 * subscription-modal-fix.js
 * Enhanced with debug logs to identify issues with the subscription modal
 */

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - subscription-modal-fix.js starting...');
    
    // Wait a bit to ensure the subscription modal is loaded
    setTimeout(function() {
        console.log('Checking for subscription modal elements...');
        const activateButton = document.getElementById('activate-subscription');
        const subscriptionCodeInput = document.getElementById('subscription-code');
        const errorElement = document.getElementById('subscription-code-error');
        const subscriptionModal = document.getElementById('subscriptionModal');
        
        console.log('Modal elements found:', {
            activateButton: !!activateButton,
            subscriptionCodeInput: !!subscriptionCodeInput,
            errorElement: !!errorElement,
            subscriptionModal: !!subscriptionModal
        });
        
        if (!activateButton) {
            console.error('Activate Premium button not found - DOM may not be fully loaded yet');
            return;
        }
        
        if (!subscriptionCodeInput) {
            console.error('Subscription code input not found - check modal HTML structure');
            return;
        }
        
        if (!errorElement) {
            console.error('Error message element not found - check modal HTML structure');
            return;
        }
        
        // Check for existing click handlers
        console.log('Checking for existing event listeners...');
        const existingClickHandlers = activateButton.onclick ? 'Has onclick handler' : 'No onclick handler';
        console.log('Existing click handler status:', existingClickHandlers);
        
        // Make sure error element is properly styled
        errorElement.style.display = 'none';
        
        // Add event listener to the button
        console.log('Attaching new click event listener to activate button...');
        activateButton.addEventListener('click', function(event) {
            console.log('Activate Premium button clicked in subscription-modal-fix.js');
            // Prevent any default behavior or propagation issues
            event.preventDefault();
            event.stopPropagation();
            verifyAndActivateSubscription();
        });
        
        // Also add event listener for Enter key in the input field
        subscriptionCodeInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                console.log('Enter key pressed in subscription input in subscription-modal-fix.js');
                verifyAndActivateSubscription();
            }
        });
        
        // Also add direct onclick handler as a backup
        activateButton.onclick = function(event) {
            console.log('Activate button onclick handler triggered in subscription-modal-fix.js');
            event.preventDefault();
            verifyAndActivateSubscription();
            return false;
        };
        
        console.log('Event listeners successfully added to subscription modal elements');
        
        // Check if the SubscriptionManager is initialized properly
        console.log('Checking SubscriptionManager status...');
        if (window.SubscriptionManager) {
            console.log('SubscriptionManager found in global scope');
        } else {
            console.warn('SubscriptionManager not found in global scope - this might cause conflicts');
        }
        
        // Function to verify and activate subscription
        function verifyAndActivateSubscription() {
            console.log('verifyAndActivateSubscription function called');
            
            const code = subscriptionCodeInput.value.trim();
            console.log('Subscription code entered:', code ? 'Code provided' : 'No code provided');
            
            // Clear previous error
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            
            if (!code) {
                console.log('Error: No subscription code provided');
                errorElement.textContent = 'Please enter a subscription code';
                errorElement.style.display = 'block';
                return;
            }
            
            // Define valid subscription codes
            const validCodes = {
                "NEXTSTEP2025": { duration: 365 }, // 1 year
                "PREMIUM3MONTH": { duration: 90 },  // 3 months
                "TRYNEXTSTEP": { duration: 7 }      // 1 week trial
            };
            
            // Check if code is valid
            if (!validCodes[code]) {
                console.log('Error: Invalid subscription code entered');
                errorElement.textContent = 'Invalid subscription code. Please try again.';
                errorElement.style.display = 'block';
                return;
            }
            
            console.log('Valid subscription code entered:', code);
            
            // Get the current user
            const auth = window.firebaseAuth;
            console.log('Firebase Auth available:', !!auth);
            
            if (!auth || !auth.currentUser) {
                console.error('Error: User not logged in or Firebase Auth not initialized');
                errorElement.textContent = 'You must be logged in to activate a subscription';
                errorElement.style.display = 'block';
                return;
            }
            
            console.log('Current user UID:', auth.currentUser.uid);
            
            // Disable button while processing
            activateButton.disabled = true;
            const originalButtonText = activateButton.innerHTML;
            activateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activating...';
            
            console.log('Importing Firestore modules...');
            // Import Firestore functions dynamically
            import("https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js")
                .then((firestore) => {
                    console.log('Firestore modules imported successfully');
                    const { getFirestore, doc, updateDoc } = firestore;
                    const db = getFirestore();
                    
                    // Calculate expiry date
                    const now = new Date();
                    const expiryDate = new Date(now);
                    expiryDate.setDate(now.getDate() + validCodes[code].duration);
                    
                    // Create subscription data
                    const subscriptionData = {
                        subscription: {
                            isActive: true,
                            activatedAt: now.toISOString(),
                            expiryDate: expiryDate.toISOString(),
                            duration: validCodes[code].duration,
                            code: code,
                            updatedAt: now.toISOString()
                        }
                    };
                    
                    console.log('Updating user document in Firestore...');
                    // Update user document in Firestore
                    updateDoc(doc(db, "users", auth.currentUser.uid), subscriptionData)
                        .then(() => {
                            console.log('Subscription activated successfully in Firestore');
                            
                            // Show success message
                            if (window.showToast) {
                                console.log('Showing success toast notification');
                                window.showToast('Premium subscription activated successfully!', 'success');
                            } else {
                                console.log('No toast function found, showing alert instead');
                                alert('Premium subscription activated successfully!');
                            }
                            
                            // Close modal if it exists
                            if (subscriptionModal) {
                                console.log('Closing subscription modal');
                                subscriptionModal.style.display = 'none';
                            }
                            
                            // Refresh the page to update UI
                            console.log('Will refresh page in 1.5 seconds');
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        })
                        .catch((error) => {
                            console.error('Error updating subscription in Firestore:', error);
                            errorElement.textContent = 'Error activating subscription. Please try again.';
                            errorElement.style.display = 'block';
                            
                            // Re-enable button
                            activateButton.disabled = false;
                            activateButton.innerHTML = originalButtonText;
                        });
                })
                .catch((error) => {
                    console.error('Error loading Firestore modules:', error);
                    errorElement.textContent = 'Error loading required components. Please try again.';
                    errorElement.style.display = 'block';
                    
                    // Re-enable button
                    activateButton.disabled = false;
                    activateButton.innerHTML = originalButtonText;
                });
        }
    }, 1000); // Wait 1 second for components to load
});

// Add a global check to verify script is loaded
console.log('subscription-modal-fix.js loaded and executed');
