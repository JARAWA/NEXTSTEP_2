// Professional Admin Dashboard JavaScript
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
    query, 
    where, 
    orderBy, 
    limit,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

class ProfessionalAdminDashboard {
    constructor() {
        this.auth = getAuth();
        this.db = getFirestore();
        this.currentUser = null;
        this.charts = {};
        this.stats = {
            totalUsers: 0,
            newSignups: 0,
            jeeStudents: 0,
            neetStudents: 0,
            premiumUsers: 0
        };
        this.recentUsers = [];
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initializeAuth();
        await this.loadDashboardData();
        this.initializeCharts();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                this.saveLayoutPreference();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Chart filters
        document.querySelectorAll('.chart-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                const parent = e.target.closest('.chart-card');
                const filters = parent.querySelectorAll('.chart-filter');
                
                filters.forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                
                this.updateChart(parent, e.target.dataset.period);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Search functionality
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debounce(() => this.handleSearch(e.target.value), 300)();
            });
        }

        // Notification button
        const notificationBtn = document.querySelector('.notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }

    initializeAuth() {
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                this.currentUser = user;
                
                // Verify admin status
                const isAdmin = await this.verifyAdminStatus(user.uid);
                
                if (!isAdmin) {
                    this.showToast('Access denied. Admin privileges required.', 'error');
                    await this.handleLogout();
                    return;
                }
                
                // Update UI with user info
                this.updateUserProfile(user);
                
                // Load dashboard data
                await this.loadDashboardData();
                
            } else {
                // Redirect to login
                window.location.href = '../index.html';
            }
        });
    }

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

    updateUserProfile(user) {
        const profileName = document.querySelector('.profile-name');
        const profileRole = document.querySelector('.profile-role');
        
        if (profileName) {
            profileName.textContent = user.displayName || user.email;
        }
        
        if (profileRole) {
            profileRole.textContent = 'Administrator';
        }
    }

    async loadDashboardData() {
        try {
            this.showLoadingState();
            
            // Load all data in parallel
            await Promise.all([
                this.loadUserStatistics(),
                this.loadRecentUsers(),
                this.loadChartData()
            ]);
            
            this.updateLastUpdatedTime();
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showToast('Error loading dashboard data', 'error');
        }
    }

    async loadUserStatistics() {
        try {
            // Get total users count
            const usersSnapshot = await getDocs(collection(this.db, "users"));
            this.stats.totalUsers = usersSnapshot.size;
            
            // Get new signups (last 7 days)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const newSignupsQuery = query(
                collection(this.db, "users"),
                where("createdAt", ">=", oneWeekAgo.toISOString())
            );
            
            const newSignupsSnapshot = await getDocs(newSignupsQuery);
            this.stats.newSignups = newSignupsSnapshot.size;
            
            // Get JEE students count
            const jeeQuery = query(
                collection(this.db, "users"),
                where("examData.JeeMain", "!=", null)
            );
            
            const jeeSnapshot = await getDocs(jeeQuery);
            this.stats.jeeStudents = jeeSnapshot.size;
            
            // Get NEET students count
            const neetQuery = query(
                collection(this.db, "users"),
                where("examData.Neet", "!=", null)
            );
            
            const neetSnapshot = await getDocs(neetQuery);
            this.stats.neetStudents = neetSnapshot.size;
            
            // Get premium users count
            const premiumQuery = query(
                collection(this.db, "users"),
                where("subscription.isActive", "==", true)
            );
            
            const premiumSnapshot = await getDocs(premiumQuery);
            this.stats.premiumUsers = premiumSnapshot.size;
            
            // Update UI with animation
            this.animateStatValues();
            
        } catch (error) {
            console.error('Error loading user statistics:', error);
            this.showToast('Error loading statistics', 'error');
        }
    }

    animateStatValues() {
        const stats = [
            { id: 'total-users', value: this.stats.totalUsers },
            { id: 'new-signups', value: this.stats.newSignups },
            { id: 'premium-users', value: this.stats.premiumUsers },
            { id: 'jee-students', value: this.stats.jeeStudents },
            { id: 'neet-students', value: this.stats.neetStudents }
        ];

        stats.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                this.animateValue(element, 0, stat.value, 1000);
            }
        });
    }

    animateValue(element, start, end, duration) {
        const startTimestamp = performance.now();
        
        const step = (currentTimestamp) => {
            const elapsed = currentTimestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * this.easeOutQuart(progress));
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    async loadRecentUsers() {
        try {
            const recentUsersQuery = query(
                collection(this.db, "users"),
                orderBy("createdAt", "desc"),
                limit(5)
            );
            
            const querySnapshot = await getDocs(recentUsersQuery);
            
            this.recentUsers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderRecentUsersTable();
            
        } catch (error) {
            console.error('Error loading recent users:', error);
            this.showToast('Error loading recent users', 'error');
        }
    }

    renderRecentUsersTable() {
        const tableBody = document.querySelector('#recent-users-table tbody');
        
        if (!tableBody) return;
        
        if (!this.recentUsers.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-state">
                        <i class="fas fa-inbox"></i>
                        No recent users found
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        
        this.recentUsers.forEach(user => {
            const examLabels = this.getExamLabels(user.examData);
            const createdDate = this.formatDate(user.createdAt);
            const statusClass = user.isActive ? 'status-active' : 'status-inactive';
            const statusText = user.isActive ? 'Active' : 'Inactive';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="user-cell">
                        <img src="images/avatar-placeholder.png" alt="${user.name}" class="table-avatar">
                        <div class="user-info">
                            <div class="user-name">${user.name || 'N/A'}</div>
                            <div class="user-id">#${user.id.substring(0, 8)}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.mobileNumber || 'N/A'}</td>
                <td>
                    <div class="exam-tags">
                        ${examLabels.map(exam => `<span class="exam-tag">${exam}</span>`).join('')}
                    </div>
                </td>
                <td>${createdDate}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn view" onclick="dashboard.viewUser('${user.id}')" title="View User">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="table-action-btn edit" onclick="dashboard.editUser('${user.id}')" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn more" onclick="dashboard.showUserActions('${user.id}')" title="More Actions">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    getExamLabels(examData) {
        const labels = [];
        
        if (examData) {
            if (examData.JeeMain) labels.push('JEE Main');
            if (examData.JeeAdvanced) labels.push('JEE Adv');
            if (examData.Mhtcet) labels.push('MHT-CET');
            if (examData.Neet) labels.push('NEET-UG');
        }
        
        return labels.length ? labels : ['None'];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    async loadChartData() {
        try {
            // This would load data for charts
            // For now, we'll use mock data
            this.examDistributionData = [
                { label: 'JEE Main', value: this.stats.jeeStudents, color: '#006B6B' },
                { label: 'NEET-UG', value: this.stats.neetStudents, color: '#D4AF37' },
                { label: 'MHT-CET', value: Math.floor(this.stats.totalUsers * 0.3), color: '#27ae60' },
                { label: 'JEE Advanced', value: Math.floor(this.stats.jeeStudents * 0.6), color: '#3498db' }
            ];
            
            this.userGrowthData = this.generateUserGrowthData();
            
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    }

    generateUserGrowthData() {
        const data = [];
        const now = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = Math.floor(Math.random() * 50) + 20;
            
            data.push({
                label: date.toLocaleDateString('en-US', { month: 'short' }),
                value: value
            });
        }
        
        return data;
    }

    initializeCharts() {
        this.initExamDistributionChart();
        this.initUserGrowthChart();
    }

    initExamDistributionChart() {
        const ctx = document.getElementById('examDistributionChart');
        if (!ctx) return;

        this.charts.examDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.examDistributionData.map(item => item.label),
                datasets: [{
                    data: this.examDistributionData.map(item => item.value),
                    backgroundColor: this.examDistributionData.map(item => item.color),
                    borderWidth: 0,
                    hoverOffset: 10
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
                            usePointStyle: true,
                            font: {
                                family: 'Poppins',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { family: 'Poppins' },
                        bodyFont: { family: 'Poppins' },
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                cutout: '60%'
            }
        });
    }

    initUserGrowthChart() {
        const ctx = document.getElementById('userGrowthChart');
        if (!ctx) return;

        this.charts.userGrowth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.userGrowthData.map(item => item.label),
                datasets: [{
                    label: 'New Users',
                    data: this.userGrowthData.map(item => item.value),
                    borderColor: '#006B6B',
                    backgroundColor: 'rgba(0, 107, 107, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#006B6B',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
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
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
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

    updateChart(chartCard, period) {
        // Update chart based on period selection
        console.log(`Updating chart for period: ${period}`);
        // In a real implementation, you would fetch new data based on the period
    }

    showUserActions(userId) {
        const user = this.recentUsers.find(u => u.id === userId);
        if (!user) return;

        const modal = document.getElementById('userActionModal');
        if (!modal) return;

        // Update modal content
        document.getElementById('modal-user-name').textContent = user.name || 'Unknown User';
        document.getElementById('modal-user-email').textContent = user.email || 'No email';
        document.getElementById('modal-user-status').textContent = user.isActive ? 'Active' : 'Inactive';
        document.getElementById('modal-user-status').className = `user-status ${user.isActive ? 'status-active' : 'status-inactive'}`;

        this.openModal(modal);
    }

    viewUser(userId) {
        window.location.href = `users.html?action=view&id=${userId}`;
    }

    editUser(userId) {
        window.location.href = `users.html?action=edit&id=${userId}`;
    }

    openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    showNotifications() {
        this.showToast('Notifications feature coming soon!', 'info');
    }

    handleSearch(query) {
        if (query.length < 2) return;
        
        console.log(`Searching for: ${query}`);
        // Implement search functionality
        this.showToast(`Searching for "${query}"...`, 'info');
    }

    showLoadingState() {
        // Show loading indicators
        document.querySelectorAll('.stat-value').forEach(el => {
            el.textContent = '--';
        });
    }

    hideLoadingState() {
        // Hide loading indicators
    }

    updateLastUpdatedTime() {
        const timeElement = document.getElementById('last-updated-time');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleString();
        }
    }

    startAutoRefresh() {
        // Refresh data every 5 minutes
        setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);
    }

    saveLayoutPreference() {
        const sidebar = document.querySelector('.sidebar');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }

    loadLayoutPreference() {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        const sidebar = document.querySelector('.sidebar');
        
        if (isCollapsed && sidebar) {
            sidebar.classList.add('collapsed');
        }
    }

    async handleLogout() {
        try {
            await signOut(this.auth);
            this.showToast('Logged out successfully', 'success');
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error logging out', 'error');
        }
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
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

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ProfessionalAdminDashboard();
});

// Add toast styles if not already present
if (!document.querySelector('style[data-toast-styles]')) {
    const toastStyles = document.createElement('style');
    toastStyles.setAttribute('data-toast-styles', 'true');
    toastStyles.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-left: 4px solid #3498db;
            max-width: 400px;
        }
        
        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .toast-success {
            border-left-color: #27ae60;
            color: #27ae60;
        }
        
        .toast-error {
            border-left-color: #e74c3c;
            color: #e74c3c;
        }
        
        .toast-warning {
            border-left-color: #f39c12;
            color: #f39c12;
        }
        
        .toast-info {
            border-left-color: #3498db;
            color: #3498db;
        }
        
        .toast i {
            font-size: 16px;
        }
        
        .toast span {
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
            color: #2c3e50;
        }
        
        .user-cell {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .table-avatar {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #006B6B;
        }
        
        .user-name {
            font-weight: 500;
            color: #2c3e50;
            font-size: 14px;
        }
        
        .user-id {
            font-size: 12px;
            color: #7f8c8d;
        }
        
        .exam-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        
        .exam-tag {
            background: rgba(0, 107, 107, 0.1);
            color: #006B6B;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .table-actions {
            display: flex;
            gap: 5px;
        }
        
        .table-action-btn {
            background: none;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #7f8c8d;
        }
        
        .table-action-btn:hover {
            background: rgba(0, 107, 107, 0.1);
            color: #006B6B;
        }
        
        .table-action-btn.view:hover {
            color: #27ae60;
            background: rgba(39, 174, 96, 0.1);
        }
        
        .table-action-btn.edit:hover {
            color: #3498db;
            background: rgba(52, 152, 219, 0.1);
        }
        
        .table-action-btn.more:hover {
            color: #f39c12;
            background: rgba(243, 156, 18, 0.1);
        }
    `;
    document.head.appendChild(toastStyles);
}
