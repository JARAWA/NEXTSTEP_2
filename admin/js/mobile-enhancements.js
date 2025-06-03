// Mobile Responsive Enhancements for Admin Dashboard
// Add this to your admin-dashboard.js file or create a separate mobile.js file

class MobileResponsiveEnhancements {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.sidebarOpen = false;
        this.init();
    }

    init() {
        this.setupMobileNavigation();
        this.setupTouchGestures();
        this.setupResponsiveElements();
        this.setupMobileSearch();
        this.setupMobileCharts();
        this.handleOrientationChange();
        
        // Listen for window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }

    setupMobileNavigation() {
        // Create mobile navigation overlay
        this.createMobileOverlay();
        
        // Enhanced sidebar toggle for mobile
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileSidebar();
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (this.isMobile && this.sidebarOpen) {
                const sidebar = document.querySelector('.sidebar');
                const sidebarToggle = document.getElementById('sidebar-toggle');
                
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    this.closeMobileSidebar();
                }
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobile && this.sidebarOpen) {
                this.closeMobileSidebar();
            }
        });
    }

    createMobileOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.innerHTML = '';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            this.closeMobileSidebar();
        });
    }

    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        
        if (this.sidebarOpen) {
            this.closeMobileSidebar();
        } else {
            this.openMobileSidebar();
        }
    }

    openMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.sidebarOpen = true;

        // Animate sidebar in
        requestAnimationFrame(() => {
            sidebar.style.transform = 'translateX(0)';
        });
    }

    closeMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        this.sidebarOpen = false;

        // Animate sidebar out
        sidebar.style.transform = '';
    }

    setupTouchGestures() {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        // Swipe to open/close sidebar
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            const diffX = currentX - startX;
            const threshold = 50;

            // Swipe right from left edge to open sidebar
            if (startX < 50 && diffX > threshold && !this.sidebarOpen) {
                this.openMobileSidebar();
            }
            
            // Swipe left to close sidebar
            if (diffX < -threshold && this.sidebarOpen) {
                this.closeMobileSidebar();
            }

            isDragging = false;
        });
    }

    setupResponsiveElements() {
        // Make tables horizontally scrollable on mobile
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            if (!table.parentElement.classList.contains('table-container')) {
                const container = document.createElement('div');
                container.className = 'table-container mobile-scroll';
                table.parentNode.insertBefore(container, table);
                container.appendChild(table);
            }
        });

        // Optimize stat cards for mobile
        this.optimizeStatCards();
        
        // Optimize action buttons for mobile
        this.optimizeActionButtons();
    }

    optimizeStatCards() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const icon = card.querySelector('.stat-icon');
            const content = card.querySelector('.stat-content');
            
            if (this.isMobile && icon && content) {
                // Adjust layout for mobile
                card.style.flexDirection = 'column';
                card.style.textAlign = 'center';
                icon.style.marginBottom = '15px';
            }
        });
    }

    optimizeActionButtons() {
        const actionButtons = document.querySelectorAll('.table-action-btn');
        actionButtons.forEach(btn => {
            if (this.isMobile) {
                // Add touch-friendly sizing
                btn.style.minWidth = '40px';
                btn.style.minHeight = '40px';
                btn.style.fontSize = '14px';
            }
        });
    }

    setupMobileSearch() {
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) return;

        // Create mobile search overlay
        const mobileSearchOverlay = document.createElement('div');
        mobileSearchOverlay.className = 'mobile-search-overlay';
        mobileSearchOverlay.innerHTML = `
            <div class="mobile-search-container">
                <div class="mobile-search-header">
                    <button class="mobile-search-back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <input type="text" class="mobile-search-input" placeholder="Search...">
                </div>
                <div class="mobile-search-results"></div>
            </div>
        `;
        document.body.appendChild(mobileSearchOverlay);

        // Mobile search activation
        if (this.isMobile) {
            searchInput.addEventListener('focus', (e) => {
                e.preventDefault();
                this.openMobileSearch();
            });
        }

        // Mobile search close
        const backBtn = mobileSearchOverlay.querySelector('.mobile-search-back');
        backBtn.addEventListener('click', () => {
            this.closeMobileSearch();
        });
    }

    openMobileSearch() {
        const overlay = document.querySelector('.mobile-search-overlay');
        const input = overlay.querySelector('.mobile-search-input');
        
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            input.focus();
        }, 300);
    }

    closeMobileSearch() {
        const overlay = document.querySelector('.mobile-search-overlay');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    setupMobileCharts() {
        // Optimize charts for mobile viewing
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach(container => {
            if (this.isMobile) {
                // Reduce chart height on mobile
                container.style.height = '250px';
                
                // Make chart responsive
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    canvas.style.maxHeight = '220px';
                }
            }
        });

        // Optimize chart controls for mobile
        const chartControls = document.querySelectorAll('.chart-controls');
        chartControls.forEach(controls => {
            if (this.isMobile) {
                controls.style.flexWrap = 'wrap';
                controls.style.gap = '5px';
                
                const filters = controls.querySelectorAll('.chart-filter');
                filters.forEach(filter => {
                    filter.style.fontSize = '11px';
                    filter.style.padding = '5px 8px';
                });
            }
        });
    }

    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
                
                // Force chart resize if needed
                if (window.dashboard && window.dashboard.charts) {
                    Object.values(window.dashboard.charts).forEach(chart => {
                        if (chart && chart.resize) {
                            chart.resize();
                        }
                    });
                }
            }, 300);
        });
    }

    handleResize() {
        const wasNotMobile = !this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        // If switching from desktop to mobile or vice versa
        if (wasNotMobile && this.isMobile) {
            this.setupResponsiveElements();
            this.setupMobileCharts();
            this.closeMobileSidebar();
        } else if (!wasNotMobile && !this.isMobile) {
            this.closeMobileSidebar();
            this.resetDesktopElements();
        }
        
        // Update layout
        this.updateLayout();
    }

    resetDesktopElements() {
        // Reset stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.style.flexDirection = '';
            card.style.textAlign = '';
            
            const icon = card.querySelector('.stat-icon');
            if (icon) {
                icon.style.marginBottom = '';
            }
        });

        // Reset action buttons
        const actionButtons = document.querySelectorAll('.table-action-btn');
        actionButtons.forEach(btn => {
            btn.style.minWidth = '';
            btn.style.minHeight = '';
            btn.style.fontSize = '';
        });

        // Reset charts
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            container.style.height = '';
            
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.maxHeight = '';
            }
        });
    }

    updateLayout() {
        // Update any layout-dependent calculations
        this.optimizeTableDisplay();
        this.updateModalSizing();
    }

    optimizeTableDisplay() {
        const tables = document.querySelectorAll('.data-table');
        
        tables.forEach(table => {
            if (this.isMobile) {
                // Hide less important columns on mobile
                const headers = table.querySelectorAll('th');
                const rows = table.querySelectorAll('tbody tr');
                
                headers.forEach((header, index) => {
                    const headerText = header.textContent.toLowerCase();
                    
                    // Hide certain columns on mobile
                    if (headerText.includes('registered') || 
                        headerText.includes('mobile') ||
                        (headerText.includes('exams') && headers.length > 5)) {
                        
                        header.style.display = 'none';
                        
                        rows.forEach(row => {
                            const cell = row.children[index];
                            if (cell) {
                                cell.style.display = 'none';
                            }
                        });
                    }
                });
            } else {
                // Show all columns on desktop
                const allCells = table.querySelectorAll('th, td');
                allCells.forEach(cell => {
                    cell.style.display = '';
                });
            }
        });
    }

    updateModalSizing() {
        const modals = document.querySelectorAll('.modal-content');
        
        modals.forEach(modal => {
            if (this.isMobile) {
                modal.style.margin = '20px';
                modal.style.width = 'calc(100% - 40px)';
                modal.style.maxHeight = 'calc(100vh - 40px)';
            } else {
                modal.style.margin = '';
                modal.style.width = '';
                modal.style.maxHeight = '';
            }
        });
    }

    // Utility function
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

