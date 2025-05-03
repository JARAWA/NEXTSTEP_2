/**
 * subscription-fixer.js
 * 
 * A simplified version that only provides essential functionality
 * - Adds emergency close button to modal
 * - Provides debugging tools if needed
 */

// Self-executing function to avoid polluting global scope
(function() {
    console.log('Subscription fixer starting');
    
    // Wait for page to be ready
    function initWhenReady(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(callback, 1);
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    // Add emergency close button to subscription modal
    function addEmergencyCloseButton() {
        const modal = document.getElementById('subscriptionModal');
        if (!modal) return;
        
        // Check if button already exists
        if (document.getElementById('emergency-close-btn')) return;
        
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
            display: none;
        `;
        
        emergencyButton.onclick = function(event) {
            event.preventDefault();
            event.stopPropagation();
            console.log('Emergency close button clicked');
            
            // Force close the modal
            modal.style.display = 'none';
            
            return false;
        };
        
        modal.appendChild(emergencyButton);
        
        // Show emergency button in debug mode
        if (localStorage.getItem('nextStepDebugMode') === 'true') {
            emergencyButton.style.display = 'block';
        }
    }
    
    // Add a debug button for admins and developers
    function addDebugButton() {
        // Check if button already exists
        if (document.getElementById('subscription-debug-btn')) return;
        
        // Only add for admins or in debug mode
        const isDebugMode = localStorage.getItem('nextStepDebugMode') === 'true';
        const isAdmin = window.SubscriptionManager && 
            window.SubscriptionManager.currentUser && 
            window.SubscriptionManager.currentUser.email && 
            (window.SubscriptionManager.currentUser.email.includes('admin') || 
             window.SubscriptionManager.currentUser.email.includes('next'));
        
        if (!isDebugMode && !isAdmin) return;
        
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
            checkSubscriptionStatus();
        };
        
        document.body.appendChild(btn);
    }
    
    // Function to check subscription status
    function checkSubscriptionStatus() {
        if (!window.SubscriptionManager) {
            alert('SubscriptionManager not initialized!');
            return;
        }
        
        const isPremium = window.SubscriptionManager.isPremium;
        const modalElement = document.getElementById('subscriptionModal');
        const isModalVisible = modalElement && modalElement.style.display !== 'none';
        
        let message = 'Subscription Status\n\n';
        message += `Premium Status: ${isPremium ? 'ACTIVE ✓' : 'INACTIVE ✗'}\n`;
        message += `Modal Visible: ${isModalVisible ? 'YES' : 'NO'}\n`;
        
        if (window.SubscriptionManager.currentUser) {
            message += `User: ${window.SubscriptionManager.currentUser.email || window.SubscriptionManager.currentUser.uid}\n`;
        } else {
            message += 'User: Not logged in\n';
        }
        
        alert(message);
        
        // If modal is visible, offer to close it
        if (isModalVisible) {
            if (confirm('The subscription modal is currently visible. Would you like to close it?')) {
                if (modalElement) modalElement.style.display = 'none';
            }
        }
    }
    
    // Initialize everything
    function init() {
        // Add keyboard shortcut for debug (Ctrl+Shift+S)
        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey && event.shiftKey && event.key === 'S') {
                event.preventDefault();
                checkSubscriptionStatus();
            }
        });
        
        // Wait for SubscriptionManager to be available
        function waitForManager() {
            if (window.SubscriptionManager) {
                // Add emergency close button
                addEmergencyCloseButton();
                
                // Add debug button
                addDebugButton();
            } else {
                setTimeout(waitForManager, 500);
            }
        }
        
        waitForManager();
    }
    
    // Start initialization
    initWhenReady(init);
    
})();
