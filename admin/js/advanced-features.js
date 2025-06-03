// Advanced Dashboard Features
// Add this to your admin-dashboard.js or create a new file for advanced features

class AdvancedDashboardFeatures {
    constructor(dashboardInstance) {
        this.dashboard = dashboardInstance;
        this.filters = {
            dateRange: { start: null, end: null },
            status: 'all',
            userType: 'all',
            examType: 'all'
        };
        this.exportOptions = ['csv', 'excel', 'pdf'];
        this.currentPage = 1;
        this.pageSize = 25;
        this.totalRecords = 0;
        
        this.init();
    }

    init() {
        this.setupAdvancedFilters();
        this.setupDataExport();
        this.setupPagination();
        this.setupBulkActions();
        this.setupRealTimeUpdates();
        this.setupKeyboardShortcuts();
        this.setupDataVisualization();
    }

    setupAdvancedFilters() {
        // Create advanced filter panel
        this.createAdvancedFilterPanel();
        
        // Setup date range picker
        this.setupDateRangePicker();
        
        // Setup filter event listeners
        this.setupFilterEventListeners();
        
        // Setup filter presets
        this.setupFilterPresets();
    }

    createAdvancedFilterPanel() {
        const filterPanel = document.createElement('div');
        filterPanel.className = 'advanced-filters-panel';
        filterPanel.innerHTML = `
            <div class="filter-panel-header">
                <h3><i class="fas fa-filter"></i> Advanced Filters</h3>
                <button class="filter-toggle-btn" id="toggle-filters">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="filter-panel-content" id="filter-content">
                <div class="filter-row">
                    <div class="filter-group">
                        <label for="date-range-preset">Date Range</label>
                        <select id="date-range-preset" class="filter-select">
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="last7days">Last 7 Days</option>
                            <option value="last30days">Last 30 Days</option>
                            <option value="last90days">Last 90 Days</option>
                            <option value="thismonth">This Month</option>
                            <option value="lastmonth">Last Month</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    
                    <div class="filter-group custom-date-range" style="display: none;">
                        <label>Custom Date Range</label>
                        <div class="date-range-inputs">
                            <input type="date" id="start-date" class="filter-input">
                            <span>to</span>
                            <input type="date" id="end-date" class="filter-input">
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label for="user-status-filter">User Status</label>
                        <select id="user-status-filter" class="filter-select">
                            <option value="all">All Users</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                            <option value="verified">Verified Only</option>
                            <option value="unverified">Unverified Only</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="subscription-filter">Subscription</label>
                        <select id="subscription-filter" class="filter-select">
                            <option value="all">All Subscriptions</option>
                            <option value="premium">Premium Users</option>
                            <option value="expired">Expired Premium</option>
                            <option value="free">Free Users</option>
                            <option value="trial">Trial Users</option>
                        </select>
                    </div>
                </div>
                
                <div class="filter-row">
                    <div class="filter-group">
                        <label for="exam-type-filter">Exam Type</label>
                        <select id="exam-type-filter" class="filter-select">
                            <option value="all">All Exams</option>
                            <option value="jee">JEE Students</option>
                            <option value="neet">NEET Students</option>
                            <option value="mhtcet">MHT-CET Students</option>
                            <option value="multiple">Multiple Exams</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="location-filter">Location</label>
                        <select id="location-filter" class="filter-select">
                            <option value="all">All Locations</option>
                            <option value="maharashtra">Maharashtra</option>
                            <option value="delhi">Delhi</option>
                            <option value="karnataka">Karnataka</option>
                            <option value="uttar-pradesh">Uttar Pradesh</option>
                            <option value="other">Other States</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="rank-range">Rank Range</label>
                        <div class="rank-range-inputs">
                            <input type="number" id="min-rank" placeholder="Min" class="filter-input">
                            <span>to</span>
                            <input type="number" id="max-rank" placeholder="Max" class="filter-input">
                        </div>
                    </div>
                </div>
                
                <div class="filter-actions">
                    <button class="btn secondary" id="clear-all-filters">
                        <i class="fas fa-times"></i> Clear All
                    </button>
                    <button class="btn primary" id="apply-filters">
                        <i class="fas fa-search"></i> Apply Filters
                    </button>
                    <button class="btn info" id="save-filter-preset">
                        <i class="fas fa-save"></i> Save Preset
                    </button>
                </div>
            </div>
        `;

        // Insert after page header
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader) {
            pageHeader.parentNode.insertBefore(filterPanel, pageHeader.nextSibling);
        }
    }

    setupDateRangePicker() {
        const dateRangePreset = document.getElementById('date-range-preset');
        const customDateRange = document.querySelector('.custom-date-range');
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');

        dateRangePreset.addEventListener('change', (e) => {
            const value = e.target.value;
            
            if (value === 'custom') {
                customDateRange.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
                this.setDateRangePreset(value);
            }
        });

        // Set default date values
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        endDate.value = today.toISOString().split('T')[0];
        startDate.value = thirtyDaysAgo.toISOString().split('T')[0];
    }

    setDateRangePreset(preset) {
        const today = new Date();
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        let start, end;
        
        switch (preset) {
            case 'today':
                start = end = today;
                break;
            case 'yesterday':
                start = end = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'last7days':
                start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                end = today;
                break;
            case 'last30days':
                start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                end = today;
                break;
            case 'last90days':
                start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                end = today;
                break;
            case 'thismonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = today;
                break;
            case 'lastmonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            default:
                return;
        }
        
        if (start) startDate.value = start.toISOString().split('T')[0];
        if (end) endDate.value = end.toISOString().split('T')[0];
    }

    setupFilterEventListeners() {
        // Filter toggle
        document.getElementById('toggle-filters').addEventListener('click', () => {
            this.toggleFilterPanel();
        });

        // Apply filters
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });

        // Clear filters
        document.getElementById('clear-all-filters').addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Save filter preset
        document.getElementById('save-filter-preset').addEventListener('click', () => {
            this.saveFilterPreset();
        });

        // Real-time filter updates
        const filterInputs = document.querySelectorAll('.filter-select, .filter-input');
        filterInputs.forEach(input => {
            input.addEventListener('change', this.debounce(() => {
                this.updateFilterPreview();
            }, 300));
        });
    }

    setupFilterPresets() {
        // Create preset dropdown
        const presetSelect = document.createElement('select');
        presetSelect.id = 'filter-presets';
        presetSelect.className = 'filter-select';
        presetSelect.innerHTML = `
            <option value="">Select Preset...</option>
            <option value="new-users">New Users (Last 7 Days)</option>
            <option value="premium-users">Premium Users</option>
            <option value="inactive-users">Inactive Users</option>
            <option value="jee-students">JEE Students</option>
            <option value="neet-students">NEET Students</option>
        `;

        // Add to filter panel
        const filterActions = document.querySelector('.filter-actions');
        const presetGroup = document.createElement('div');
        presetGroup.className = 'filter-group preset-group';
        presetGroup.innerHTML = `<label for="filter-presets">Quick Presets</label>`;
        presetGroup.appendChild(presetSelect);
        
        filterActions.parentNode.insertBefore(presetGroup, filterActions);

        // Preset selection handler
        presetSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadFilterPreset(e.target.value);
            }
        });
    }

    loadFilterPreset(presetName) {
        const presets = {
            'new-users': {
                dateRange: 'last7days',
                status: 'active',
                subscription: 'all',
                examType: 'all'
            },
            'premium-users': {
                dateRange: 'all',
                status: 'active',
                subscription: 'premium',
                examType: 'all'
            },
            'inactive-users': {
                dateRange: 'last30days',
                status: 'inactive',
                subscription: 'all',
                examType: 'all'
            },
            'jee-students': {
                dateRange: 'all',
                status: 'all',
                subscription: 'all',
                examType: 'jee'
            },
            'neet-students': {
                dateRange: 'all',
                status: 'all',
                subscription: 'all',
                examType: 'neet'
            }
        };

        const preset = presets[presetName];
        if (preset) {
            // Apply preset values
            document.getElementById('date-range-preset').value = preset.dateRange;
            document.getElementById('user-status-filter').value = preset.status;
            document.getElementById('subscription-filter').value = preset.subscription;
            document.getElementById('exam-type-filter').value = preset.examType;

            // Trigger date range preset
            if (preset.dateRange !== 'custom') {
                this.setDateRangePreset(preset.dateRange);
            }

            // Apply filters
            this.applyFilters();
        }
    }

    setupDataExport() {
        // Create export dropdown
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';
        exportContainer.innerHTML = `
            <div class="export-dropdown">
                <button class="btn secondary export-btn" id="export-toggle">
                    <i class="fas fa-download"></i> Export Data
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="export-menu" id="export-menu">
                    <div class="export-option" data-format="csv">
                        <i class="fas fa-file-csv"></i>
                        <div>
                            <strong>CSV Export</strong>
                            <small>Comma-separated values</small>
                        </div>
                    </div>
                    <div class="export-option" data-format="excel">
                        <i class="fas fa-file-excel"></i>
                        <div>
                            <strong>Excel Export</strong>
                            <small>Microsoft Excel format</small>
                        </div>
                    </div>
                    <div class="export-option" data-format="pdf">
                        <i class="fas fa-file-pdf"></i>
                        <div>
                            <strong>PDF Report</strong>
                            <small>Formatted report</small>
                        </div>
                    </div>
                    <div class="export-option" data-format="json">
                        <i class="fas fa-file-code"></i>
                        <div>
                            <strong>JSON Export</strong>
                            <small>Machine-readable format</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to header actions
        const headerActions = document.querySelector('.header-actions') || 
                             document.querySelector('.page-header');
        if (headerActions) {
            headerActions.appendChild(exportContainer);
        }

        // Setup export functionality
        this.setupExportEventListeners();
    }

    setupExportEventListeners() {
        const exportToggle = document.getElementById('export-toggle');
        const exportMenu = document.getElementById('export-menu');
        const exportOptions = document.querySelectorAll('.export-option');

        // Toggle export menu
        exportToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.classList.toggle('active');
        });

        // Close export menu when clicking outside
        document.addEventListener('click', () => {
            exportMenu.classList.remove('active');
        });

        // Export option selection
        exportOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.exportData(format);
                exportMenu.classList.remove('active');
            });
        });
    }

    async exportData(format) {
        try {
            this.showExportProgress();
            
            // Get filtered data
            const data = await this.getFilteredData();
            
            switch (format) {
                case 'csv':
                    this.exportToCSV(data);
                    break;
                case 'excel':
                    this.exportToExcel(data);
                    break;
                case 'pdf':
                    this.exportToPDF(data);
                    break;
                case 'json':
                    this.exportToJSON(data);
                    break;
            }
            
            this.hideExportProgress();
            this.dashboard.showToast(`Data exported successfully as ${format.toUpperCase()}`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.hideExportProgress();
            this.dashboard.showToast('Export failed. Please try again.', 'error');
        }
    }

    exportToCSV(data) {
        const headers = ['Name', 'Email', 'Mobile', 'Exams', 'Registration Date', 'Status', 'Subscription'];
        const csvContent = [
            headers.join(','),
            ...data.map(user => [
                this.escapeCSV(user.name || ''),
                this.escapeCSV(user.email || ''),
                this.escapeCSV(user.mobileNumber || ''),
                this.escapeCSV(this.getExamLabels(user.examData).join('; ')),
                this.escapeCSV(this.formatDate(user.createdAt)),
                this.escapeCSV(user.isActive ? 'Active' : 'Inactive'),
                this.escapeCSV(this.getSubscriptionStatus(user))
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'nextstep-users.csv', 'text/csv');
    }

    exportToJSON(data) {
        const jsonData = data.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobileNumber,
            exams: this.getExamLabels(user.examData),
            registrationDate: user.createdAt,
            isActive: user.isActive,
            subscription: this.getSubscriptionStatus(user),
            examData: user.examData
        }));

        const jsonContent = JSON.stringify(jsonData, null, 2);
        this.downloadFile(jsonContent, 'nextstep-users.json', 'application/json');
    }

    escapeCSV(field) {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    showExportProgress() {
        // Create or show export progress indicator
        let progressIndicator = document.getElementById('export-progress');
        if (!progressIndicator) {
            progressIndicator = document.createElement('div');
            progressIndicator.id = 'export-progress';
            progressIndicator.className = 'export-progress-overlay';
            progressIndicator.innerHTML = `
                <div class="export-progress-content">
                    <div class="loading-spinner"></div>
                    <p>Preparing export...</p>
                </div>
            `;
            document.body.appendChild(progressIndicator);
        }
        progressIndicator.style.display = 'flex';
    }

    hideExportProgress() {
        const progressIndicator = document.getElementById('export-progress');
        if (progressIndicator) {
            progressIndicator.style.display = 'none';
        }
    }

    async getFilteredData() {
        // In a real implementation, this would make an API call with current filters
        // For now, we'll return the current dashboard data
        return this.dashboard.recentUsers || [];
    }

    getSubscriptionStatus(user) {
        if (user.subscription && user.subscription.isActive) {
            return 'Premium';
        } else if (user.subscription && !user.subscription.isActive) {
            return 'Expired';
        }
        return 'Free';
    }

    getExamLabels(examData) {
        const labels = [];
        if (examData) {
            if (examData.JeeMain) labels.push('JEE Main');
            if (examData.JeeAdvanced) labels.push('JEE Advanced');
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

    setupPagination() {
        // Enhanced pagination will be implemented here
        this.createPaginationControls();
    }

    createPaginationControls() {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'enhanced-pagination';
        paginationContainer.innerHTML = `
            <div class="pagination-info">
                <span>Showing <strong id="page-start">1</strong> to <strong id="page-end">25</strong> of <strong id="total-records">0</strong> entries</span>
            </div>
            <div class="pagination-controls">
                <button class="pagination-btn" id="first-page" title="First Page">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="pagination-btn" id="prev-page" title="Previous Page">
                    <i class="fas fa-angle-left"></i>
                </button>
                <div class="page-numbers" id="page-numbers"></div>
                <button class="pagination-btn" id="next-page" title="Next Page">
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="pagination-btn" id="last-page" title="Last Page">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
            <div class="pagination-size">
                <label>Show</label>
                <select id="page-size-select">
                    <option value="10">10</option>
                    <option value="25" selected>25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </select>
                <span>per page</span>
            </div>
        `;

        // Add after the table
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer && tableContainer.parentNode) {
            tableContainer.parentNode.insertBefore(paginationContainer, tableContainer.nextSibling);
        }
    }

    setupBulkActions() {
        // Implement bulk action functionality
        this.createBulkActionBar();
    }

    createBulkActionBar() {
        const bulkActionBar = document.createElement('div');
        bulkActionBar.className = 'bulk-action-bar';
        bulkActionBar.id = 'bulk-action-bar';
        bulkActionBar.style.display = 'none';
        bulkActionBar.innerHTML = `
            <div class="bulk-action-content">
                <span class="bulk-selection-count">
                    <strong id="selected-count">0</strong> items selected
                </span>
                <div class="bulk-actions">
                    <button class="bulk-action-btn primary" data-action="activate">
                        <i class="fas fa-check"></i> Activate
                    </button>
                    <button class="bulk-action-btn warning" data-action="deactivate">
                        <i class="fas fa-ban"></i> Deactivate
                    </button>
                    <button class="bulk-action-btn info" data-action="export">
                        <i class="fas fa-download"></i> Export Selected
                    </button>
                    <button class="bulk-action-btn danger" data-action="delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
                <button class="bulk-action-close" id="close-bulk-actions">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add after page header
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader && pageHeader.parentNode) {
            pageHeader.parentNode.insertBefore(bulkActionBar, pageHeader.nextSibling);
        }
    }

    setupRealTimeUpdates() {
        // Setup WebSocket or polling for real-time updates
        this.setupUpdatePolling();
    }

    setupUpdatePolling() {
        // Poll for updates every 30 seconds
        setInterval(() => {
            this.checkForUpdates();
        }, 30000);
    }

    async checkForUpdates() {
        try {
            // Check for new data
            const lastUpdate = localStorage.getItem('lastDashboardUpdate');
            const now = Date.now();
            
            if (!lastUpdate || (now - parseInt(lastUpdate)) > 30000) {
                await this.dashboard.loadUserStatistics();
                localStorage.setItem('lastDashboardUpdate', now.toString());
            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Ctrl/Cmd + E for export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                document.getElementById('export-toggle').click();
            }
            
            // Escape to close modals/panels
            if (e.key === 'Escape') {
                this.closeAllPanels();
            }
        });
    }

    setupDataVisualization() {
        // Enhanced chart interactions
        this.setupChartInteractions();
    }

    setupChartInteractions() {
        // Add chart download functionality
        const chartCards = document.querySelectorAll('.chart-card');
        chartCards.forEach(card => {
            this.addChartDownloadButton(card);
        });
    }

    addChartDownloadButton(chartCard) {
        const header = chartCard.querySelector('.chart-header');
        if (header) {
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'chart-download-btn';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            downloadBtn.title = 'Download Chart';
            
            downloadBtn.addEventListener('click', () => {
                this.downloadChart(chartCard);
            });
            
            header.appendChild(downloadBtn);
        }
    }

    downloadChart(chartCard) {
        const canvas = chartCard.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'chart.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    }

    // Utility methods
    toggleFilterPanel() {
        const filterContent = document.getElementById('filter-content');
        const toggleBtn = document.querySelector('.filter-toggle-btn i');
        
        filterContent.classList.toggle('expanded');
        toggleBtn.classList.toggle('fa-chevron-down');
        toggleBtn.classList.toggle('fa-chevron-up');
    }

    applyFilters() {
        // Collect filter values
        this.filters = {
            dateRange: {
                start: document.getElementById('start-date').value,
                end: document.getElementById('end-date').value
            },
            status: document.getElementById('user-status-filter').value,
            subscription: document.getElementById('subscription-filter').value,
            examType: document.getElementById('exam-type-filter').value,
            location: document.getElementById('location-filter').value,
            rankRange: {
                min: document.getElementById('min-rank').value,
                max: document.getElementById('max-rank').value
            }
        };

        // Apply filters to dashboard data
        this.filterDashboardData();
        
        // Update URL with filter parameters
        this.updateURLParams();
        
        // Show applied filters indicator
        this.showAppliedFilters();
    }

    clearAllFilters() {
        // Reset all filter inputs
        document.querySelectorAll('.filter-select, .filter-input').forEach(input => {
            input.value = input.type === 'select-one' ? 'all' : '';
        });
        
        // Hide custom date range
        document.querySelector('.custom-date-range').style.display = 'none';
        
        // Clear filters object
        this.filters = {
            dateRange: { start: null, end: null },
            status: 'all',
            subscription: 'all',
            examType: 'all',
            location: 'all',
            rankRange: { min: null, max: null }
        };
        
        // Reload original data
        this.dashboard.loadDashboardData();
        
        // Update URL
        this.updateURLParams();
        
        // Hide applied filters
        this.hideAppliedFilters();
    }

    filterDashboardData() {
        // Filter implementation would go here
        // This would typically make an API call with the filter parameters
        console.log('Applying filters:', this.filters);
        
        // For now, just show a loading state and reload data
        this.dashboard.loadDashboardData();
    }

    updateURLParams() {
        const params = new URLSearchParams();
        
        Object.entries(this.filters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                if (typeof value === 'object') {
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        if (subValue) {
                            params.set(`${key}_${subKey}`, subValue);
                        }
                    });
                } else {
                    params.set(key, value);
                }
            }
        });
        
        const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newURL);
    }

    showAppliedFilters() {
        let indicator = document.querySelector('.applied-filters-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'applied-filters-indicator';
            
            const filterPanel = document.querySelector('.advanced-filters-panel');
            if (filterPanel && filterPanel.parentNode) {
                filterPanel.parentNode.insertBefore(indicator, filterPanel.nextSibling);
            }
        }
        
        const activeFilters = this.getActiveFiltersText();
        indicator.innerHTML = `
            <div class="filter-indicator-content">
                <i class="fas fa-filter"></i>
                <span>Filters applied: ${activeFilters}</span>
                <button class="clear-filters-btn" onclick="advancedFeatures.clearAllFilters()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        indicator.style.display = 'block';
    }

    hideAppliedFilters() {
        const indicator = document.querySelector('.applied-filters-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    getActiveFiltersText() {
        const activeFilters = [];
        
        if (this.filters.status !== 'all') {
            activeFilters.push(`Status: ${this.filters.status}`);
        }
        
        if (this.filters.subscription !== 'all') {
            activeFilters.push(`Subscription: ${this.filters.subscription}`);
        }
        
        if (this.filters.examType !== 'all') {
            activeFilters.push(`Exam: ${this.filters.examType}`);
        }
        
        if (this.filters.dateRange.start || this.filters.dateRange.end) {
            activeFilters.push('Date range');
        }
        
        return activeFilters.length > 0 ? activeFilters.join(', ') : 'None';
    }

    closeAllPanels() {
        // Close export menu
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu) {
            exportMenu.classList.remove('active');
        }
        
        // Close any open modals
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    updateFilterPreview() {
        // Show preview of filter results
        console.log('Filter preview updated');
    }

    saveFilterPreset() {
        const presetName = prompt('Enter a name for this filter preset:');
        if (presetName) {
            const presets = JSON.parse(localStorage.getItem('filterPresets') || '{}');
            presets[presetName] = { ...this.filters };
            localStorage.setItem('filterPresets', JSON.stringify(presets));
            
            this.dashboard.showToast(`Filter preset "${presetName}" saved successfully`, 'success');
        }
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

// Initialize advanced features when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for dashboard to be initialized
    const checkDashboard = setInterval(() => {
        if (window.dashboard) {
            window.advancedFeatures = new AdvancedDashboardFeatures(window.dashboard);
            clearInterval(checkDashboard);
        }
    }, 100);
});

export default AdvancedDashboardFeatures;