// CSS for mobile enhancements - add to your CSS file
const mobileEnhancementStyles = `
/* Mobile Overlay */
.mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.mobile-overlay.active {
    opacity: 1;
    visibility: visible;
}

/* Mobile Sidebar */
@media (max-width: 768px) {
    .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        z-index: 1001;
    }
    
    .sidebar.mobile-open {
        transform: translateX(0);
    }
    
    .main-content {
        margin-left: 0;
    }
}

/* Mobile Search Overlay */
.mobile-search-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    z-index: 2000;
    transform: translateY(100%);
    transition: transform 0.3s ease;
}

.mobile-search-overlay.active {
    transform: translateY(0);
}

.mobile-search-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.mobile-search-header {
    display: flex;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--bg-light);
    gap: 15px;
}

.mobile-search-back {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text-primary);
    cursor: pointer;
    padding: 10px;
    border-radius: 50%;
    transition: all 0.2s ease;
}

.mobile-search-back:hover {
    background: var(--bg-light);
}

.mobile-search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    color: var(--text-primary);
    background: transparent;
}

.mobile-search-results {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
}

/* Mobile Table Scroll */
.table-container.mobile-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.table-container.mobile-scroll::-webkit-scrollbar {
    height: 3px;
}

.table-container.mobile-scroll::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 3px;
}

/* Mobile-specific table styles */
@media (max-width: 768px) {
    .data-table {
        font-size: 12px;
    }
    
    .data-table th,
    .data-table td {
        padding: 8px 6px;
        white-space: nowrap;
    }
    
    .user-cell {
        min-width: 120px;
    }
    
    .table-avatar {
        width: 25px;
        height: 25px;
    }
    
    .user-name {
        font-size: 12px;
    }
    
    .user-id {
        font-size: 10px;
    }
    
    .exam-tags {
        max-width: 80px;
    }
    
    .exam-tag {
        font-size: 9px;
        padding: 1px 4px;
    }
    
    .status-badge {
        font-size: 9px;
        padding: 3px 6px;
    }
    
    .table-actions {
        min-width: 80px;
    }
}

/* Touch-friendly elements */
@media (max-width: 768px) {
    .chart-filter {
        min-height: 32px;
        min-width: 50px;
    }
    
    .table-action-btn {
        min-width: 32px;
        min-height: 32px;
    }
    
    .nav-link {
        min-height: 44px;
    }
    
    .btn {
        min-height: 44px;
    }
}

/* Loading state for mobile */
.mobile-loading {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    z-index: 9999;
    text-align: center;
}

.mobile-loading .loading-spinner {
    margin: 0 auto 15px;
}

/* Mobile modal adjustments */
@media (max-width: 768px) {
    .modal-content {
        margin: 10px;
        width: calc(100% - 20px);
        max-height: calc(100vh - 20px);
        border-radius: 12px 12px 0 0;
    }
    
    .modal-body {
        padding: 20px 15px;
    }
    
    .modal-actions {
        grid-template-columns: 1fr;
        gap: 10px;
    }
    
    .user-info-card {
        flex-direction: column;
        text-align: center;
        gap: 10px;
    }
    
    .user-avatar {
        width: 50px;
        height: 50px;
    }
}
`;

// Add mobile enhancement styles to the page
if (!document.querySelector('[data-mobile-styles]')) {
    const style = document.createElement('style');
    style.setAttribute('data-mobile-styles', 'true');
    style.textContent = mobileEnhancementStyles;
    document.head.appendChild(style);
}

// Initialize mobile enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileEnhancements = new MobileResponsiveEnhancements();
});

// Export for use in other modules
export default MobileResponsiveEnhancements;
