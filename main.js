// Global Variables
let currentUser = null;
let currentOpenSubmenu = null;
let sidebarCollapsed = false;
let currentModule = 'dashboard';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadUserInfo();
    setupEventListeners();
    setupSidebarToggleOnResize();
    loadModule('dashboard');
    
    // Check if sidebar should be collapsed based on screen size
    if (window.innerWidth <= 768) {
        sidebarCollapsed = true;
        document.getElementById('sidebar').classList.add('collapsed');
    }
}

function setupEventListeners() {
    // Close user dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const userMenu = document.querySelector('.user-menu');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userMenu && !userMenu.contains(event.target)) {
            if (userDropdown) userDropdown.classList.remove('show');
        }
    });
    
    // Handle escape key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAllModals();
        }
    });
}

function setupSidebarToggleOnResize() {
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebarCollapsed) {
            // Do nothing, keep collapsed state
        } else if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('show-mobile');
        }
    });
}

function closeAllModals() {
    // Close user dropdown
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) userDropdown.classList.remove('show');
    
    // Close any open action dropdowns
    closeActionDropdowns();
    
    // Close any open modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    });
}

function closeActionDropdowns() {
    const portals = document.querySelectorAll('.action-dropdown-portal');
    portals.forEach(portal => {
        if (portal) {
            portal.innerHTML = '';
            portal.style.display = 'none';
        }
    });
    window.__portalOpen = false;
}

// ============================================
// USER INFORMATION
// ============================================

function loadUserInfo() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = 'Loading...';
    }
    
    API.getUserInfo()
        .then(response => {
            if (response && response.success !== false) {
                currentUser = response;
                const userNameSpan = document.getElementById('userName');
                if (userNameSpan) {
                    userNameSpan.textContent = response.name || response.email || 'User';
                }
            } else {
                throw new Error('No user data');
            }
        })
        .catch(error => {
            console.error('Error loading user:', error);
            const userNameSpan = document.getElementById('userName');
            if (userNameSpan) {
                userNameSpan.textContent = 'Guest';
            }
        });
}

// ============================================
// UI HELPERS
// ============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('show-mobile');
    } else {
        sidebar.classList.toggle('collapsed');
        if (mainContent) {
            mainContent.classList.toggle('expanded');
        }
        sidebarCollapsed = sidebar.classList.contains('collapsed');
        
        // Close all submenus when sidebar is collapsed
        if (sidebarCollapsed) {
            document.querySelectorAll('.submenu').forEach(menu => {
                menu.classList.remove('show');
            });
            document.querySelectorAll('.dropdown-icon').forEach(icon => {
                icon.classList.remove('rotated');
            });
            currentOpenSubmenu = null;
        }
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function toggleSubmenu(submenuId) {
    if (sidebarCollapsed && window.innerWidth > 768) return;
    
    const submenu = document.getElementById(submenuId);
    const icon = document.getElementById(submenuId.replace('Submenu', 'Icon'));
    
    // Close other submenus
    if (currentOpenSubmenu && currentOpenSubmenu !== submenu) {
        currentOpenSubmenu.classList.remove('show');
        const prevIcon = document.getElementById(currentOpenSubmenu.id.replace('Submenu', 'Icon'));
        if (prevIcon) prevIcon.classList.remove('rotated');
    }
    
    if (submenu) {
        submenu.classList.toggle('show');
        if (icon) icon.classList.toggle('rotated');
        currentOpenSubmenu = submenu.classList.contains('show') ? submenu : null;
    }
}

function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        const messageEl = overlay.querySelector('p');
        if (messageEl) messageEl.textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            max-width: 350px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);
        
        // Add animation style if not present
        if (!document.querySelector('#toast-animation-style')) {
            const style = document.createElement('style');
            style.id = 'toast-animation-style';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Set background color based on type
    const colors = {
        success: '#06d6a0',
        error: '#ef476f',
        warning: '#ffd166',
        info: '#4361ee'
    };
    toast.style.backgroundColor = colors[type] || colors.success;
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.animation = 'slideInRight 0.3s ease';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 3000);
}

function showError(message) {
    showToast(message, 'error');
    console.error(message);
}

function showSuccess(message) {
    showToast(message, 'success');
}

function closeSidebarMobile() {
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('show-mobile');
        }
    }
}

// ============================================
// MODULE LOADING
// ============================================

