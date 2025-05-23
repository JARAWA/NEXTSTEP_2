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
        this._isShowingModal = false; // Track when we're explicitly showing the modal
        this.subscriptionCodes = {
            // Pre-defined subscription codes
            // Production version would store and verify these securely on the server
            "NEXTSTEP2025": { valid: true, duration: 365 }, // 1 year
            "PREMIUM2MONTH": { valid: true, duration: 60 },  // 2 months
            "TRYNEXTSTEP": { valid: true, duration: 7 }      // 1 week trial
        };
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the subscription manager
     */
    init() {
        console.log('🔄 Subscription Manager initializing...');
        
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
        } else {
            console.warn('⚠️ Close subscription modal button not found');
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                console.log('🔄 Clicked outside modal');
                this.hideSubscriptionModal();
            }
        });
        
        // Activate subscription button
        const activateButton = document.getElementById('activate-subscription');
        if (activateButton) {
            activateButton.addEventListener('click', () => {
                this.verifySubscriptionCode();
            });
        } else {
            console.warn('⚠️ Activate subscription button not found');
        }
        
        // Listen for Enter key in subscription input
        const codeInput = document.getElementById('subscription-code');
        if (codeInput) {
            codeInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    this.verifySubscriptionCode();
                }
            });
        } else {
            console.warn('⚠️ Subscription code input not found');
        }
        
        // Update all premium-required buttons
        this.updatePremiumButtons();
        
        console.log('✅ Subscription event listeners setup complete');
    }
    
    /**
     * Update all buttons requiring premium access
     */
    updatePremiumButtons() {
        console.log('🔄 Updating premium buttons, isPremium:', this.isPremium);
        
        // Update button styling for all premium buttons regardless of coordinator
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
            return; // Skip the original handler setup
        }   
        
        // Find all buttons that require premium access
        document.querySelectorAll('[data-requires-premium="true"]').forEach(button => {
            // Update button styling
            button.classList.toggle('premium-active', this.isPremium);
            
            // Store the original click event if any
            const originalOnClick = button.onclick;
            
            // Replace with our premium check
            button.onclick = (event) => {
                event.preventDefault();
                console.log('🔘 Premium button clicked, current premium status:', this.isPremium);
                
                // First check if user is logged in
                if (!this.currentUser) {
                    console.log('👤 User not logged in, showing login modal');
                    if (window.Modal && typeof window.Modal.show === 'function') {
                        window.Modal.show();
                    } else {
                        alert('Please log in to continue.');
                    }
                    return;
                }
                
                // Then do a fresh check of premium status before proceeding
                this.checkPremiumStatus().then(isPremium => {
                    console.log('🔄 Fresh premium check in button handler:', isPremium);
                    
                    if (isPremium) {
                        console.log('✅ User has premium, proceeding with action');
                        // If premium, proceed with original action
                        if (originalOnClick) {
                            originalOnClick.call(button, event);
                        }
                        
                        // Handle href navigation if present
                        const targetUrl = button.getAttribute('href') || button.dataset.href;
                        if (targetUrl) {
                            console.log('🔄 Navigating to:', targetUrl);
                            if (button.getAttribute('target') === '_blank') {
                                window.open(targetUrl, '_blank');
                            } else {
                                window.location.href = targetUrl;
                            }
                        }
                    } else {
                        console.log('⚠️ User does not have premium, showing subscription modal');
                        // If not premium, show subscription modal
                        this.showSubscriptionModal();
                    }
                });
            };
        });
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
                    
                    // If subscription has expired, update the premium status in Firestore
                    if (!this.isPremium && userData.subscription.isActive) {
                        await this.updateSubscriptionStatus({
                            isActive: false,
                            expiryDate: userData.subscription.expiryDate
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
    async updateSubscriptionStatus(subscriptionData) {
        if (!this.currentUser) return false;
        
        try {
            console.log('🔄 Updating subscription status in Firestore');
            const userRef = doc(this.db, "users", this.currentUser.uid);
            
            await updateDoc(userRef, {
                subscription: {
                    ...subscriptionData,
                    updatedAt: new Date().toISOString()
                }
            });
            
            this.isPremium = subscriptionData.isActive;
            console.log('✅ Subscription status updated successfully');
            
            // Update UI
            this.updatePremiumUI();
            
            return true;
        } catch (error) {
            console.error("❌ Error updating subscription status:", error);
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
            console.log('👑 User already has active premium subscription');
            
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
        
        console.log('🔄 Verifying subscription code:', code);
        
        // Check if code is valid
        const subscriptionInfo = this.subscriptionCodes[code];
        
        if (!subscriptionInfo || !subscriptionInfo.valid) {
            console.log('❌ Invalid subscription code');
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
            
            console.log('🔄 Activating subscription with expiry:', expiryDate.toLocaleDateString());
            
            // Update subscription in Firestore
            const updated = await this.updateSubscriptionStatus({
                isActive: true,
                activatedAt: now.toISOString(),
                expiryDate: expiryDate.toISOString(),
                duration: subscriptionInfo.duration,
                code: code
            });
            
            if (updated) {
                console.log('✅ Premium subscription activated successfully!');
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
                console.log('❌ Error activating subscription');
                if (errorElement) {
                    errorElement.textContent = 'Error activating subscription. Please try again.';
                    errorElement.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("❌ Error verifying subscription code:", error);
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
        console.log('🔄 showSubscriptionModal called, checking premium status');
        
        try {
            // Track that we're explicitly showing the modal
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
                    
                    // Focus the input field
                    setTimeout(() => {
                        const codeInput = document.getElementById('subscription-code');
                        if (codeInput) codeInput.focus();
                    }, 300);
                } else {
                    console.error('❌ Subscription modal not found in DOM');
                }
            } else {
                console.log('👑 User already has premium, not showing modal');
                // User already has premium, show message instead
                if (window.showToast) {
                    window.showToast('You already have an active premium subscription!', 'info');
                } else {
                    alert('You already have an active premium subscription!');
                }
            }
        } catch (error) {
            console.error('❌ Error in showSubscriptionModal:', error);
        } finally {
            // Clear the flag after a delay
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
        } else {
            console.warn('⚠️ Cannot hide subscription modal - element not found');
        }
    }
    
    /**
     * Check if a feature requires premium and show modal if necessary
     * @param {Function} callback - Function to execute if premium access is confirmed
     * @returns {boolean} Whether the user has premium access
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
    
    /**
     * Check if modal is currently being explicitly shown
     * @returns {boolean} Whether modal is being shown explicitly
     */
    isExplicitlyShowingModal() {
        return this._isShowingModal;
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
        
        console.log('✅ Subscription Manager initialized and exposed globally');
    } else {
        console.log('⚠️ SubscriptionManager already exists, reusing instance');
    }
    
    return subscriptionManager;
}

// Export for module imports
export default subscriptionManager || new SubscriptionManager();

// Make initialization function available globally
window.initSubscriptionManager = initSubscriptionManager;
