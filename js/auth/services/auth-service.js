/**
 * Core authentication service for Firebase auth operations
 * With premium subscription integration
 */
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut, 
    onAuthStateChanged,
    signInWithPopup,
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { 
    getFirestore,
    doc, 
    getDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { auth, googleProvider } from './firebase-config.js';
import { Validator, validateForm } from '../utils/validation.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { TokenManager } from '../services/token-manager.js';
import UserService from './user-service.js';

// Import the subscription manager if available
let SubscriptionManager = null;
try {
    import('/js/subscription-manager.js').then(module => {
        SubscriptionManager = module.default;
    }).catch(err => {
        console.log('Subscription manager not loaded:', err);
    });
} catch (e) {
    console.log('Error importing subscription manager:', e);
}

class AuthService {
    // Class properties
    static isLoggedIn = false;
    static user = null;
    static authUnsubscribe = null;
    static userProfileFetched = false;
    static userRole = 'student'; // Default role
    static isPremium = false; // Premium subscription status
    
    // Initialize Authentication Service
    static async init() {
        console.log('Initializing Authentication Service');
        
        try {
            this.setupAuthStateListener();
            this.setupAuthButtons();
            await this.checkExistingSession();
            
            console.log('Authentication Service initialized successfully');
        } catch (error) {
            console.error('Error during Authentication Service initialization:', error);
        }
    }
    
    // Check for existing session
    static async checkExistingSession() {
        const storedToken = TokenManager.getStoredToken();
        if (storedToken) {
            console.log("Found valid stored token");
            // Validate the token immediately
            try {
                if (TokenManager.validateToken(storedToken)) {
                    console.log("Stored token is valid");
                } else {
                    console.warn("Stored token is invalid or expired");
                    TokenManager.clearTokenData();
                }
            } catch (error) {
                console.error("Error validating stored token:", error);
                TokenManager.clearTokenData();
            }
        }
    }
    
    static setupAuthStateListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.user = user;
                this.isLoggedIn = true;
                
                try {
                    // First phase: Just handle basic authentication
                    console.log("Getting Firebase token for user:", user.uid);
                    const token = await TokenManager.getFirebaseToken(user);
                    
                    if (token) {
                        console.log("Received valid token from Firebase");
                        localStorage.setItem('authToken', token);
                        TokenManager.setupTokenRefresh(user);
                        
                        // Update UI with basic authenticated state
                        // This ensures users can access basic functionality immediately
                        this.updateBasicUI();
                        this.enableLoginRequiredFeatures();
                        
                        // Second phase: Fetch profile and set up role-specific UI asynchronously
                        // This prevents blocking the auth flow while fetching profile data
                        await this.getUserProfileAndSetupUI(user);
                        
                        // Check premium status after profile is loaded
                        await this.checkPremiumStatus(user);
                        
                        if (window.Modal && typeof window.Modal.hide === 'function') {
                        // Don't close modal if in the middle of enhanced signup
                        if (!window.EnhancedSignupService || 
                        !window.EnhancedSignupService.isSignupInProgress()) {
                        window.Modal.hide();
                        }
                        }
                        
                        if (window.showToast) {
                            window.showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
                        }
                    } else {
                        console.error('Failed to obtain valid token');
                    }
                } catch (error) {
                    console.error('Auth state update error:', error);
                    ErrorHandler.handleAuthError(error, 
                        () => TokenManager.refreshToken(this.user), 
                        () => this.logout()
                    );
                }
            } else {
                this.user = null;
                this.isLoggedIn = false;
                this.userRole = 'student'; // Reset to default
                this.isPremium = false; // Reset premium status
                TokenManager.clearTokenData();
                
                this.updateUI();
                this.disableLoginRequiredFeatures();
            }
        });
    }
    
    // Check premium status
    static async checkPremiumStatus(user) {
        if (!user) return false;
        
        try {
            const db = getFirestore();
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Check if user has subscription and if it's still valid
                if (userData.subscription) {
                    const now = new Date();
                    const expiryDate = new Date(userData.subscription.expiryDate);
                    
                    this.isPremium = expiryDate > now && userData.subscription.isActive;
                    console.log(`Premium status: ${this.isPremium ? 'Active' : 'Inactive'}, Expiry: ${expiryDate.toLocaleDateString()}`);
                } else {
                    this.isPremium = false;
                    console.log('No subscription found');
                }
            } else {
                this.isPremium = false;
                console.log('User document not found');
            }

            // If subscription manager exists, update its premium status
            if (window.SubscriptionManager) {
                window.SubscriptionManager.isPremium = this.isPremium;
            }
            
            return this.isPremium;
        } catch (error) {
            console.error("Error checking premium status:", error);
            this.isPremium = false;
            return false;
        }
    }
    
    // New method to handle profile fetching and UI setup separately
    static async getUserProfileAndSetupUI(user) {
        try {
            // Wait for token propagation
            console.log("Waiting for auth state to fully propagate...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log("Token valid before profile fetch:", !!TokenManager.getCurrentToken());
            const userData = await UserService.fetchUserProfile(user);
            
            if (userData) {
                console.log("User profile fetched successfully:", userData);
                if (userData.userRole) {
                    this.userRole = userData.userRole;
                    console.log("User role set to:", this.userRole);
                }
                
                // Now update UI with role-specific elements
                this.updateUI();
            } else {
                console.warn("No user profile data was returned");
                // Still update UI with default role
                this.updateUI();
            }
        } catch (profileError) {
            console.warn('Failed to fetch user profile, attempting retry with fresh token', profileError);
            
            // Try one more time with a fresh token
            try {
                const freshToken = await user.getIdToken(true); // Force token refresh
                localStorage.setItem('authToken', freshToken);
                console.log("Retrying profile fetch with fresh token");
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                const retryData = await UserService.fetchUserProfile(user);
                
                if (retryData && retryData.userRole) {
                    this.userRole = retryData.userRole;
                }
                
                // Update UI again with hopefully correct role data
                this.updateUI();
            } catch (retryError) {
                console.error("Profile fetch retry failed:", retryError);
                // Update UI with default role anyway
                this.updateUI();
            }
        }
    }
    
    // Basic UI update with minimal authentication info
    static updateBasicUI() {
        const loginRequiredButtons = document.querySelectorAll('[data-requires-login="true"]');
        const userInfoContainer = document.getElementById('user-info');
        
        loginRequiredButtons.forEach(btn => {
            btn.classList.toggle('active', this.isLoggedIn);
        });

        if (userInfoContainer) {
            userInfoContainer.innerHTML = this.isLoggedIn 
                ? `<div class="user-dropdown">
                    <button class="user-dropdown-toggle">
                        <i class="fas fa-user-circle"></i>
                        <span class="username">${this.user.displayName || this.user.email}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown-menu">
                        <a href="/profile.html" class="profile-link">
                            <i class="fas fa-user"></i> My Profile
                        </a>
                        <a href="#" class="logout-link" onclick="Auth.logout(); return false;">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </div>
                </div>`
                : `<button onclick="Modal.show()" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i> Login
                   </button>`;
                   
            // Add event listeners to dropdown elements if logged in
            if (this.isLoggedIn) {
                const toggleButton = userInfoContainer.querySelector('.user-dropdown-toggle');
                if (toggleButton) {
                    toggleButton.addEventListener('click', (event) => {
                        event.preventDefault();
                        const dropdownMenu = userInfoContainer.querySelector('.user-dropdown-menu');
                        if (dropdownMenu) {
                            dropdownMenu.classList.toggle('active');
                        }
                    });
                }
            }
        }
    }
    
    // Secure Redirect Handling
// In auth-service.js, modify the handleSecureRedirect method
static async handleSecureRedirect(targetUrl) {
    try {
        if (!this.isLoggedIn || !this.user) {
            throw new Error('User must be logged in');
        }

        // Get current token or refresh if needed
        let token = TokenManager.getCurrentToken();
        if (!TokenManager.validateToken(token)) {
            token = await TokenManager.refreshToken(this.user);
            if (!token) {
                throw new Error('Failed to generate valid authentication token');
            }
        }

        // Create a destination URL without query parameters
        const baseUrl = new URL(targetUrl);
        
        // Pack authentication data into a hash fragment
        const authData = {
            token: token,
            source: 'nextstepedu',
            uid: this.user.uid,
            premium: this.isPremium ? '1' : '0'
        };
        
        // Create URL with hash fragment
        const redirectUrl = baseUrl.origin + baseUrl.pathname + '#' + btoa(JSON.stringify(authData));
        
        console.log('Redirecting to:', redirectUrl.replace(token, 'TOKEN-REDACTED'));
        
        // Navigate to the target URL
        console.log('🚀🚀🚀 INITIATING REDIRECT TO', redirectUrl.replace(token, 'TOKEN-REDACTED'));
        window.location.href = redirectUrl;
    } catch (error) {
        console.error('Redirect error:', error);
        if (window.showToast) {
            window.showToast('Error accessing application. Please try again.', 'error');
        }
    }
}
    
    // Button Setup with premium check
    static setupAuthButtons() {
            // Add ButtonHandlerCoordinator registration
    if (window.ButtonHandlerCoordinator) {
        window.ButtonHandlerCoordinator.registerHandler('auth', async (button, event) => {
            if (!this.isLoggedIn) {
                if (window.Modal && typeof window.Modal.show === 'function') {
                    window.Modal.show();
                }
                return false;
            }
            return true;
        });
        console.log('Auth handler registered with ButtonHandlerCoordinator');
    }
        const loginRequiredButtons = document.querySelectorAll('[data-requires-login="true"]');
        
        loginRequiredButtons.forEach(btn => {
            const targetUrl = btn.getAttribute('href') || btn.dataset.href;
            const requiresPremium = btn.hasAttribute('data-requires-premium') ? 
                                   btn.getAttribute('data-requires-premium') === 'true' : 
                                   false;
            
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (!this.isLoggedIn) {
                    if (window.Modal && typeof window.Modal.show === 'function') {
                        window.Modal.show();
                    }
                    return;
                }

                // Check for premium requirement
                if (requiresPremium && !this.isPremium) {
                    if (window.SubscriptionManager) {
                        window.SubscriptionManager.showSubscriptionModal();
                    } else {
                        alert('Premium subscription required for this feature.');
                    }
                    return;
                }

                if (targetUrl) {
                    await this.handleSecureRedirect(targetUrl);
                }
            });
        });
        
        // Also handle premium-only buttons
        const premiumOnlyButtons = document.querySelectorAll('[data-requires-premium="true"]:not([data-requires-login="true"])');
        
        premiumOnlyButtons.forEach(btn => {
            // Only handle buttons that don't also require login (handled above)
            const targetUrl = btn.getAttribute('href') || btn.dataset.href;
            
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Check login first
                if (!this.isLoggedIn) {
                    if (window.Modal && typeof window.Modal.show === 'function') {
                        window.Modal.show();
                    }
                    return;
                }
                
                // Check premium
                if (!this.isPremium) {
                    if (window.SubscriptionManager) {
                        window.SubscriptionManager.showSubscriptionModal();
                    } else {
                        alert('Premium subscription required for this feature.');
                    }
                    return;
                }
                
                // Proceed if premium
                if (targetUrl) {
                    if (btn.getAttribute('target') === '_blank') {
                        window.open(targetUrl, '_blank');
                    } else {
                        await this.handleSecureRedirect(targetUrl);
                    }
                }
            });
        });
    }
    
    // Basic signup handler
    static async handleSignup(event) {
        event.preventDefault();

        const nameInput = document.getElementById('signupName');
        const emailInput = document.getElementById('signupEmail');
        const passwordInput = document.getElementById('signupPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const submitButton = event.target.querySelector('button[type="submit"]');

        const validationInputs = [
            {
                element: nameInput,
                value: nameInput.value.trim(),
                validator: Validator.name,
                errorField: 'signupNameError'
            },
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: Validator.email,
                errorField: 'signupEmailError'
            },
            {
                element: passwordInput,
                value: passwordInput.value,
                validator: Validator.password,
                errorField: 'signupPasswordError'
            }
        ];

        if (!validateForm(validationInputs)) return;

        if (passwordInput.value !== confirmPasswordInput.value) {
            ErrorHandler.displayError('confirmPasswordError', 'Passwords do not match');
            return;
        }

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                emailInput.value.trim(), 
                passwordInput.value
            );

            await updateProfile(userCredential.user, {
                displayName: nameInput.value.trim()
            });

            await sendEmailVerification(userCredential.user);

            if (window.showToast) {
                window.showToast('Account created! Please verify your email.', 'success');
            }

            event.target.reset();

           if (window.Modal && typeof window.Modal.hide === 'function') {
            // Don't close modal if in the middle of enhanced signup
            if (!window.EnhancedSignupService || 
            !window.EnhancedSignupService.isSignupInProgress()) {
            window.Modal.hide();
            }
        }

        } catch (error) {
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('signupPasswordError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
    
    // Login handler
    static async handleLogin(event) {
        event.preventDefault();

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const submitButton = event.target.querySelector('button[type="submit"]');

        const validationInputs = [
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: Validator.email,
                errorField: 'loginEmailError'
            }
        ];

        if (!validateForm(validationInputs)) return;

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging In...';

            // Check if account is rate-limited before attempting login
            const isRateLimited = localStorage.getItem(`rate_limited_${emailInput.value.trim()}`);
            if (isRateLimited) {
                const rateLimitExpiry = parseInt(isRateLimited);
                if (Date.now() < rateLimitExpiry) {
                    throw { 
                        code: 'auth/too-many-requests',
                        message: 'Too many login attempts. Please try again later or reset your password.'
                    };
                } else {
                    // Rate limit expired, clear it
                    localStorage.removeItem(`rate_limited_${emailInput.value.trim()}`);
                }
            }

            const userCredential = await signInWithEmailAndPassword(
                auth, 
                emailInput.value.trim(), 
                passwordInput.value
            );

         // Check if email is verified
            if (!userCredential.user.emailVerified) {
                // Only send verification if they haven't been sent one recently
                const lastSent = localStorage.getItem(`verification_sent_${emailInput.value.trim()}`);
                const now = Date.now();
                if (!lastSent || (now - parseInt(lastSent)) > 5 * 60 * 1000) { // 5 minutes cooldown
                    await sendEmailVerification(userCredential.user);
                    localStorage.setItem(`verification_sent_${emailInput.value.trim()}`, now.toString());
                }
                
                if (window.showToast) {
                    window.showToast('Please check your email to verify your account.', 'warning');
                }
                // Don't sign them out - let them use the app with limited functionality
                return;
            }

            // Get and store authentication token
            const token = await TokenManager.getFirebaseToken(userCredential.user);
            localStorage.setItem('authToken', token);
            console.log("Login successful, token stored");

            // Close modal if successful
            if (window.Modal && typeof window.Modal.hide === 'function') {
                window.Modal.hide();
            }

            if (window.showToast) {
                window.showToast('Login successful!', 'success');
            }

        } catch (error) {
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('loginPasswordError', errorMessage);
            
            // Handle rate limiting with local tracking
            if (error.code === 'auth/too-many-requests') {
                // Set a 30-minute rate limit
                const thirtyMinutesFromNow = Date.now() + (30 * 60 * 1000);
                localStorage.setItem(`rate_limited_${emailInput.value.trim()}`, thirtyMinutesFromNow.toString());
                ErrorHandler.offerPasswordReset();
            }
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }
    
    // Google login handler
    static async handleGoogleLogin() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await TokenManager.getFirebaseToken(result.user);
            localStorage.setItem('authToken', token);

            if (window.Modal && typeof window.Modal.hide === 'function') {
                window.Modal.hide();
            }

            if (window.showToast) {
                window.showToast('Login successful!', 'success');
            }
        } catch (error) {
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('googleLoginError', errorMessage);
        }
    }
    
    // Password reset handler
    static async handleForgotPassword(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('resetEmail');
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        const validationInputs = [
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: Validator.email,
                errorField: 'resetEmailError'
            }
        ];
        
        if (!validateForm(validationInputs)) return;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            await sendPasswordResetEmail(auth, emailInput.value.trim());
            
            // Clear any rate limiting for this email after password reset
            localStorage.removeItem(`rate_limited_${emailInput.value.trim()}`);
            
            if (window.showToast) {
                window.showToast('Password reset email sent!', 'success');
            }
            
            if (window.Modal && typeof window.Modal.toggleForms === 'function') {
                window.Modal.toggleForms('login');
            }
            
        } catch (error) {
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('resetEmailError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        }
    }
    
    // Logout handler
    static async logout() {
        try {
            await signOut(auth);
            TokenManager.clearTokenData();
            
            if (window.showToast) {
                window.showToast('Logged out successfully', 'info');
            }
        } catch (error) {
            console.error('Logout error:', error);
            if (window.showToast) {
                window.showToast('Error logging out', 'error');
            }
        }
    }
    
    // Full UI update with role-specific elements
    static updateUI() {
        const loginRequiredButtons = document.querySelectorAll('[data-requires-login="true"]');
        const userInfoContainer = document.getElementById('user-info');
        
        loginRequiredButtons.forEach(btn => {
            btn.classList.toggle('active', this.isLoggedIn);
        });

        if (userInfoContainer && this.isLoggedIn) {
            // Add premium badge if user has premium status
            const premiumBadge = this.isPremium ? 
                `<span class="premium-badge">
                    <i class="fas fa-crown"></i> Premium
                </span>` : '';
            
            // Add premium status in dropdown if premium
            const premiumStatus = this.isPremium ?
                `<div class="premium-status">
                    <i class="fas fa-crown"></i> Premium Active
                </div>` : '';
                
            userInfoContainer.innerHTML = `<div class="user-dropdown">
                <button class="user-dropdown-toggle">
                    <i class="fas fa-user-circle"></i>
                    <span class="username">${this.user.displayName || this.user.email}</span>
                    ${premiumBadge}
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-dropdown-menu">
                    ${premiumStatus}
                    ${this.getRoleSpecificMenuItems()}
                    <a href="#" class="logout-link" onclick="Auth.logout(); return false;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>`;
                   
            // Add event listeners to dropdown elements
            const toggleButton = userInfoContainer.querySelector('.user-dropdown-toggle');
            if (toggleButton) {
                toggleButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    const dropdownMenu = userInfoContainer.querySelector('.user-dropdown-menu');
                    if (dropdownMenu) {
                        dropdownMenu.classList.toggle('active');
                    }
                });
            }
        } else if (userInfoContainer) {
            userInfoContainer.innerHTML = `<button onclick="Modal.show()" class="login-btn">
                <i class="fas fa-sign-in-alt"></i> Login
               </button>`;
        }
        
        // Update premium-required buttons
        this.updatePremiumButtons();
    }

    // Update premium buttons based on subscription status
    static updatePremiumButtons() {
        document.querySelectorAll('[data-requires-premium="true"]').forEach(btn => {
            btn.classList.toggle('premium-active', this.isPremium);
        });
    }

    // Get role-specific menu items
    static getRoleSpecificMenuItems() {
        switch (this.userRole) {
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

    static enableLoginRequiredFeatures() {
        document.querySelectorAll('[data-requires-login="true"]').forEach(el => {
            el.disabled = false;
            el.classList.remove('disabled');
        });
    }

    static disableLoginRequiredFeatures() {
        document.querySelectorAll('[data-requires-login="true"]').forEach(el => {
            el.disabled = true;
            el.classList.add('disabled');
        });
        
        // Also disable premium features
        document.querySelectorAll('[data-requires-premium="true"]').forEach(el => {
            el.disabled = true;
            el.classList.add('disabled');
        });
    }
}

// Export AuthService as a named export
export { AuthService };

// You can also add a default export if you want
export default AuthService;
