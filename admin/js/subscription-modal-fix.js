/**
 * subscription-modal-fix.js
 * 
 * This fix prevents the subscription modal from appearing for users who already have
 * premium subscriptions. It should be included after subscription-manager.js and
 * before subscription-fixer.js (if used).
 */

// Self-executing function to avoid polluting global scope
(function() {
    console.log('💎 Premium modal fix starting');
    
    // Initialize when document is ready
    function initWhenReady(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(callback, 1);
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    // Wait for SubscriptionManager to be available
    function waitForSubscriptionManager(callback, attempts = 0) {
        if (attempts > 20) {
            console.error('Timed out waiting for SubscriptionManager');
            return;
        }
        
        if (window.SubscriptionManager) {
            callback();
        } else {
            setTimeout(() => waitForSubscriptionManager(callback, attempts + 1), 200);
        }
    }
    
    // Main fix function
    function applyModalFix() {
        console.log('Applying premium subscription modal fix');
        
        // Check if SubscriptionManager exists
        if (!window.SubscriptionManager) {
            console.error('SubscriptionManager not found, cannot apply fix');
            return;
        }
        
        // Store reference to original method
        const originalShowModal = window.SubscriptionManager.showSubscriptionModal;
        
        // Override the showSubscriptionModal method
        window.SubscriptionManager.showSubscriptionModal = function() {
            console.log('Enhanced showSubscriptionModal called');
            
            // First check if premium
            if (this.isPremium) {
                console.log('User already has premium, not showing modal');
                
                // Show notification instead
                if (window.showToast) {
                    window.showToast('You already have an active premium subscription!', 'info');
                } else {
                    alert('You already have an active premium subscription!');
                }
                
                return;
            }
            
            // Call original method if not premium
            if (typeof originalShowModal === 'function') {
                originalShowModal.apply(this, arguments);
            } else {
                // Fallback if original method not available
                const modal = document.getElementById('subscriptionModal');
                if (modal) {
                    modal.style.display = 'block';
                    
                    // Focus the input field
                    setTimeout(() => {
                        document.getElementById('subscription-code')?.focus();
                    }, 300);
                }
            }
        };
        
        // Also update any premium-requiring buttons
        if (typeof window.SubscriptionManager.updatePremiumButtons === 'function') {
            window.SubscriptionManager.updatePremiumButtons();
        }
        
        console.log('Premium subscription modal fix applied successfully');
    }
    
    // Initialize the fix
    initWhenReady(() => {
        waitForSubscriptionManager(applyModalFix);
    });
    
    // Also apply fix after window load
    window.addEventListener('load', function() {
        // Short delay to let other scripts finish
        setTimeout(() => {
            waitForSubscriptionManager(applyModalFix);
        }, 1000);
    });
    
    console.log('💎 Premium modal fix loaded');
})();
