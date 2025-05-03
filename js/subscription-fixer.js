/**
 * subscription-fixer.js
 * 
 * A comprehensive fix for NextStep subscription modal issues
 * This script combines all the necessary fixes into one file:
 * 1. Removes duplicate elements
 * 2. Fixes subscription activation process
 * 3. Adds debugging tools
 * 4. Ensures modal closes after activation
 * 5. Detects and resolves conflicts from different subscription implementations
 * 
 * Add this script to your HTML file just before the closing </body> tag:
 * <script src="js/subscription-fixer.js"></script>
 */

// Self-executing function to avoid polluting global scope
(function() {
    console.log('🔧 Subscription fixer starting');
    
    // =============== INITIALIZE ON DOCUMENT READY ===============
    function initWhenReady(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(callback, 1);
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }

    // ============= PART 1: FIX DUPLICATE ELEMENTS ==============
    function fixDuplicateElements() {
        console.log('Checking for duplicate modal elements...');
        
        // Elements to check for duplicates
        const elementsToCheck = [
            'subscriptionModal',
            'subscription-code',
            'subscription-code-error',
            'activate-subscription',
            'close-subscription-modal',
            'subscription-modal-container'
        ];
        
        let fixedCount = 0;
        
        // Remove duplicates (keep first, remove others)
        elementsToCheck.forEach(id => {
            const elements = document.querySelectorAll(`#${id}`);
            console.log(`Found ${elements.length} elements with id "${id}"`);
            
            if (elements.length > 1) {
                for (let i = 1; i < elements.length; i++) {
                    if (elements[i].parentNode) {
                        console.log(`Removing duplicate #${id} element`);
                        elements[i].parentNode.removeChild(elements[i]);
                        fixedCount++;
                    }
                }
            }
        });
        
        console.log(`Fixed ${fixedCount} duplicate elements`);
        return fixedCount;
    }

    // ============= PART 2: ENHANCE SUBSCRIPTION MANAGER ==============
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
    
    function enhanceSubscriptionManager() {
        console.log('Enhancing SubscriptionManager...');
        
        // Store references to original methods
        const originalVerifyMethod = window.SubscriptionManager.verifySubscriptionCode;
        const originalUpdateStatus = window.SubscriptionManager.updateSubscriptionStatus;
        const originalHideModal = window.SubscriptionManager.hideSubscriptionModal;
        const originalShowModal = window.SubscriptionManager.showSubscriptionModal;
        
        // Enhance verification method
        window.SubscriptionManager.verifySubscriptionCode = function() {
            console.log('Enhanced verifySubscriptionCode called');
            
            // Get error display element
            const errorElement = document.getElementById('subscription-code-error');
            const codeInput = document.getElementById('subscription-code');
            
            // Clear previous errors
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
                    window.location.reload();
                }, 2000);
                
                return;
            }
            
            // Check if code is empty
            if (codeInput && !codeInput.value.trim()) {
                if (errorElement) {
                    errorElement.textContent = 'Please enter a subscription code';
                    errorElement.style.display = 'block';
                }
                return;
            }
            
            // Log code for debugging
            if (codeInput) {
                console.log('Subscription code entered:', codeInput.value.trim());
            }
            
            // Call original method
            return originalVerifyMethod.apply(this, arguments);
        };
        
        // Enhance update status method
        window.SubscriptionManager.updateSubscriptionStatus = async function(subscriptionData) {
            console.log('Enhanced updateSubscriptionStatus called:', subscriptionData);
            
            try {
                // Call original method
                const result = await originalUpdateStatus.apply(this, arguments);
                console.log('Subscription update result:', result);
                
                // Handle successful activation
                if (result && subscriptionData && subscriptionData.isActive) {
                    console.log('Subscription activated successfully');
                    
                    // Show success message
                    if (window.showToast) {
                        window.showToast('Premium subscription activated successfully!', 'success');
                    } else {
                        alert('Premium subscription activated successfully!');
                    }
                    
                    // Close modal
                    this.hideSubscriptionModal();
                    
                    // Refresh page after delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
                
                return result;
            } catch (error) {
                console.error('Error in updateSubscriptionStatus:', error);
                
                // Show error to user
                const errorElement = document.getElementById('subscription-code-error');
                if (errorElement) {
                    errorElement.textContent = 'Error: ' + (error.message || 'Failed to activate subscription');
                    errorElement.style.display = 'block';
                } else {
                    alert('Error: ' + (error.message || 'Failed to activate subscription'));
                }
                
                return false;
            }
        };
        
        // Enhance modal hide method
        window.SubscriptionManager.hideSubscriptionModal = function() {
            console.log('Enhanced hideSubscriptionModal called');
            
            // Call original method
            if (typeof originalHideModal === 'function') {
                originalHideModal.apply(this, arguments);
            }
            
            // Extra steps to ensure modal is hidden
            const modal = document.getElementById('subscriptionModal');
            if (modal) {
                console.log('Forcing modal display to none');
                modal.style.display = 'none';
            }
        };
        
        // Enhance modal show method
        window.SubscriptionManager.showSubscriptionModal = function() {
            console.log('Enhanced showSubscriptionModal called, isPremium:', this.isPremium);
            
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
            
            // Call original method
            if (typeof originalShowModal === 'function') {
                originalShowModal.apply(this, arguments);
            } else {
                // Fallback if original method not available
                const modal = document.getElementById('subscriptionModal');
                if (modal) {
                    modal.style.display = 'block';
                }
            }
        };
        
        // Add emergency fix methods to global scope
        window.forceCloseSubscriptionModal = function() {
            console.log('Force closing subscription modal');
            const modal = document.getElementById('subscriptionModal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            if (window.SubscriptionManager && typeof window.SubscriptionManager.hideSubscriptionModal === 'function') {
                window.SubscriptionManager.hideSubscriptionModal();
            }
        };
        
        console.log('SubscriptionManager successfully enhanced');
    }
    
    // ============= PART 3: ADD EMERGENCY CLOSE BUTTON ==============
    function addEmergencyCloseButton() {
        console.log('Adding emergency close button to modal');
        
        const modal = document.getElementById('subscriptionModal');
        if (!modal) {
            console.warn('Modal not found, cannot add emergency close button');
            return;
        }
        
        // Check if button already exists
        if (document.getElementById('emergency-close-btn')) {
            return;
        }
        
        const emergencyButton = document.createElement('button');
        emergencyButton.id = 'emergency-close-btn';
        emergencyButton.textContent = 'Emergency Close';
        emergencyButton.style.cssText = `
            position: absolute;
            bottom: 10px;
            right: 10px;
            background-color: #e74c3c;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        
        emergencyButton.onclick = function(event) {
            event.preventDefault();
            event.stopPropagation();
            console.log('Emergency close button clicked');
            window.forceCloseSubscriptionModal();
            return false;
        };
        
        modal.appendChild(emergencyButton);
    }
    
    // ============= PART 4: IMPLEMENT CONFLICT DETECTION ==============
    function detectConflicts() {
        console.log('Running subscription conflict detection...');
        
        // Check for multiple event listeners by adding a test element
        const testDiv = document.createElement('div');
        testDiv.id = 'subscription-event-test';
        document.body.appendChild(testDiv);
        
        // Add a dummy click event to test counting
        let clickCount = 0;
        const clickTracker = function() {
            clickCount++;
        };
        
        // Add the same listener multiple times
        testDiv.addEventListener('click', clickTracker);
        testDiv.addEventListener('click', clickTracker);
        
        // Trigger the click
        testDiv.click();
        
        // Check if the counter was incremented once or twice
        const browserDeduplicates = clickCount === 1;
        console.log('This browser ' + (browserDeduplicates ? 'DOES' : 'DOES NOT') + ' deduplicate identical listeners');
        
        // Clean up
        document.body.removeChild(testDiv);
        
        // Now check for multiple click handlers on the subscription button
        const activateButton = document.getElementById('activate-subscription');
        if (activateButton) {
            // Add a non-interfering diagnostic click handler
            activateButton.addEventListener('click', function(e) {
                console.log('DIAGNOSTIC: Activate button click detected', {
                    defaultPrevented: e.defaultPrevented,
                    cancelBubble: e.cancelBubble,
                    target: e.target.id
                });
                
                // Don't interfere with normal operation
            }, true); // Using capture phase
        }
        
        // Check for conflicting global objects
        const potentialConflicts = [
            'SubscriptionManager',
            'Modal',
            'showToast',
            'initSubscriptionManager',
            'subscriptionManager'
        ];
        
        let conflictsFound = 0;
        potentialConflicts.forEach(name => {
            if (window[name]) {
                console.log(`Global variable '${name}' exists as type: ${typeof window[name]}`);
                
                // If it's an object, list properties
                if (typeof window[name] === 'object' && window[name] !== null) {
                    console.log(`Properties of ${name}:`, Object.keys(window[name]));
                }
            } else {
                console.log(`Global variable '${name}' does NOT exist`);
            }
        });
        
        // Check for inline onclick handler
        if (activateButton) {
            console.log('Activate button has inline onclick handler:', activateButton.onclick !== null);
            
            // If not using event deduplication, we need to reset handlers
            if (!browserDeduplicates) {
                console.log('Browser does not deduplicate events, resetting button handlers');
                resetButtonHandlers();
            }
        }
        
        // Set up global error handler to catch JS errors
        window.addEventListener('error', function(e) {
            console.error('GLOBAL JS ERROR DETECTED:', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });
        
        return conflictsFound;
    }
    
    // Reset button event handlers to avoid conflicts
    function resetButtonHandlers() {
        const activateButton = document.getElementById('activate-subscription');
        if (!activateButton) return;
        
        // Clone the button to remove all event listeners
        const newButton = activateButton.cloneNode(true);
        if (activateButton.parentNode) {
            activateButton.parentNode.replaceChild(newButton, activateButton);
        }
        
        // Add a consolidated click handler
        newButton.addEventListener('click', function(event) {
            event.preventDefault();
            console.log('Consolidated button click handler executing');
            
            if (window.SubscriptionManager && typeof window.SubscriptionManager.verifySubscriptionCode === 'function') {
                window.SubscriptionManager.verifySubscriptionCode();
            } else {
                console.error('SubscriptionManager not properly initialized');
                alert('Error: Subscription system not properly initialized. Please refresh the page and try again.');
            }
        });
        
        console.log('Button handlers reset successfully');
    }
    
    // ============= PART 5: ADD DEBUGGING TOOLS ==============
    function addDebugButton() {
        console.log('Adding subscription debug button');
        
        // Check if button already exists
        if (document.getElementById('subscription-debug-btn')) {
            return;
        }
        
        const btn = document.createElement('button');
        btn.id = 'subscription-debug-btn';
        btn.textContent = '🔧';
        btn.title = 'Subscription Debug';
        btn.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        `;
        
        btn.onclick = function() {
            checkAndShowStatus();
        };
        
        document.body.appendChild(btn);
    }
    
    // Function to check subscription status
    async function checkAndShowStatus() {
        console.log('Checking subscription status');
        
        // Create alert content
        let message = 'Subscription Status\n\n';
        
        // Get subscription manager
        const manager = window.SubscriptionManager;
        if (!manager) {
            alert('SubscriptionManager not found!');
            return;
        }
        
        // Add status info
        const isPremium = manager.isPremium;
        message += `Premium Status: ${isPremium ? 'ACTIVE ✓' : 'INACTIVE ✗'}\n`;
        
        // Check for current user
        if (manager.currentUser) {
            message += `User ID: ${manager.currentUser.uid}\n`;
            
            // Try to get subscription details
            try {
                const db = window.getFirestore();
                if (db) {
                    const docRef = window.doc(db, "users", manager.currentUser.uid);
                    const docSnap = await window.getDoc(docRef);
                    
                    if (docSnap.exists() && docSnap.data().subscription) {
                        const subscription = docSnap.data().subscription;
                        const expiry = new Date(subscription.expiryDate);
                        const now = new Date();
                        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                        
                        message += `\nSubscription Details:\n`;
                        message += `- Expiry: ${expiry.toLocaleDateString()}\n`;
                        message += `- Days Remaining: ${daysLeft}\n`;
                        message += `- Code: ${subscription.code || 'N/A'}\n`;
                    }
                }
            } catch (error) {
                console.error('Error getting subscription details:', error);
                message += `\nError getting subscription details: ${error.message}\n`;
            }
        }
        
        // Add modal status
        const modal = document.getElementById('subscriptionModal');
        if (modal) {
            message += `\nModal Status: ${modal.style.display === 'none' ? 'Hidden' : 'Visible'}\n`;
        } else {
            message += `\nModal Status: Not Found in DOM\n`;
        }
        
        // Add action buttons
        message += `\n`;
        message += isPremium ? 
            `You already have an active premium subscription!` : 
            `You don't have an active premium subscription.`;
        
        // Show the message
        alert(message);
        
        // If modal is visible, offer to close it
        if (modal && modal.style.display !== 'none') {
            if (confirm('The subscription modal is currently visible. Would you like to close it?')) {
                window.forceCloseSubscriptionModal();
            }
        }
    }
    
    // ============= PART 6: EVENT LISTENER MONITORING ==============
    function monitorButtonEvents() {
        const activateButton = document.getElementById('activate-subscription');
        if (!activateButton) return;
        
        // Add a diagnostic click detector at the beginning of the event flow
        activateButton.addEventListener('click', function(e) {
            console.log('SUBSCRIPTION MONITOR: Button click detected', {
                button: 'activate-subscription',
                timeStamp: e.timeStamp,
                defaultPrevented: e.defaultPrevented
            });
            
            // Check if a code is provided
            const codeInput = document.getElementById('subscription-code');
            if (codeInput) {
                console.log('SUBSCRIPTION MONITOR: Code input value:', codeInput.value || 'EMPTY');
            }
            
            // Add setTimeout to check later if modal closed
            setTimeout(() => {
                const modal = document.getElementById('subscriptionModal');
                if (modal) {
                    console.log('SUBSCRIPTION MONITOR: Modal state after click (500ms):', {
                        display: modal.style.display,
                        visible: modal.style.display !== 'none'
                    });
                }
            }, 500);
            
            // Add another check later
            setTimeout(() => {
                const modal = document.getElementById('subscriptionModal');
                if (modal) {
                    console.log('SUBSCRIPTION MONITOR: Modal state after click (3000ms):', {
                        display: modal.style.display,
                        visible: modal.style.display !== 'none'
                    });
                    
                    // If modal is still visible after 3 seconds, there might be an issue
                    if (modal.style.display !== 'none') {
                        console.warn('SUBSCRIPTION MONITOR: Modal still visible after 3 seconds, possible issue with close handler');
                    }
                }
            }, 3000);
        }, true); // Capture phase to ensure this runs first
        
        console.log('Button event monitoring installed');
    }

    // ============= PART 7: MAIN INIT FUNCTION ==============
    function initFixes() {
        console.log('Initializing subscription fixes');
        
        // Step 1: Fix duplicate elements
        fixDuplicateElements();
        
        // Step 2: Run conflict detection
        const conflicts = detectConflicts();
        console.log(`Conflict detection complete. ${conflicts} potential conflicts found.`);
        
        // Step 3: Wait for subscription manager to load
        waitForSubscriptionManager(() => {
            enhanceSubscriptionManager();
            
            // Monitor button events
            monitorButtonEvents();
            
            // Add emergency close button
            setTimeout(addEmergencyCloseButton, 500);
            
            // Add debug button (only visible to admins or in debug mode)
            // Check if user is admin or debug flag is set
            const isDebugMode = localStorage.getItem('nextStepDebugMode') === 'true';
            const isAdmin = window.SubscriptionManager.currentUser && 
                window.SubscriptionManager.currentUser.email && 
                (window.SubscriptionManager.currentUser.email.includes('admin') || 
                 window.SubscriptionManager.currentUser.email.includes('next'));
            
            if (isDebugMode || isAdmin) {
                addDebugButton();
            }
            
            // Add keyboard shortcut for debug (Ctrl+Shift+S)
            document.addEventListener('keydown', function(event) {
                if (event.ctrlKey && event.shiftKey && event.key === 'S') {
                    event.preventDefault();
                    checkAndShowStatus();
                }
            });
        });
        
        // Expose global emergency functions
        window.emergencyFixSubscription = function() {
            fixDuplicateElements();
            window.forceCloseSubscriptionModal();
            location.reload();
        };
        
        // Enable debug mode from console
        window.enableNextStepDebugMode = function() {
            localStorage.setItem('nextStepDebugMode', 'true');
            console.log('NextStep debug mode enabled. Refresh page to activate debug tools.');
        };
        
        // Disable debug mode from console
        window.disableNextStepDebugMode = function() {
            localStorage.removeItem('nextStepDebugMode');
            console.log('NextStep debug mode disabled. Refresh page to remove debug tools.');
        };
        
        console.log('Subscription fixes initialized');
    }
    
    // ============= EXECUTE FIXES ==============
    initWhenReady(initFixes);
    
    // Also run fix after window load to catch any late DOM changes
    window.addEventListener('load', function() {
        // Short delay to let other scripts finish
        setTimeout(fixDuplicateElements, 1000);
    });
    
    console.log('🔧 Subscription fixer loaded successfully');
})();
