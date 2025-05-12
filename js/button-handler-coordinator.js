// Add this as js/button-handler-coordinator.js

class ButtonHandlerCoordinator {
    static handlers = new Map();
    
    static init() {
        // Find all buttons that need special handling
        document.querySelectorAll('[data-requires-login="true"], [data-requires-premium="true"]').forEach(button => {
            // Remove existing onclick handler to prevent conflicts
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add our unified handler
            newButton.addEventListener('click', async (event) => {
                event.preventDefault();
                console.log('Coordinated button handler processing click');
                
                // Process authentication check first
                if (newButton.hasAttribute('data-requires-login') && 
                    newButton.getAttribute('data-requires-login') === 'true') {
                    
                    const authHandler = this.handlers.get('auth');
                    if (authHandler) {
                        const authPassed = await authHandler(newButton, event);
                        if (!authPassed) {
                            console.log('Auth check failed, stopping event processing');
                            return;
                        }
                    }
                }
                
                // Then process premium check
                if (newButton.hasAttribute('data-requires-premium') && 
                    newButton.getAttribute('data-requires-premium') === 'true') {
                    
                    const premiumHandler = this.handlers.get('premium');
                    if (premiumHandler) {
                        const premiumPassed = await premiumHandler(newButton, event);
                        if (!premiumPassed) {
                            console.log('Premium check failed, stopping event processing');
                            return;
                        }
                    }
                }
                
                // If we get here, all checks passed - perform the button's action
                this.performButtonAction(newButton, event);
            });
        });
        
        console.log('Button handler coordinator initialized');
    }
    
    static registerHandler(type, handler) {
        this.handlers.set(type, handler);
        console.log(`Registered ${type} handler`);
    }
    
    static performButtonAction(button, event) {
        const targetUrl = button.getAttribute('href') || button.dataset.href;
        
        if (!targetUrl) {
            console.log('No target URL found for button');
            return;
        }
        
        console.log('All checks passed, navigating to:', targetUrl);
        
        // Use secure redirect if available
        if (window.Auth && typeof window.Auth.handleSecureRedirect === 'function') {
            window.Auth.handleSecureRedirect(targetUrl);
        } else {
            // Standard navigation
            if (button.getAttribute('target') === '_blank') {
                window.open(targetUrl, '_blank');
            } else {
                window.location.href = targetUrl;
            }
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ButtonHandlerCoordinator.init();
    
    // Make globally available
    window.ButtonHandlerCoordinator = ButtonHandlerCoordinator;
});

export default ButtonHandlerCoordinator;
