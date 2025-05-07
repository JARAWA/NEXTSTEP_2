import Auth from './auth/index.js';
import Modal from './modal.js';
import UserService from './user-dropdown.js'; // This imports the UserService class

document.addEventListener('DOMContentLoaded', function() {
    // Load all components
    Promise.all([
        loadComponent('header-container', 'components/header.html'),
        loadComponent('nav-container', 'components/nav.html'),
        loadComponent('footer-container', 'components/footer.html'),
        loadComponent('modal-container', 'components/modal.html')
    ]).then(() => {
        // Ensure Modal and Auth are properly initialized first
        console.log('Initializing Modal and Auth');
        
        if (typeof Modal.init === 'function') {
            Modal.init();
        } else {
            console.error('Modal.init is not a function');
        }

        // Initialize the enhanced auth service
        let authInitPromise;
        
        if (typeof Auth.initExtended === 'function') {
            authInitPromise = Auth.initExtended(); // Use the enhanced version with additional user data collection
        } else if (typeof Auth.init === 'function') {
            authInitPromise = Auth.init(); // Fallback to standard initialization
            console.warn('Enhanced auth features not available');
        } else {
            console.error('Auth.init is not a function');
            authInitPromise = Promise.resolve(); // Empty promise to allow chain to continue
        }
        
        // Continue initialization flow after auth init attempt
        authInitPromise.then(() => {
            // Add a small delay to ensure DOM is fully updated
            setTimeout(() => {
                if (document.getElementById('user-info')) {
                    // We don't need to initialize dropdown here - Auth will handle it
                    console.log('Auth initialized successfully');
                    
                    // Now that auth is initialized, load subscription modal
                    loadComponent('subscription-modal-container', 'components/subscription-modal.html')
                        .then(() => {
                            console.log('Subscription modal loaded successfully');
                            
                            // Initialize subscription manager after loading the modal and auth is ready
                            if (typeof window.initSubscriptionManager === 'function') {
                                console.log('Initializing subscription manager after auth and modal ready');
                                window.initSubscriptionManager();
                            } else {
                                console.log('Subscription manager initialization function not found, loading dynamically');
                                
                                // Load the subscription manager script dynamically
                                const script = document.createElement('script');
                                script.type = 'module';
                                script.src = 'js/subscription-manager.js';
                                document.head.appendChild(script);
                                
                                // Wait for script to load and initialize
                                script.onload = function() {
                                    if (typeof window.initSubscriptionManager === 'function') {
                                        console.log('Dynamically loaded subscription manager initialized');
                                        window.initSubscriptionManager();
                                    }
                                };
                            }
                            
                            // Update premium status after all initialization
                            setTimeout(updatePremiumStatus, 500);
                        })
                        .catch(err => {
                            console.error('Error loading subscription modal:', err);
                        });
                } else {
                    console.error('User info container still not found after loading components');
                }
            }, 300);
        }).catch(error => {
            console.error('Error initializing auth:', error);
        });
    }).catch(error => {
        console.error('Error loading components:', error);
    });
    
    // Add premium UI indicator to the user dropdown
    function updatePremiumStatus(forcePremium) {
        const isPremium = forcePremium !== undefined ? 
            forcePremium : 
            (Auth && Auth.isLoggedIn && Auth.isPremium);
        
        console.log('Updating premium UI status, isPremium:', isPremium);
        
        if (isPremium) {
            // Find user dropdown and add premium indicator
            const userDropdown = document.querySelector('.user-dropdown');
            if (userDropdown) {
                // Check if premium badge already exists
                if (!userDropdown.querySelector('.premium-badge')) {
                    const usernameElement = userDropdown.querySelector('.username');
                    if (usernameElement) {
                        // Add premium badge
                        const premiumBadge = document.createElement('span');
                        premiumBadge.className = 'premium-badge';
                        premiumBadge.innerHTML = '<i class="fas fa-crown"></i> Premium';
                        usernameElement.parentNode.insertBefore(premiumBadge, usernameElement.nextSibling);
                        
                        // Add premium status to dropdown menu
                        const dropdownMenu = userDropdown.querySelector('.user-dropdown-menu');
                        if (dropdownMenu) {
                            const premiumStatus = document.createElement('div');
                            premiumStatus.className = 'premium-status';
                            premiumStatus.innerHTML = '<i class="fas fa-crown"></i> Premium Active';
                            dropdownMenu.insertBefore(premiumStatus, dropdownMenu.firstChild);
                        }
                    }
                }
            }
        }
    }
    
    // Extend updatePremiumStatus to work with SubscriptionManager
    window.updatePremiumStatus = function(isPremium) {
        // If called directly from SubscriptionManager with a boolean
        if (typeof isPremium === 'boolean') {
            updatePremiumStatus(isPremium);
        } else {
            // Called without args - use Auth service
            updatePremiumStatus();
        }
    };
});