async function loadModule(moduleName) {
    if (currentModule === moduleName) return;
    
    showLoading('Loading module...');
    currentModule = moduleName;
    
    // Update active state in sidebar
    updateActiveMenuItem(moduleName);
    
    const modules = {
        'dashboard': { file: 'modules/dashboard.html', init: 'initDashboard' },
        'paymentVoucher': { file: 'modules/payment-voucher.html', init: 'initPVModule' },
        'inventoryAdd': { file: 'modules/add-inventory.html', init: 'initInventoryModule' },
        'inventoryReport': { file: 'modules/inventory-report.html', init: 'initInventoryReportModule' },
        'addAsset': { file: 'modules/add-asset.html', init: 'initAssetModule' },
        'viewAssetRegister': { file: 'modules/asset-register.html', init: 'initAssetRegisterModule' },
        'investmentAdd': { file: 'modules/add-investment.html', init: 'initInvestmentModule' },
        'investmentReport': { file: 'modules/investment-report.html', init: 'initInvestmentReportModule' }
    };
    
    const config = modules[moduleName];
    if (!config) {
        showError('Module not found: ' + moduleName);
        hideLoading();
        return;
    }
    
    try {
        const response = await fetch(config.file);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = await response.text();
        
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `<div class="content-wrapper">${html}</div>`;
        }
        
        // Initialize module scripts after DOM is updated
        setTimeout(() => {
            if (window[config.init] && typeof window[config.init] === 'function') {
                try {
                    window[config.init]();
                } catch (err) {
                    console.error(`Error initializing ${moduleName}:`, err);
                }
            }
            hideLoading();
        }, 150);
        
        closeSidebarMobile();
        
    } catch (error) {
        console.error('Error loading module:', error);
        showError('Could not load module. Please try again.');
        hideLoading();
    }
}

function updateActiveMenuItem(moduleName) {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Map module names to menu item onclick functions
    const moduleMap = {
        'dashboard': 'dashboard',
        'paymentVoucher': 'paymentVoucher',
        'inventoryAdd': 'inventoryAdd',
        'inventoryReport': 'inventoryReport',
        'addAsset': 'addAsset',
        'viewAssetRegister': 'viewAssetRegister',
        'investmentAdd': 'investmentAdd',
        'investmentReport': 'investmentReport'
    };
    
    // Find and activate the corresponding menu item
    const targetModule = moduleMap[moduleName];
    if (targetModule) {
        document.querySelectorAll('.menu-item').forEach(item => {
            const onclickAttr = item.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${targetModule}'`)) {
                item.classList.add('active');
            }
        });
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '0.00';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0.00';
    return numValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function formatDateForInput(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getToday() {
    return formatDateForInput(new Date());
}

function getStartOfYear() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    return formatDateForInput(startOfYear);
}

function debounce(func, wait) {
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

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

function initDashboard() {
    console.log('Dashboard initialized');
    // Update welcome message with user name if available
    const welcomeMsg = document.getElementById('dashboardWelcomeMessage');
    if (welcomeMsg && currentUser) {
        const userName = currentUser.name || currentUser.email || 'User';
        welcomeMsg.innerHTML = `Welcome back, <strong>${userName}</strong>! Select a module from the sidebar to begin managing your accounts.`;
    }
}

// ============================================
// PLACEHOLDER FUNCTIONS FOR MODULES
// ============================================

function initPVModule() {
    console.log('Payment Voucher module loaded');
    // Will be overridden by pv.js
}

function initInventoryModule() {
    console.log('Inventory module loaded');
    // Will be overridden by inventory.js
}

function initInventoryReportModule() {
    console.log('Inventory Report module loaded');
    // Will be overridden by inventory-report.js
}

function initAssetModule() {
    console.log('Asset module loaded');
    // Will be overridden by assets.js
}

function initAssetRegisterModule() {
    console.log('Asset Register module loaded');
    // Will be overridden by asset-register.js
}

function initInvestmentModule() {
    console.log('Investment module loaded');
    // Will be overridden by investments.js
}

function initInvestmentReportModule() {
    console.log('Investment Report module loaded');
    // Will be overridden by investment-report.js
}

// ============================================
// USER FUNCTIONS
// ============================================

function showProfile() {
    showToast('Profile feature coming soon', 'info');
}

function showSettings() {
    showToast('Settings feature coming soon', 'info');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear any stored session data
        currentUser = null;
        showSuccess('Logged out successfully');
        // Reload to reset state
        window.location.reload();
    }
}

// ============================================
// EXPORT FOR MODULES
// ============================================

// Make functions available globally
window.loadModule = loadModule;
window.toggleSidebar = toggleSidebar;
window.toggleUserMenu = toggleUserMenu;
window.toggleSubmenu = toggleSubmenu;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;
window.showError = showError;
window.showSuccess = showSuccess;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateForInput = formatDateForInput;
window.getToday = getToday;
window.getStartOfYear = getStartOfYear;
window.debounce = debounce;
window.capitalize = capitalize;
window.showProfile = showProfile;
window.showSettings = showSettings;
window.logout = logout;

// Make API available globally for modules
window.API = API;

// Module initializers
window.initDashboard = initDashboard;
window.initPVModule = initPVModule;
window.initInventoryModule = initInventoryModule;
window.initInventoryReportModule = initInventoryReportModule;
window.initAssetModule = initAssetModule;
window.initAssetRegisterModule = initAssetRegisterModule;
window.initInvestmentModule = initInvestmentModule;
window.initInvestmentReportModule = initInvestmentReportModule;
