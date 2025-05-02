/**
 * subscription-modal-fix.js
 * Add this script to your HTML to fix the subscription modal
 */

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure the subscription modal is loaded
    setTimeout(function() {
        const activateButton = document.getElementById('activate-subscription');
        const subscriptionCodeInput = document.getElementById('subscription-code');
        const errorElement = document.getElementById('subscription-code-error');
        
        if (!activateButton) {
            console.error('Activate Premium button not found');
            return;
        }
        
        if (!subscriptionCodeInput) {
            console.error('Subscription code input not found');
            return;
        }
        
        if (!errorElement) {
            console.error('Error message element not found');
            return;
        }
        
        // Make sure error element is properly styled
        errorElement.style.display = 'none';
        
        // Add event listener to the button
        activateButton.addEventListener('click', function() {
            console.log('Activate Premium button clicked');
            verifyAndActivateSubscription();
        });
        
        // Also add event listener for Enter key in the input field
        subscriptionCodeInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                console.log('Enter key pressed in subscription input');
                verifyAndActivateSubscription();
            }
        });
        
        console.log('Event listeners added to subscription modal elements');
        
        // Function to verify and activate subscription
        function verifyAndActivateSubscription() {
            const code = subscriptionCodeInput.value.trim();
            
            // Clear previous error
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            
            if (!code) {
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
                errorElement.textContent = 'Invalid subscription code. Please try again.';
                errorElement.style.display = 'block';
                return;
            }
            
            console.log('Valid subscription code entered:', code);
            
            // Get the current user
            const auth = window.firebaseAuth;
            if (!auth || !auth.currentUser) {
                errorElement.textContent = 'You must be logged in to activate a subscription';
                errorElement.style.display = 'block';
                return;
            }
            
            // Disable button while processing
            activateButton.disabled = true;
            const originalButtonText = activateButton.innerHTML;
            activateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activating...';
            
            // Import Firestore functions dynamically
            import("https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js")
                .then((firestore) => {
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
                    
                    // Update user document in Firestore
                    updateDoc(doc(db, "users", auth.currentUser.uid), subscriptionData)
                        .then(() => {
                            console.log('Subscription activated successfully');
                            
                            // Show success message
                            if (window.showToast) {
                                window.showToast('Premium subscription activated successfully!', 'success');
                            } else {
                                alert('Premium subscription activated successfully!');
                            }
                            
                            // Close modal if it exists
                            const modal = document.getElementById('subscriptionModal');
                            if (modal) {
                                modal.style.display = 'none';
                            }
                            
                            // Refresh the page to update UI
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        })
                        .catch((error) => {
                            console.error('Error updating subscription:', error);
                            errorElement.textContent = 'Error activating subscription. Please try again.';
                            errorElement.style.display = 'block';
                            
                            // Re-enable button
                            activateButton.disabled = false;
                            activateButton.innerHTML = originalButtonText;
                        });
                })
                .catch((error) => {
                    console.error('Error loading Firestore:', error);
                    errorElement.textContent = 'Error loading required components. Please try again.';
                    errorElement.style.display = 'block';
                    
                    // Re-enable button
                    activateButton.disabled = false;
                    activateButton.innerHTML = originalButtonText;
                });
        }
    }, 1000); // Wait 1 second for components to load
});
