/**
 * subscription-manager.js
 * 
 * Standalone script to handle premium subscription functionality
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
        this.subscriptionCodes = {
            // Pre-defined subscription codes
            // Production version would store and verify these securely on the server
            "NEXTSTEP2025": { valid: true, duration: 365 }, // 1 year
            "PREMIUM3MONTH": { valid: true, duration: 90 },  // 3 months
            "TRYNEXTSTEP": { valid: true, duration: 7 }      // 1 week trial
        };
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the subscription manager
     */
    init() {
        this.setupAuthListener();
        this.setupEventListeners();
        console.log('Subscription Manager initialized');
    }
    
    /**
     * Set up Firebase auth state listener
     */
    setupAuthListener() {
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                this.currentUser = user;
                await this.checkPremiumStatus();
            } else {
                this.currentUser = null;
                this.isPremium = false;
            }
            // Update UI after auth state changes
            this.updatePremiumUI();
        });
    }
    
    /**
     * Set up event listeners for subscription modal
     */
    setupEventListeners() {
        // Close modal when clicking the X
        const closeButton = document.getElementById('close-subscription-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideSubscriptionModal();
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('subscriptionModal');
            if (event.target === modal) {
                this.hideSubscriptionModal();
            }
        });
        
        // Activate subscription button
        const activateButton = document.getElementById('activate-subscription');
        if (activateButton) {
            activateButton.addEventListener('click', () => {
                this.verifySubscriptionCode();
            });
        }
        
        // Listen for Enter key in subscription input
        const codeInput = document.getElementById('subscription-code');
        if (codeInput) {
            codeInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    this.verifySubscriptionCode();
                }
            });
        }
        
        // Update all premium-required buttons
        this.updatePremiumButtons();
    }
    
    /**
     * Update all buttons requiring premium access
     */
    updatePremiumButtons() {
        // Find all buttons that require premium access
        document.querySelectorAll('[data-requires-premium="true"]').forEach(button => {
            // Store the original click event if any
            const originalOnClick = button.onclick;
            
            // Replace with our premium check
            button.onclick = (event) => {
                event.preventDefault();
                
                // First check if user is logged in
                if (!this.currentUser) {
                    if (window.Modal && typeof window.Modal.show === 'function') {
                        window.Modal.show();
                    } else {
                        alert('Please log in to continue.');
                    }
                    return;
                }
                
                // Then check premium status
                if (this.isPremium) {
                    // If premium, proceed with original action
                    if (originalOnClick) {
                        originalOnClick.call(button, event);
                    }
                    
                    // Handle href navigation if present
                    const targetUrl = button.getAttribute('href') || button.dataset.href;
                    if (targetUrl) {
                        if (button.getAttribute('target') === '_blank') {
                            window.open(targetUrl, '_blank');
                        } else {
                            window.location.href = targetUrl;
                        }
                    }
                } else {
                    // If not premium, show subscription modal
                    this.showSubscriptionModal();
                }
            };
        });
    }
    
    /**
     * Check if the current user has premium access
     */
    async checkPremiumStatus() {
        if (!this.currentUser) {
            this.isPremium = false;
            return false;
        }
        
        try {
            // Get user document from Firestore
            const userDoc = await getDoc(doc(this.db, "users", this.currentUser.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Check if user has subscription and if it's still valid
                if (userData.subscription) {
                    const now = new Date();
                    const expiryDate = new Date(userData.subscription.expiryDate);
                    
                    this.isPremium = expiryDate > now && userData.subscription.isActive;
                    console.log(`Premium status: ${this.isPremium ? 'Active' : 'Inactive'}, Expiry: ${expiryDate.toLocaleDateString()}`);
                    
                    // If subscription has expired, update the premium status in Firestore
                    if (!this.isPremium && userData.subscription.isActive) {
                        await this.updateSubscriptionStatus({
                            isActive: false,
                            expiryDate: userData.subscription.expiryDate
                        });
                    }
                } else {
                    this.isPremium = false;
                }
            } else {
                this.isPremium = false;
            }
            
            // Update UI to reflect premium status
            this.updatePremiumUI();
            
            return this.isPremium;
        } catch (error) {
            console.error("Error checking premium status:", error);
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
    async updateSubscriptionStatus(subscriptionData) {
        if (!this.currentUser) return false;
        
        try {
            const userRef = doc(this.db, "users", this.currentUser.uid);
            
            await updateDoc(userRef, {
                subscription: {
                    ...subscriptionData,
                    updatedAt: new Date().toISOString()
                }
            });
            
            this.isPremium = subscriptionData.isActive;
            
            // Update UI
            this.updatePremiumUI();
            
            return true;
        } catch (error) {
            console.error("Error updating subscription status:", error);
            return false;
        }
    }
    
    /**
     * Verify subscription code and activate premium if valid
     */
    async verifySubscriptionCode() {
        const codeInput = document.getElementById('subscription-code');
        const errorElement = document.getElementById('subscription-code-error');
        
        // Clear previous error
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        
        // First check if user already has premium
        if (this.isPremium) {
            console.log('User already has active premium subscription');
            
            if (errorElement) {
                errorElement.textContent = 'You already have an active premium subscription!';
                errorElement.style.display = 'block';
                errorElement.style.color = '#3498db'; // Blue for information
            } else {
                alert('You already have an active premium subscription!');
            }
            
            // Close modal after delay
            setTimeout(() => {
                this.hideSubscriptionModal();
            }, 2000);
            
            return;
        }
        
        if (!codeInput) return;
        const code = codeInput.value.trim();
        
        if (!code) {
            if (errorElement) {
                errorElement.textContent = 'Please enter a subscription code';
                errorElement.style.display = 'block';
            }
            return;
        }
        
        // Check if code is valid
        const subscriptionInfo = this.subscriptionCodes[code];
        
        if (!subscriptionInfo || !subscriptionInfo.valid) {
            if (errorElement) {
                errorElement.textContent = 'Invalid subscription code. Please try again.';
                errorElement.style.display = 'block';
            }
            return;
        }
        
        try {
            // Calculate expiry date
            const now = new Date();
            const expiryDate = new Date(now);
            expiryDate.setDate(now.getDate() + subscriptionInfo.duration);
            
            // Update subscription in Firestore
            const updated = await this.updateSubscriptionStatus({
                isActive: true,
                activatedAt: now.toISOString(),
                expiryDate: expiryDate.toISOString(),
                duration: subscriptionInfo.duration,
                code: code
            });
            
            if (updated) {
                // Show success message and hide modal
                if (window.showToast) {
                    window.showToast('Premium subscription activated successfully!', 'success');
                } else {
                    alert('Premium subscription activated successfully!');
                }
                
                this.hideSubscriptionModal();
                
                // Refresh the page to reflect premium status
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                if (errorElement) {
                    errorElement.textContent = 'Error activating subscription. Please try again.';
                    errorElement.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Error verifying subscription code:", error);
            if (errorElement) {
                errorElement.textContent = 'Server error. Please try again later.';
                errorElement.style.display = 'block';
            }
        }
    }
    
    /**
     * Show subscription modal - FIXED to properly check premium status first
     */
    async showSubscriptionModal() {
        console.log('showSubscriptionModal called, checking premium status');
        
        // Always do a fresh check of premium status before showing modal
        const isPremium = await this.checkPremiumStatus();
        console.log('Fresh premium check result:', isPremium);
        
        // Only show modal if user is NOT premium
        if (!isPremium) {
            const modal = document.getElementById('subscriptionModal');
            if (modal) {
                modal.style.display = 'block';
                
                // Focus the input field
                setTimeout(() => {
                    const codeInput = document.getElementById('subscription-code');
                    if (codeInput) codeInput.focus();
                }, 300);
            }
        } else {
            // User already has premium, show message instead
            if (window.showToast) {
                window.showToast('You already have an active premium subscription!', 'info');
            } else {
                alert('You already have an active premium subscription!');
            }
        }
    }
    
    /**
     * Hide subscription modal
     */
    hideSubscriptionModal() {
        const modal = document.getElementById('subscriptionModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Check if a feature requires premium and show modal if necessary
     * @param {Function} callback - Function to execute if premium access is confirmed
     * @returns {boolean} Whether the user has premium access
     */
    checkPremiumAccess(callback) {
        if (this.isPremium) {
            if (typeof callback === 'function') {
                callback();
            }
            return true;
        } else {
            this.showSubscriptionModal();
            return false;
        }
    }
}

// Initialize subscription manager
let subscriptionManager = null;

// Initialize function to be called after DOM is loaded
function initSubscriptionManager() {
    if (!subscriptionManager) {
        subscriptionManager = new SubscriptionManager();
        
        // Expose to global scope for access from other scripts
        window.SubscriptionManager = subscriptionManager;
        
        console.log('Subscription Manager initialized and exposed globally');
    }
    
    return subscriptionManager;
}

// Export for module imports
export default subscriptionManager || new SubscriptionManager();

// Make initialization function available globally
window.initSubscriptionManager = initSubscriptionManager;

// Auto-initialize if document is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initSubscriptionManager, 1000);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initSubscriptionManager, 1000);
    });
}
