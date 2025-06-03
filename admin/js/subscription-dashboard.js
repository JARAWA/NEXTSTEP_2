// Import Firebase modules
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs,
    setDoc,
    updateDoc,
    query, 
    where, 
    orderBy, 
    limit,
    Timestamp,
    startAfter,
    endBefore,
    limitToLast
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Subscription Dashboard Controller
class SubscriptionDashboard {
    constructor() {
        this.auth = getAuth();
        this.db = getFirestore();
        this.currentUser = null;
        this.currentAdminData = null;
        
        // Subscription data state
        this.subscriptions = [];
        this.filteredSubscriptions = [];
        this.totalSubscriptions = 0;
        this.currentPage = 1;
        this.pageSize = 10;
        this.lastVisible = null;
        this.firstVisible = null;
        this.selectedSubscriptionIds = new Set();
        
        // Filter state
        this.filters = {
            status: 'all',
            duration: 'all',
            dateFrom: null,
            dateTo: null,
            searchTerm: ''
        };
        
        // Sort state
        this.sortField = 'expiryDate';
        this.sortDirection = 'asc';
        
        // Stats
        this.stats = {
            activeSubscriptions: 0,
            expiredSubscriptions: 0,
            monthlyRenewals: 0,
            monthlyRevenue: 0
        };
        
        // Charts
        this.charts = {};
        
        // Initialize
        this.setupEventListeners();
        this.initializeSubscriptionDashboard();
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Logout button - updated ID to match new structure
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Search input
        const searchInput = document.getElementById('subscription-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.searchTerm = e.target.value.trim().toLowerCase();
                this.debounceSearch();
            });
        }
        
        // Filter controls
        document.getElementById('apply-filters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters')?.addEventListener('click', () => this.clearFilters());
        
        // Status filter
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
        });
        
        // Duration filter
        document.getElementById('duration-filter')?.addEventListener('change', (e) => {
            this.filters.duration = e.target.value;
        });
        
        // Date filters
        document.getElementById('date-from')?.addEventListener('change', (e) => {
            this.filters.dateFrom = e.target.value ? new Date(e.target.value) : null;
        });
        
        document.getElementById('date-to')?.addEventListener('change', (e) => {
            this.filters.dateTo = e.target.value ? new Date(e.target.value) : null;
        });
        
        // Pagination controls
        document.getElementById('prev-page')?.addEventListener('click', () => this.previousPage());
        document.getElementById('next-page')?.addEventListener('click', () => this.nextPage());
        
        // Page size change
        document.getElementById('page-size')?.addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadSubscriptions();
        });
        
        // Table header sorting
        const sortableHeaders = document.querySelectorAll('th i.fa-sort');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const headerCell = e.target.closest('th');
                const fieldName = this.getFieldNameFromHeader(headerCell.textContent.trim());
                this.updateSort(fieldName);
            });
        });
        
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-subs');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.handleSelectAll(e.target.checked);
            });
        }
        
        // Batch activation button
        document.getElementById('batch-add-btn')?.addEventListener('click', () => this.showBatchActivateModal());
        
        // Export button
        document.getElementById('export-subs-btn')?.addEventListener('click', () => this.exportSubscriptions());
        
        // Notify expiring button
        document.getElementById('notify-expiring-btn')?.addEventListener('click', () => this.sendExpirationReminders());
        
        // Chart period filters
        const chartFilters = document.querySelectorAll('.chart-filter');
        chartFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                const parent = e.target.closest('.chart-card');
                const filters = parent.querySelectorAll('.chart-filter');
                
                filters.forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                
                this.updateChart(parent, e.target.dataset.period);
            });
        });
        
        // Subscription form submission
        document.getElementById('subscription-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSubscriptionChanges();
        });
        
        // Batch activate form submission
        document.getElementById('batch-activate-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processBatchActivation();
        });
        
        // Custom code toggle in batch form
        document.getElementById('batch-subscription-code')?.addEventListener('change', (e) => {
            const customCodeContainer = document.getElementById('custom-code-container');
            if (customCodeContainer) {
                customCodeContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
        });
        
        // Setup subscription duration change handler
        document.getElementById('subscription-duration')?.addEventListener('change', (e) => {
            this.updateExpiryDate(parseInt(e.target.value));
        });
        
        // Batch duration change handler
        document.getElementById('batch-duration')?.addEventListener('change', (e) => {
            // Update subscription code dropdown to match duration if possible
            const durationValue = parseInt(e.target.value);
            const codeSelect = document.getElementById('batch-subscription-code');
            
            if (codeSelect) {
                switch(durationValue) {
                    case 7:
                        codeSelect.value = 'TRYNEXTSTEP';
                        break;
                    case 90:
                        codeSelect.value = 'PREMIUM3MONTH';
                        break;
                    case 365:
                        codeSelect.value = 'NEXTSTEP2025';
                        break;
                }
            }
        });
        
        // Modal close buttons - updated selector for new modal structure
        document.querySelectorAll('.modal-close, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        
        // Confirmation modal confirm button
        document.querySelector('#confirmationModal .confirm-btn')?.addEventListener('click', () => {
            if (typeof this.confirmationAction === 'function') {
                this.confirmationAction();
            }
            this.closeModal('confirmationModal');
        });

        // Sidebar toggle functionality
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
    }
    
    // Initialize subscription dashboard
    async initializeSubscriptionDashboard() {
        try {
            // Check authentication state
            onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    this.currentUser = user;
                    
                    // Verify admin status
                    const isAdmin = await this.verifyAdminStatus(user.uid);
                    
                    if (!isAdmin) {
                        this.showToast('You do not have admin permissions', 'error');
                        await this.handleLogout();
                        return;
                    }
                    
                    // Get admin data
                    await this.loadAdminData();
                    
                    // Update admin name in header
                    const profileName = document.querySelector('.profile-name');
                    if (profileName) {
                        profileName.textContent = this.currentAdminData?.name || user.displayName || user.email;
                    }
                    
                    // Initialize dashboard
                    await Promise.all([
                        this.loadSubscriptionStats(),
                        this.loadSubscriptions(),
                        this.loadUpcomingExpirations(),
                        this.loadChartData()
                    ]);
                } else {
                    // Redirect to login if not authenticated
                    window.location.href = '../index.html';
                }
            });
        } catch (error) {
            console.error('Subscription dashboard initialization error:', error);
            this.showToast('Error initializing dashboard', 'error');
        }
    }
    
    // Verify admin status
    async verifyAdminStatus(uid) {
        try {
            const userDoc = await getDoc(doc(this.db, "users", uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return userData.userRole === 'admin';
            }
            
            return false;
        } catch (error) {
            console.error('Admin verification error:', error);
            return false;
        }
    }
    
    // Load admin data
    async loadAdminData() {
        try {
            if (!this.currentUser) return;
            
            const adminDoc = await getDoc(doc(this.db, "users", this.currentUser.uid));
            
            if (adminDoc.exists()) {
                this.currentAdminData = adminDoc.data();
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
        }
    }
    
    // Load subscription statistics
    async loadSubscriptionStats() {
        try {
            const now = new Date();
            
            // 1. Count active subscriptions
            const activeSubsQuery = query(
                collection(this.db, "users"),
                where("subscription.isActive", "==", true),
                where("subscription.expiryDate", ">", now.toISOString())
            );
            const activeSubsSnapshot = await getDocs(activeSubsQuery);
            this.stats.activeSubscriptions = activeSubsSnapshot.size;
            
            // 2. Count expired subscriptions
            const expiredSubsQuery = query(
                collection(this.db, "users"),
                where("subscription.expiryDate", "<", now.toISOString())
            );
            const expiredSubsSnapshot = await getDocs(expiredSubsQuery);
            this.stats.expiredSubscriptions = expiredSubsSnapshot.size;
            
            // 3. Count renewals this month
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const renewalsQuery = query(
                collection(this.db, "users"),
                where("subscription.activatedAt", ">=", startOfMonth.toISOString())
            );
            const renewalsSnapshot = await getDocs(renewalsQuery);
            this.stats.monthlyRenewals = renewalsSnapshot.size;
            
            // 4. Calculate monthly revenue (assuming ₹999 per yearly subscription)
            this.stats.monthlyRevenue = this.stats.monthlyRenewals * 999;
            
            // Update UI with animations
            this.animateStatValues();
            
        } catch (error) {
            console.error('Error loading subscription stats:', error);
            this.showToast('Error loading statistics', 'error');
        }
    }

    animateStatValues() {
        const stats = [
            { id: 'active-subscriptions', value: this.stats.activeSubscriptions },
            { id: 'expired-subscriptions', value: this.stats.expiredSubscriptions },
            { id: 'monthly-renewals', value: this.stats.monthlyRenewals },
            { id: 'monthly-revenue', value: this.stats.monthlyRevenue, prefix: '₹' }
        ];

        stats.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                this.animateValue(element, 0, stat.value, 1000, stat.prefix);
            }
        });
    }

    animateValue(element, start, end, duration, prefix = '') {
        const startTimestamp = performance.now();
        
        const step = (currentTimestamp) => {
            const elapsed = currentTimestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * this.easeOutQuart(progress));
            element.textContent = prefix + current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    // Load subscriptions with pagination
    async loadSubscriptions(direction = 'next') {
        try {
            const tableBody = document.querySelector('#subscriptions-table tbody');
            
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="9" class="loading-state"><div class="loading-spinner"></div>Loading subscriptions...</td></tr>';
            }
            
            // Create base query for users with subscriptions
            let subsQuery = query(
                collection(this.db, "users"),
                where("subscription", "!=", null)
            );
            
            // Add sorting
            if (this.sortField.startsWith('subscription.')) {
                // For nested subscription fields
                const field = this.sortField.split('.')[1];
                subsQuery = query(subsQuery, orderBy(`subscription.${field}`, this.sortDirection));
            } else {
                // For user fields
                subsQuery = query(subsQuery, orderBy(this.sortField, this.sortDirection));
            }
            
            // Apply pagination
            if (direction === 'next' && this.lastVisible) {
                subsQuery = query(subsQuery, startAfter(this.lastVisible), limit(this.pageSize));
            } else if (direction === 'prev' && this.firstVisible) {
                subsQuery = query(subsQuery, endBefore(this.firstVisible), limitToLast(this.pageSize));
            } else {
                // First page or reset
                subsQuery = query(subsQuery, limit(this.pageSize));
            }
            
            // Execute query
            const querySnapshot = await getDocs(subsQuery);
            
            // Store pagination cursors
            if (!querySnapshot.empty) {
                this.firstVisible = querySnapshot.docs[0];
                this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            }
            
            // Extract subscription data
            this.subscriptions = querySnapshot.docs.map(doc => {
                const userData = doc.data();
                return {
                    userId: doc.id,
                    name: userData.name || 'Unknown',
                    email: userData.email || 'No email',
                    subscription: userData.subscription || {}
                };
            });
            
            // Filter subscriptions based on current filters
            this.applyFiltersToSubscriptions();
            
            // Render subscriptions table
            this.renderSubscriptionsTable();
            
            // Update pagination info
            this.updatePaginationInfo();
            
            // Get total subscriptions count for pagination
            await this.countTotalSubscriptions();
            
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            this.showToast('Error loading subscriptions', 'error');
        }
    }
    
    // Count total subscriptions for pagination
    async countTotalSubscriptions() {
        try {
            const subsQuery = query(
                collection(this.db, "users"),
                where("subscription", "!=", null)
            );
            
            const querySnapshot = await getDocs(subsQuery);
            this.totalSubscriptions = querySnapshot.size;
            this.updatePaginationControls();
        } catch (error) {
            console.error('Error counting subscriptions:', error);
        }
    }
    
    // Apply filters to loaded subscriptions
    applyFiltersToSubscriptions() {
        // Start with all loaded subscriptions
        this.filteredSubscriptions = [...this.subscriptions];
        
        const now = new Date();
        
        // Apply status filter
        if (this.filters.status !== 'all') {
            this.filteredSubscriptions = this.filteredSubscriptions.filter(item => {
                const expiryDate = new Date(item.subscription.expiryDate);
                
                switch(this.filters.status) {
                    case 'active':
                        return item.subscription.isActive && expiryDate > now;
                    case 'expired':
                        return expiryDate <= now;
                    case 'canceled':
                        return !item.subscription.isActive;
                    default:
                        return true;
                }
            });
        }
        
        // Apply duration filter
        if (this.filters.duration !== 'all') {
            const durationDays = parseInt(this.filters.duration);
            
            this.filteredSubscriptions = this.filteredSubscriptions.filter(item => {
                if (!item.subscription.activatedAt || !item.subscription.expiryDate) {
                    return false;
                }
                
                const activatedAt = new Date(item.subscription.activatedAt);
                const expiryDate = new Date(item.subscription.expiryDate);
                const durationInDays = Math.round((expiryDate - activatedAt) / (1000 * 60 * 60 * 24));
                
                // Allow for small differences (±3 days)
                return Math.abs(durationInDays - durationDays) <= 3;
            });
        }
        
        // Apply date filters
        if (this.filters.dateFrom) {
            this.filteredSubscriptions = this.filteredSubscriptions.filter(item => {
                const expiryDate = new Date(item.subscription.expiryDate);
                return expiryDate >= this.filters.dateFrom;
            });
        }
        
        if (this.filters.dateTo) {
            const endDate = new Date(this.filters.dateTo);
            endDate.setHours(23, 59, 59, 999);
            
            this.filteredSubscriptions = this.filteredSubscriptions.filter(item => {
                const expiryDate = new Date(item.subscription.expiryDate);
                return expiryDate <= endDate;
            });
        }
        
        // Apply search term
        if (this.filters.searchTerm) {
            this.filteredSubscriptions = this.filteredSubscriptions.filter(item => {
                return (
                    (item.name && item.name.toLowerCase().includes(this.filters.searchTerm)) ||
                    (item.email && item.email.toLowerCase().includes(this.filters.searchTerm)) ||
                    (item.subscription.code && item.subscription.code.toLowerCase().includes(this.filters.searchTerm))
                );
            });
        }
    }
    
    // Render subscriptions table
    renderSubscriptionsTable() {
        const tableBody = document.querySelector('#subscriptions-table tbody');
        
        if (!tableBody) return;
        
        if (this.filteredSubscriptions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="loading-state">No subscriptions found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        
        this.filteredSubscriptions.forEach(item => {
            const now = new Date();
            const activatedDate = item.subscription.activatedAt ? new Date(item.subscription.activatedAt) : null;
            const expiryDate = item.subscription.expiryDate ? new Date(item.subscription.expiryDate) : null;
            
            // Calculate duration in days
            let durationDays = 0;
            if (activatedDate && expiryDate) {
                durationDays = Math.round((expiryDate - activatedDate) / (1000 * 60 * 60 * 24));
            }
            
            // Get duration label
            let durationLabel = `${durationDays} days`;
            if (durationDays >= 365) {
                durationLabel = `${Math.round(durationDays / 365)} year(s)`;
            } else if (durationDays >= 30) {
                durationLabel = `${Math.round(durationDays / 30)} month(s)`;
            } else if (durationDays >= 7) {
                durationLabel = `${Math.round(durationDays / 7)} week(s)`;
            }
            
            // Determine status
            let status = 'Inactive';
            let statusClass = 'status-inactive';
            
            if (item.subscription.isActive) {
                if (expiryDate > now) {
                    status = 'Active';
                    statusClass = 'status-active';
                } else {
                    status = 'Expired';
                    statusClass = 'status-expired';
                }
            }
            
            const rowHtml = `
                <tr data-user-id="${item.userId}">
                    <td>
                        <input type="checkbox" class="subscription-checkbox" 
                               ${this.selectedSubscriptionIds.has(item.userId) ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="user-cell">
                            <img src="images/avatar-placeholder.png" alt="${item.name}" class="table-avatar">
                            <div class="user-info">
                                <div class="user-name">${item.name}</div>
                                <div class="user-id">#${item.userId.substring(0, 8)}</div>
                            </div>
                        </div>
                    </td>
                    <td>${item.email}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${status}
                        </span>
                    </td>
                    <td>${item.subscription.code || 'N/A'}</td>
                    <td>${activatedDate ? activatedDate.toLocaleDateString() : 'N/A'}</td>
                    <td>${expiryDate ? expiryDate.toLocaleDateString() : 'N/A'}</td>
                    <td>${durationLabel}</td>
                    <td class="actions-cell">
                        <div class="table-actions">
                            <button class="table-action-btn edit" title="Manage Subscription" onclick="subscriptionDashboard.manageSubscription('${item.userId}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="table-action-btn renew" title="Renew Subscription" onclick="subscriptionDashboard.renewSubscription('${item.userId}')">
                                <i class="fas fa-sync"></i>
                            </button>
                            <button class="table-action-btn cancel" title="Cancel Subscription" onclick="subscriptionDashboard.confirmCancelSubscription('${item.userId}')">
                                <i class="fas fa-ban"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            tableBody.innerHTML += rowHtml;
        });
        
        // Add click handler for checkboxes
        document.querySelectorAll('.subscription-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const userId = e.target.closest('tr').dataset.userId;
                this.toggleSubscriptionSelection(userId, e.target.checked);
            });
        });
    }
    
    // Load upcoming expirations
    async loadUpcomingExpirations() {
        try {
            const tableBody = document.querySelector('#expirations-table tbody');
            
            if (!tableBody) return;
            
            tableBody.innerHTML = '<tr><td colspan="6" class="loading-state"><div class="loading-spinner"></div>Loading upcoming expirations...</td></tr>';
            
            // Get date range for next 7 days
            const now = new Date();
            const sevenDaysLater = new Date();
            sevenDaysLater.setDate(now.getDate() + 7);
            
            // Query for active subscriptions expiring in the next 7 days
            const expiringQuery = query(
                collection(this.db, "users"),
                where("subscription.isActive", "==", true),
                where("subscription.expiryDate", ">", now.toISOString()),
                where("subscription.expiryDate", "<", sevenDaysLater.toISOString()),
                orderBy("subscription.expiryDate", "asc")
            );
            
            const querySnapshot = await getDocs(expiringQuery);
            
            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="6" class="loading-state">No upcoming expirations in the next 7 days</td></tr>';
                return;
            }
            
            tableBody.innerHTML = '';
            
            querySnapshot.forEach(doc => {
                const userData = doc.data();
                const expiryDate = new Date(userData.subscription.expiryDate);
                
                // Calculate days left
                const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                
                // Calculate original duration
                let originalDuration = 'Unknown';
                if (userData.subscription.activatedAt) {
                    const activatedDate = new Date(userData.subscription.activatedAt);
                    const durationDays = Math.round((expiryDate - activatedDate) / (1000 * 60 * 60 * 24));
                    
                    if (durationDays >= 365) {
                        originalDuration = `${Math.round(durationDays / 365)} year`;
                    } else if (durationDays >= 30) {
                        originalDuration = `${Math.round(durationDays / 30)} month`;
                    } else if (durationDays >= 7) {
                        originalDuration = `${Math.round(durationDays / 7)} week`;
                    } else {
                        originalDuration = `${durationDays} day`;
                    }
                }
                
                tableBody.innerHTML += `
                    <tr>
                        <td>
                            <div class="user-cell">
                                <img src="images/avatar-placeholder.png" alt="${userData.name}" class="table-avatar">
                                <div class="user-info">
                                    <div class="user-name">${userData.name || 'Unknown'}</div>
                                    <div class="user-id">#${doc.id.substring(0, 8)}</div>
                                </div>
                            </div>
                        </td>
                        <td>${userData.email || 'No email'}</td>
                        <td>${expiryDate.toLocaleDateString()}</td>
                        <td>
                            <span class="${daysLeft <= 3 ? 'urgent' : ''}">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span>
                        </td>
                        <td>${originalDuration}</td>
                        <td>
                            <div class="table-actions">
                                <button class="table-action-btn renew" title="Renew" onclick="subscriptionDashboard.renewSubscription('${doc.id}')">
                                    <i class="fas fa-sync"></i>
                                </button>
                                <button class="table-action-btn notify" title="Notify" onclick="subscriptionDashboard.sendExpirationReminder('${doc.id}')">
                                    <i class="fas fa-bell"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error('Error loading upcoming expirations:', error);
            this.showToast('Error loading expirations', 'error');
        }
    }
    
    // Load chart data
    async loadChartData() {
        try {
            // Load default period (month)
            this.updateCharts('month');
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showToast('Error loading charts', 'error');
        }
    }
    
    // Update charts based on period
    async updateCharts(period) {
        try {
            // 1. Get date range
            const now = new Date();
            let startDate = new Date();
            let dateLabelFormat;
            let groupBy;
            
            switch(period) {
                case 'month':
                    // Last 30 days
                    startDate.setDate(now.getDate() - 30);
                    dateLabelFormat = 'day'; // Group by day
                    groupBy = 'day';
                    break;
                case 'quarter':
                    // Last 90 days
                    startDate.setDate(now.getDate() - 90);
                    dateLabelFormat = 'week'; // Group by week
                    groupBy = 'week';
                    break;
                case 'year':
                    // Last 365 days
                    startDate.setDate(now.getDate() - 365);
                    dateLabelFormat = 'month'; // Group by month
                    groupBy = 'month';
                    break;
            }
            
            // 2. Get subscription activations in the date range
            const activationsQuery = query(
                collection(this.db, "users"),
                where("subscription.activatedAt", ">=", startDate.toISOString()),
                where("subscription.activatedAt", "<=", now.toISOString()),
                orderBy("subscription.activatedAt", "asc")
            );
            
            const activationsSnapshot = await getDocs(activationsQuery);
            
            // 3. Process data for charts
            const activationsByDate = {};
            const revenueByDuration = {
                '7': 0,    // 1 week
                '30': 0,   // 1 month
                '90': 0,   // 3 months
                '180': 0,  // 6 months
                '365': 0   // 1 year
            };
            
            activationsSnapshot.forEach(doc => {
                const userData = doc.data();
                const activatedDate = new Date(userData.subscription.activatedAt);
                
                // Group by appropriate time period
                let groupKey;
                
                if (groupBy === 'day') {
                    groupKey = activatedDate.toISOString().split('T')[0]; // YYYY-MM-DD
                } else if (groupBy === 'week') {
                    // Get week start date (Sunday)
                    const weekStartDate = new Date(activatedDate);
                    weekStartDate.setDate(activatedDate.getDate() - activatedDate.getDay());
                    groupKey = weekStartDate.toISOString().split('T')[0];
                } else if (groupBy === 'month') {
                    groupKey = `${activatedDate.getFullYear()}-${(activatedDate.getMonth() + 1).toString().padStart(2, '0')}`;
                }
                
                // Count subscriptions by date group
                if (!activationsByDate[groupKey]) {
                    activationsByDate[groupKey] = 0;
                }
                activationsByDate[groupKey]++;
                
                // Count revenue by subscription duration
                if (userData.subscription.activatedAt && userData.subscription.expiryDate) {
                    const expiryDate = new Date(userData.subscription.expiryDate);
                    const durationDays = Math.round((expiryDate - activatedDate) / (1000 * 60 * 60 * 24));
                    
                    // Find closest duration bucket
                    let durationBucket;
                    if (durationDays <= 14) {
                        durationBucket = '7';
                    } else if (durationDays <= 60) {
                        durationBucket = '30';
                    } else if (durationDays <= 120) {
                        durationBucket = '90';
                    } else if (durationDays <= 240) {
                        durationBucket = '180';
                    } else {
                        durationBucket = '365';
                    }
                    
                    // Calculate revenue (based on duration)
                    let revenue;
                    switch(durationBucket) {
                        case '7': revenue = 199; break;
                        case '30': revenue = 499; break;
                        case '90': revenue = 899; break;
                        case '180': revenue = 1499; break;
                        case '365': revenue = 1999; break;
                        default: revenue = 0;
                    }
                    
                    revenueByDuration[durationBucket] += revenue;
                }
            });
            
            // 4. Prepare chart data
            
            // 4.1 Subscription Growth Chart
            const growthLabels = [];
            const growthData = [];
            
            // Create full range of dates for the period
            let currentDate = new Date(startDate);
            while (currentDate <= now) {
                let groupKey;
                
                if (groupBy === 'day') {
                    groupKey = currentDate.toISOString().split('T')[0];
                    growthLabels.push(new Date(groupKey).toLocaleDateString());
                } else if (groupBy === 'week') {
                    const weekStartDate = new Date(currentDate);
                    weekStartDate.setDate(currentDate.getDate() - currentDate.getDay());
                    groupKey = weekStartDate.toISOString().split('T')[0];
                    growthLabels.push(`Week of ${new Date(groupKey).toLocaleDateString()}`);
                    // Advance to next week
                    currentDate.setDate(currentDate.getDate() + 7);
                    continue;
                } else if (groupBy === 'month') {
                    groupKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    growthLabels.push(`${currentDate.toLocaleString('default', { month: 'short' })} ${currentDate.getFullYear()}`);
                    // Advance to next month
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    continue;
                }
                
                growthData.push(activationsByDate[groupKey] || 0);
                
                // Advance to next day
                if (groupBy === 'day') {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            
            // 4.2 Revenue by Type Chart
            const durationLabels = ['1 Week', '1 Month', '3 Months', '6 Months', '1 Year'];
            const revenueData = [
                revenueByDuration['7'],
                revenueByDuration['30'],
                revenueByDuration['90'],
                revenueByDuration['180'],
                revenueByDuration['365']
            ];
            
            // 5. Render charts
            this.renderSubscriptionGrowthChart(growthLabels, growthData);
            this.renderRevenueByTypeChart(durationLabels, revenueData);
            
        } catch (error) {
            console.error('Error updating charts:', error);
            this.showToast('Error updating charts', 'error');
        }
    }
    
    // Render subscription growth chart
    renderSubscriptionGrowthChart(labels, data) {
        const chartContainer = document.getElementById('subscription-growth-chart');
        
        if (!chartContainer) return;
        
        // Clear previous chart
        chartContainer.innerHTML = '<canvas id="growthChart"></canvas>';
        
        const ctx = document.getElementById('growthChart').getContext('2d');
        
        if (this.charts.growth) {
            this.charts.growth.destroy();
        }
        
        this.charts.growth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'New Subscriptions',
                    data: data,
                    backgroundColor: 'rgba(0, 107, 107, 0.1)',
                    borderColor: 'rgba(0, 107, 107, 1)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(0, 107, 107, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { family: 'Poppins' },
                        bodyFont: { family: 'Poppins' },
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { family: 'Poppins' }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            precision: 0,
                            font: { family: 'Poppins' }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    
    // Render revenue by type chart
    renderRevenueByTypeChart(labels, data) {
        const chartContainer = document.getElementById('revenue-by-type-chart');
        
        if (!chartContainer) return;
        
        // Clear previous chart
        chartContainer.innerHTML = '<canvas id="revenueChart"></canvas>';
        
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        const colors = [
            '#1abc9c', // Turquoise
            '#3498db', // Blue
            '#9b59b6', // Purple
            '#e67e22', // Orange
            '#f1c40f'  // Yellow
        ];
        
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }
        
        this.charts.revenue = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            boxWidth: 15,
                            usePointStyle: true,
                            font: {
                                family: 'Poppins',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `₹${value.toLocaleString()}`;
                            }
                        },
                        titleFont: {
                            family: 'Poppins',
                            size: 14
                        },
                        bodyFont: {
                            family: 'Poppins',
                            size: 12
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // Update chart based on period selection
    updateChart(chartCard, period) {
        // Update chart based on period selection
        this.updateCharts(period);
    }
    
    // Update pagination info
    updatePaginationInfo() {
        const startElement = document.getElementById('showing-start');
        const endElement = document.getElementById('showing-end');
        const totalElement = document.getElementById('total-subs-count');
        
        if (startElement) startElement.textContent = ((this.currentPage - 1) * this.pageSize) + 1;
        
        const end = Math.min(this.currentPage * this.pageSize, this.totalSubscriptions);
        if (endElement) endElement.textContent = end;
        
        if (totalElement) totalElement.textContent = this.totalSubscriptions;
    }
    
    // Update pagination controls
    updatePaginationControls() {
        const totalPages = Math.ceil(this.totalSubscriptions / this.pageSize);
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');
        
        // Update prev/next buttons
        if (prevButton) {
            prevButton.disabled = this.currentPage === 1;
        }
        
        if (nextButton) {
            nextButton.disabled = this.currentPage === totalPages;
        }
        
        // Update page numbers
        const paginationNumbers = document.getElementById('pagination-numbers');
        if (paginationNumbers) {
            paginationNumbers.innerHTML = '';
            
            // Simple pagination logic - show 5 page numbers
            let startPage = Math.max(1, this.currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement('button');
                pageButton.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
                pageButton.textContent = i;
                pageButton.addEventListener('click', () => this.goToPage(i));
                paginationNumbers.appendChild(pageButton);
            }
        }
    }
    
    // Go to specific page
    goToPage(pageNumber) {
        if (pageNumber === this.currentPage) return;
        
        // Reset pagination cursors if going back to first page
        if (pageNumber === 1) {
            this.firstVisible = null;
            this.lastVisible = null;
        }
        
        this.currentPage = pageNumber;
        this.loadSubscriptions();
    }
    
    // Next page
    nextPage() {
        const nextBtn = document.getElementById('next-page');
        if (nextBtn && nextBtn.disabled) return;
        
        this.currentPage++;
        this.loadSubscriptions('next');
    }
    
    // Previous page
    previousPage() {
        const prevBtn = document.getElementById('prev-page');
        if (prevBtn && prevBtn.disabled) return;
        
        this.currentPage--;
        this.loadSubscriptions('prev');
    }
    
    // Apply filters
    applyFilters() {
        // Reset pagination
        this.currentPage = 1;
        this.firstVisible = null;
        this.lastVisible = null;
        
        // Load subscriptions with new filters
        this.loadSubscriptions();
    }
    
    // Clear filters
    clearFilters() {
        this.filters = {
            status: 'all',
            duration: 'all',
            dateFrom: null,
            dateTo: null,
            searchTerm: ''
        };
        
        // Reset filter form
        const statusFilter = document.getElementById('status-filter');
        const durationFilter = document.getElementById('duration-filter');
        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');
        const subscriptionSearch = document.getElementById('subscription-search');
        
        if (statusFilter) statusFilter.value = 'all';
        if (durationFilter) durationFilter.value = 'all';
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';
        if (subscriptionSearch) subscriptionSearch.value = '';
        
        // Apply reset filters
        this.applyFilters();
    }
    
    // Debounce search to avoid too many queries
    debounceSearch() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 500);
    }
    
    // Update sort
    updateSort(field) {
        // If already sorting by this field, toggle direction
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        
        // Reset pagination
        this.currentPage = 1;
        this.firstVisible = null;
        this.lastVisible = null;
        
        // Load subscriptions with new sort
        this.loadSubscriptions();
    }
    
    // Get field name from header text
    getFieldNameFromHeader(headerText) {
        const fieldMap = {
            'User': 'name',
            'Activated': 'subscription.activatedAt',
            'Expires': 'subscription.expiryDate',
        };
        
        return fieldMap[headerText] || 'subscription.expiryDate';
    }
    
    // Toggle subscription selection for bulk actions
    toggleSubscriptionSelection(userId, isSelected) {
        if (isSelected) {
            this.selectedSubscriptionIds.add(userId);
        } else {
            this.selectedSubscriptionIds.delete(userId);
        }
    }
    
    // Handle select all checkboxes
    handleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.subscription-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const userId = checkbox.closest('tr').dataset.userId;
            this.toggleSubscriptionSelection(userId, selectAll);
        });
    }
    
    // Manage subscription
    async manageSubscription(userId) {
        try {
            // Get user data
            const userDoc = await getDoc(doc(this.db, "users", userId));
            
            if (!userDoc.exists()) {
                this.showToast('User not found', 'error');
                return;
            }
            
            const userData = userDoc.data();
            
            // Set user ID in form
            document.getElementById('subscription-user-id').value = userId;
            
            // Set user details
            document.getElementById('subscription-user-name').textContent = userData.name || 'User';
            document.getElementById('subscription-user-email').textContent = userData.email || 'No email';
            
            // Set current subscription details if available
            if (userData.subscription) {
                document.getElementById('subscription-status').value = 
                    userData.subscription.isActive ? 'active' : 'inactive';
                
                document.getElementById('subscription-code').value = 
                    userData.subscription.code || '';
                
                // Set expiry date input
                const expiryDate = new Date(userData.subscription.expiryDate);
                document.getElementById('subscription-expiry').valueAsDate = expiryDate;
                
                // Calculate duration based on activatedAt and expiryDate
                if (userData.subscription.activatedAt) {
                    const activatedAt = new Date(userData.subscription.activatedAt);
                    const durationDays = Math.round((expiryDate - activatedAt) / (1000 * 60 * 60 * 24));
                    
                    // Find closest duration option
                    const durationOptions = [7, 30, 90, 180, 365];
                    const closestDuration = durationOptions.reduce((prev, curr) => {
                        return (Math.abs(curr - durationDays) < Math.abs(prev - durationDays) ? curr : prev);
                    });
                    
                    document.getElementById('subscription-duration').value = closestDuration;
                }
                
                // Set notes
                document.getElementById('subscription-notes').value = 
                    userData.subscription.notes || '';
            } else {
                // Set default values for new subscription
                document.getElementById('subscription-status').value = 'active';
                document.getElementById('subscription-code').value = '';
                
                // Set default expiry date to 1 year from now
                const defaultExpiry = new Date();
                defaultExpiry.setDate(defaultExpiry.getDate() + 365);
                document.getElementById('subscription-expiry').valueAsDate = defaultExpiry;
                
                document.getElementById('subscription-duration').value = 365;
                document.getElementById('subscription-notes').value = '';
            }
            
            // Show modal
            this.showModal('manageSubscriptionModal');
            
        } catch (error) {
            console.error('Error loading user subscription data:', error);
            this.showToast('Error loading subscription data', 'error');
        }
    }
    
    // Save subscription changes
    async saveSubscriptionChanges() {
        try {
            const userId = document.getElementById('subscription-user-id').value;
            
            if (!userId) {
                this.showToast('User ID not found', 'error');
                return;
            }
            
            // Get form values
            const isActive = document.getElementById('subscription-status').value === 'active';
            const code = document.getElementById('subscription-code').value.trim();
            const expiryDate = document.getElementById('subscription-expiry').valueAsDate;
            const notes = document.getElementById('subscription-notes').value.trim();
            
            // Create subscription data
            const subscriptionData = {
                isActive: isActive,
                expiryDate: expiryDate.toISOString(),
                updatedAt: new Date().toISOString(),
                updatedBy: this.currentUser.uid,
                notes: notes
            };
            
            // Add code if provided
            if (code) {
                subscriptionData.code = code;
            }
            
            // If this is a new subscription or activation, set activatedAt
            if (isActive) {
                // Get current user data to check if this is a new activation
                const userDoc = await getDoc(doc(this.db, "users", userId));
                const userData = userDoc.data();
                
                if (!userData.subscription || !userData.subscription.isActive) {
                    subscriptionData.activatedAt = new Date().toISOString();
                } else if (userData.subscription && userData.subscription.activatedAt) {
                    // Keep the original activation date if reactivating
                    subscriptionData.activatedAt = userData.subscription.activatedAt;
                }
            }
            
            // Update user document in Firestore
            await updateDoc(doc(this.db, "users", userId), {
                subscription: subscriptionData
            });
            
            this.showToast('Subscription updated successfully', 'success');
            this.closeModal('manageSubscriptionModal');
            
            // Reload data to reflect changes
            await Promise.all([
                this.loadSubscriptionStats(),
                this.loadSubscriptions(),
                this.loadUpcomingExpirations()
            ]);
            
        } catch (error) {
            console.error('Error saving subscription changes:', error);
            this.showToast('Error saving subscription changes', 'error');
        }
    }
    
    // Update expiry date based on duration
    updateExpiryDate(durationDays) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + durationDays);
        document.getElementById('subscription-expiry').valueAsDate = expiryDate;
    }
    
    // Renew subscription
    async renewSubscription(userId) {
        try {
            // Get user data
            const userDoc = await getDoc(doc(this.db, "users", userId));
            
            if (!userDoc.exists()) {
                this.showToast('User not found', 'error');
                return;
            }
            
            const userData = userDoc.data();
            
            // Set user ID in form
            document.getElementById('subscription-user-id').value = userId;
            
            // Set user details
            document.getElementById('subscription-user-name').textContent = userData.name || 'User';
            document.getElementById('subscription-user-email').textContent = userData.email || 'No email';
            
            // Set renewal values
            document.getElementById('subscription-status').value = 'active';
            
            // Keep existing code if available
            if (userData.subscription && userData.subscription.code) {
                document.getElementById('subscription-code').value = userData.subscription.code;
            } else {
                document.getElementById('subscription-code').value = '';
            }
            
            // Determine duration for renewal
            let durationDays = 365; // Default to 1 year
            
            if (userData.subscription && userData.subscription.activatedAt && userData.subscription.expiryDate) {
                const activatedAt = new Date(userData.subscription.activatedAt);
                const expiryDate = new Date(userData.subscription.expiryDate);
                const originalDuration = Math.round((expiryDate - activatedAt) / (1000 * 60 * 60 * 24));
                
                // Find closest standard duration
                const durationOptions = [7, 30, 90, 180, 365];
                durationDays = durationOptions.reduce((prev, curr) => {
                    return (Math.abs(curr - originalDuration) < Math.abs(prev - originalDuration) ? curr : prev);
                });
            }
            
            document.getElementById('subscription-duration').value = durationDays.toString();
            
            // Set new expiry date
            const newExpiryDate = new Date();
            newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);
            document.getElementById('subscription-expiry').valueAsDate = newExpiryDate;
            
            // Set notes
            document.getElementById('subscription-notes').value = 
                `Renewed on ${new Date().toLocaleDateString()}. ${userData.subscription?.notes || ''}`.trim();
            
            // Show modal
            this.showModal('manageSubscriptionModal');
            
        } catch (error) {
            console.error('Error preparing subscription renewal:', error);
            this.showToast('Error preparing renewal', 'error');
        }
    }
    
    // Confirm cancel subscription
    confirmCancelSubscription(userId) {
        // Set up confirmation action
        this.confirmationAction = () => this.cancelSubscription(userId);
        
        // Show confirmation dialog
        document.getElementById('confirmation-message').textContent = 
            'Are you sure you want to cancel this subscription? The user will lose premium access.';
        
        this.showModal('confirmationModal');
    }
    
    // Cancel subscription
    async cancelSubscription(userId) {
        try {
            // Update user document
            await updateDoc(doc(this.db, "users", userId), {
                'subscription.isActive': false,
                'subscription.updatedAt': new Date().toISOString(),
                'subscription.updatedBy': this.currentUser.uid,
                'subscription.notes': 'Canceled by admin on ' + new Date().toLocaleDateString()
            });
            
            this.showToast('Subscription canceled successfully', 'success');
            
            // Reload data to reflect changes
            await Promise.all([
                this.loadSubscriptionStats(),
                this.loadSubscriptions(),
                this.loadUpcomingExpirations()
            ]);
            
        } catch (error) {
            console.error('Error canceling subscription:', error);
            this.showToast('Error canceling subscription', 'error');
        }
    }
    
    // Show batch activate modal
    showBatchActivateModal() {
        // Set default expiry date based on selected duration
        const durationSelect = document.getElementById('batch-duration');
        if (durationSelect) {
            this.updateBatchExpiryDate(parseInt(durationSelect.value));
        }
        
        // Show modal
        this.showModal('batchActivateModal');
    }
    
    // Update batch expiry date based on duration
    updateBatchExpiryDate(durationDays) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + durationDays);
    }
    
    // Process batch activation
    async processBatchActivation() {
        try {
            // Get form values
            const emailsText = document.getElementById('batch-user-emails').value.trim();
            
            if (!emailsText) {
                this.showToast('Please enter at least one email address', 'error');
                return;
            }
            
            // Parse emails
            const emails = emailsText.split('\n')
                .map(email => email.trim())
                .filter(email => email.length > 0);
            
            if (emails.length === 0) {
                this.showToast('Please enter valid email addresses', 'error');
                return;
            }
            
            // Get subscription details
            const duration = parseInt(document.getElementById('batch-duration').value);
            const notes = document.getElementById('batch-notes').value.trim();
            
            // Get subscription code
            let code;
            if (document.getElementById('batch-subscription-code').value === 'custom') {
                code = document.getElementById('custom-code').value.trim();
                if (!code) {
                    this.showToast('Please enter a custom subscription code', 'error');
                    return;
                }
            } else {
                code = document.getElementById('batch-subscription-code').value;
            }
            
            // Calculate expiry date
            const now = new Date();
            const expiryDate = new Date();
            expiryDate.setDate(now.getDate() + duration);
            
            // Create subscription data
            const subscriptionData = {
                isActive: true,
                activatedAt: now.toISOString(),
                expiryDate: expiryDate.toISOString(),
                code: code,
                updatedAt: now.toISOString(),
                updatedBy: this.currentUser.uid,
                notes: notes
            };
            
            // Find users by email and update subscriptions
            let successCount = 0;
            let notFoundCount = 0;
            
            for (const email of emails) {
                // Query for user with this email
                const userQuery = query(
                    collection(this.db, "users"),
                    where("email", "==", email)
                );
                
                const querySnapshot = await getDocs(userQuery);
                
                if (querySnapshot.empty) {
                    notFoundCount++;
                    continue;
                }
                
                // Update each matching user
                for (const userDoc of querySnapshot.docs) {
                    await updateDoc(doc(this.db, "users", userDoc.id), {
                        subscription: subscriptionData
                    });
                    
                    successCount++;
                }
            }
            
            // Show result
            if (successCount > 0) {
                if (notFoundCount > 0) {
                    this.showToast(`Activated ${successCount} subscriptions. ${notFoundCount} users not found.`, 'info');
                } else {
                    this.showToast(`Successfully activated ${successCount} subscriptions`, 'success');
                }
            } else {
                this.showToast('No users found with the provided emails', 'error');
            }
            
            this.closeModal('batchActivateModal');
            
            // Reload data to reflect changes
            await Promise.all([
                this.loadSubscriptionStats(),
                this.loadSubscriptions(),
                this.loadUpcomingExpirations()
            ]);
            
        } catch (error) {
            console.error('Error processing batch activation:', error);
            this.showToast('Error activating subscriptions', 'error');
        }
    }
    
    // Send expiration reminders
    async sendExpirationReminders() {
        this.showToast('Email notification feature would send reminders to users whose subscriptions are expiring soon', 'info');
        
        // In a real implementation, this would trigger a cloud function or server endpoint
        // that would send emails to users with expiring subscriptions
    }
    
    // Send individual expiration reminder
    async sendExpirationReminder(userId) {
        // Get user data
        const userDoc = await getDoc(doc(this.db, "users", userId));
        
        if (!userDoc.exists()) {
            this.showToast('User not found', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        this.showToast(`Email notification sent to ${userData.email}`, 'success');
        
        // In a real implementation, this would trigger a cloud function or server endpoint
        // that would send an email to the specific user
    }
    
    // Export subscriptions
    exportSubscriptions() {
        try {
            // Create CSV content
            let csv = 'Name,Email,Status,Code,Activated,Expires,Duration,Notes\n';
            
            this.subscriptions.forEach(item => {
                const now = new Date();
                const activatedDate = item.subscription.activatedAt ? new Date(item.subscription.activatedAt) : null;
                const expiryDate = item.subscription.expiryDate ? new Date(item.subscription.expiryDate) : null;
                
                // Calculate duration in days
                let durationDays = 0;
                if (activatedDate && expiryDate) {
                    durationDays = Math.round((expiryDate - activatedDate) / (1000 * 60 * 60 * 24));
                }
                
                // Get duration label
                let durationLabel = `${durationDays} days`;
                
                // Determine status
                let status = 'Inactive';
                
                if (item.subscription.isActive) {
                    if (expiryDate > now) {
                        status = 'Active';
                    } else {
                        status = 'Expired';
                    }
                }
                
                csv += `"${item.name}","${item.email}","${status}","${item.subscription.code || ''}","${activatedDate ? activatedDate.toLocaleDateString() : ''}","${expiryDate ? expiryDate.toLocaleDateString() : ''}","${durationLabel}","${item.subscription.notes || ''}"\n`;
            });
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'nextstep_subscriptions.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            this.showToast('Subscriptions exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting subscriptions:', error);
            this.showToast('Error exporting subscriptions', 'error');
        }
    }
    
    // Show modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
        }
    }
    
    // Close modal
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }
    
    // Close all modals
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('active');
        });
    }
    
    // Handle logout
    async handleLogout() {
        try {
            await signOut(this.auth);
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error logging out', 'error');
        }
    }
    
    // Show toast notification
    showToast(message, type = 'info') {
        // Check if there's a global showToast function
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
}

// Initialize subscription dashboard
const subscriptionDashboard = new SubscriptionDashboard();

// Expose to global scope for event handlers
window.subscriptionDashboard = subscriptionDashboard;
