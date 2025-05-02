/**
 * subscription-conflict-detector.js
 * This script detects conflicts between different subscription modules
 * Add this script at the end of your body tag
 */

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Subscription conflict detector starting...');
    
    // Check for multiple event listeners by adding a temporary probe
    setTimeout(function() {
        // Create a test element to check if multiple event listeners are being attached
        const testDiv = document.createElement('div');
        testDiv.id = 'subscription-event-test';
        document.body.appendChild(testDiv);
        
        // Add a dummy click event to test counting
        let clickCount = 0;
        const clickTracker = function() {
            clickCount++;
            console.log('Click tracked:', clickCount);
        };
        
        // Add the same listener multiple times to test if deduplication is working
        testDiv.addEventListener('click', clickTracker);
        testDiv.addEventListener('click', clickTracker);
        
        // Trigger the click
        console.log('Testing event listener behavior...');
        testDiv.click();
        
        // Check if the counter was incremented once or twice
        console.log('Final click count:', clickCount);
        console.log('This browser ' + (clickCount === 1 ? 'DOES' : 'DOES NOT') + ' deduplicate identical listeners');
        
        // Clean up
        document.body.removeChild(testDiv);
        
        // Now check the actual button
        const activateButton = document.getElementById('activate-subscription');
        if (activateButton) {
            console.log('Attaching diagnostic click tracker to activate button');
            
            // Add a non-interfering click detector
            activateButton.addEventListener('click', function(e) {
                console.log('DIAGNOSTIC: Activate button click detected');
                console.log('Event details:', {
                    defaultPrevented: e.defaultPrevented,
                    cancelBubble: e.cancelBubble,
                    target: e.target.id,
                    currentTarget: e.currentTarget.id
                });
                
                // Don't prevent default or stop propagation - just observe
            }, true); // Using capture phase to ensure this runs first
        }
        
        // Check for any JavaScript errors
        console.log('Setting up global error handler');
        window.addEventListener('error', function(e) {
            console.error('GLOBAL ERROR DETECTED:', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });
        
        // Check if SubscriptionManager methods are being properly called
        if (window.SubscriptionManager) {
            const originalVerifyMethod = window.SubscriptionManager.verifySubscriptionCode;
            if (typeof originalVerifyMethod === 'function') {
                console.log('Patching SubscriptionManager.verifySubscriptionCode to detect calls');
                window.SubscriptionManager.verifySubscriptionCode = function() {
                    console.log('SubscriptionManager.verifySubscriptionCode was called!');
                    return originalVerifyMethod.apply(window.SubscriptionManager, arguments);
                };
            } else {
                console.warn('SubscriptionManager exists but verifySubscriptionCode method not found');
            }
        }
        
        // Check if there are any name conflicts in the global space
        console.log('Checking for potential name conflicts...');
        const potentialConflicts = [
            'SubscriptionManager',
            'Modal',
            'showToast',
            'initSubscriptionManager',
            'subscriptionManager'
        ];
        
        potentialConflicts.forEach(name => {
            if (window[name]) {
                console.log(`Global variable '${name}' exists:`, typeof window[name]);
                
                // If it's an object with properties, list them
                if (typeof window[name] === 'object' && window[name] !== null) {
                    console.log(`Properties of ${name}:`, Object.keys(window[name]));
                }
            } else {
                console.log(`Global variable '${name}' does NOT exist`);
            }
        });
        
        // Final check for the button's event listeners
        if (activateButton) {
            console.log('Activate button ready for clicks, checking for inline onclick...');
            console.log('Has inline onclick handler:', activateButton.onclick !== null);
            
            // Add a super-strong click handler as a last resort
            setTimeout(() => {
                activateButton.onclick = function(event) {
                    console.log('LAST RESORT onclick handler triggered');
                    
                    // Check if the subscription code input exists
                    const codeInput = document.getElementById('subscription-code');
                    if (!codeInput) {
                        console.error('Subscription code input not found!');
                        return;
                    }
                    
                    const code = codeInput.value.trim();
                    console.log('Subscription code:', code || 'EMPTY');
                    
                    if (!code) {
                        alert('Please enter a subscription code');
                        return;
                    }
                    
                    alert('Attempting to activate subscription for code: ' + code);
                    
                    // Try to call the manager method if it exists
                    if (window.SubscriptionManager && typeof window.SubscriptionManager.verifySubscriptionCode === 'function') {
                        console.log('Calling SubscriptionManager.verifySubscriptionCode() directly');
                        window.SubscriptionManager.verifySubscriptionCode();
                    } else {
                        console.error('SubscriptionManager.verifySubscriptionCode is not available');
                        alert('Error: Subscription manager not properly initialized. Please try refreshing the page.');
                    }
                };
                console.log('Last resort handler added');
            }, 3000);
        }
    }, 2000); // Wait 2 seconds for all components to load
});

console.log('Subscription conflict detector script loaded');