// Function to initialize user dropdown using UserService - used for manual refresh
function initializeUserDropdown() {
    // Get current user from Auth
    const currentUser = Auth.user; // Using Auth.user getter property
    
    if (currentUser) {
        // Use UserService to get user data
        UserService.getUserData(currentUser)
            .then(userData => {
                if (userData) {
                    updateUserInfoUI(userData);
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
            });
    }
}

// Function to update the UI with user data - used for manual refresh
function updateUserInfoUI(userData) {
    const userInfoElement = document.getElementById('user-info');
    if (!userInfoElement) return;
    
    // Check if user has premium
    const isPremium = !!(userData.subscription && 
                        userData.subscription.isActive && 
                        new Date(userData.subscription.expiryDate) > new Date());
    
    // Create premium badge if user has premium
    const premiumBadge = isPremium ? 
        `<span class="premium-badge">
            <i class="fas fa-crown"></i> Premium
        </span>` : '';
        
    // Create premium status in dropdown if premium
    const premiumStatus = isPremium ?
        `<div class="premium-status">
            <i class="fas fa-crown"></i> Premium Active
        </div>` : '';
    
    // Create user dropdown UI
    userInfoElement.innerHTML = `
        <div class="user-dropdown">
            <button class="user-dropdown-toggle">
                <i class="fas fa-user-circle"></i>
                <span class="username">${userData.displayName || userData.name || userData.email}</span>
                ${premiumBadge}
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="user-dropdown-menu">
                ${premiumStatus}
                ${getRoleSpecificMenuItems(userData.userRole)}
                <a href="#" class="logout-link" onclick="Auth.logout(); return false;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        </div>
    `;
    
    // Add event listener to toggle dropdown
    const toggleButton = userInfoElement.querySelector('.user-dropdown-toggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            const dropdownMenu = userInfoElement.querySelector('.user-dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.classList.toggle('active');
            }
        });
    }
    
    // Close the dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!userInfoElement.contains(event.target)) {
            const dropdownMenu = userInfoElement.querySelector('.user-dropdown-menu');
            if (dropdownMenu && dropdownMenu.classList.contains('active')) {
                dropdownMenu.classList.remove('active');
            }
        }
    });
}

// Get role-specific menu items - mirrors Auth service functionality
function getRoleSpecificMenuItems(userRole) {
    switch (userRole) {
        case 'admin':
            return `
                <a href="/admin/dashboard.html" class="dashboard-link">
                    <i class="fas fa-tachometer-alt"></i> Admin Dashboard
                </a>
                <a href="/admin/users.html" class="users-link">
                    <i class="fas fa-users"></i> Manage Users
                </a>`;
        case 'teacher':
            return `
                <a href="/teacher/dashboard.html" class="dashboard-link">
                    <i class="fas fa-chalkboard-teacher"></i> Teacher Dashboard
                </a>
                <a href="/teacher/classes.html" class="classes-link">
                    <i class="fas fa-book"></i> My Classes
                </a>`;
        default: // student or any other role
            return `
                <a href="/profile.html" class="profile-link">
                    <i class="fas fa-user"></i> My Profile
                </a>
                <a href="/courses.html" class="courses-link">
                    <i class="fas fa-graduation-cap"></i> My Courses
                </a>`;
    }
}

// Function to load components with support for subscription modal
async function loadComponent(containerId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const data = await response.text();
        const container = document.getElementById(containerId);
        
        if (container) {
            container.innerHTML = data;
        } else if (containerId === 'subscription-modal-container') {
            // If container doesn't exist, create it for the subscription modal
            const modalContainer = document.createElement('div');
            modalContainer.id = containerId;
            document.body.appendChild(modalContainer);
            modalContainer.innerHTML = data;
        } else {
            console.error(`Container not found: ${containerId}`);
            throw new Error(`Container not found: ${containerId}`);
        }
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
        throw error;
    }
}

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }, 100);
}

// Manual refresh function that can be called when needed
function refreshUserUI() {
    if (Auth.user) {
        initializeUserDropdown();
    }
}

// Expose functions globally
window.showToast = showToast;
window.refreshUserUI = refreshUserUI;
