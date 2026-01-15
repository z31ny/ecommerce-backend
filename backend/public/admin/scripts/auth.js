// ===== AUTHENTICATION & AUTHORIZATION =====

const API_BASE = '/api/admin';

// Store JWT token
function getToken() {
    return localStorage.getItem('freezyBiteAdminToken');
}

function setToken(token) {
    localStorage.setItem('freezyBiteAdminToken', token);
}

function removeToken() {
    localStorage.removeItem('freezyBiteAdminToken');
}

// API fetch wrapper with auth header
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Token expired or invalid
        removeToken();
        localStorage.removeItem('freezyBiteCurrentUser');
        localStorage.removeItem('freezyBiteLoggedIn');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }

    return response;
}

// Page access mapping
const pageAccess = {
    'index.html': 'overview',
    'content.html': 'content',
    'products.html': 'products',
    'orders.html': 'orders',
    'customers.html': 'customers',
    'messages.html': 'messages',
    'analytics.html': 'analytics',
    'inventory.html': 'inventory',
    'employees.html': 'employees',
    'users.html': 'users',
    'trash.html': 'trash',
    'settings.html': 'settings',
    'offers.html': 'offers',
    'my-account.html': 'my-account'
};

// Get current user from localStorage (cached from login)
function getCurrentUser() {
    const userStr = localStorage.getItem('freezyBiteCurrentUser');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

// Check if user is logged in
function isLoggedIn() {
    return getToken() !== null && getCurrentUser() !== null;
}

// Check if user is the owner (Super Admin)
function isOwner() {
    const user = getCurrentUser();
    return user && (user.isOwner === true || user.role === 'Super Admin');
}

// Check if user can delete data (only Owner)
function canDelete() {
    return isOwner();
}

// Check if user has access to a page
function hasAccess(pageName) {
    const user = getCurrentUser();
    if (!user) return false;

    // Everyone has access to their own account page
    if (pageName === 'my-account.html') return true;

    // Super Admin and Admin have access to everything
    if (user.access && user.access.includes('all')) return true;

    const pageKey = pageAccess[pageName];
    return user.access && user.access.includes(pageKey);
}

// Login function - calls backend API
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store token and user
        setToken(data.token);
        localStorage.setItem('freezyBiteCurrentUser', JSON.stringify(data.user));
        localStorage.setItem('freezyBiteLoggedIn', 'true');

        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Check authentication and redirect if needed
async function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }

    // Verify token is still valid
    try {
        const response = await apiFetch('/auth/me');
        if (!response.ok) {
            logout();
            return false;
        }

        // Update cached user data
        const user = await response.json();
        localStorage.setItem('freezyBiteCurrentUser', JSON.stringify(user));
    } catch (error) {
        console.error('Auth check failed:', error);
        logout();
        return false;
    }

    // Get current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Check access
    if (!hasAccess(currentPage)) {
        const user = getCurrentUser();
        if (user && user.access && user.access.includes('all')) {
            window.location.href = 'index.html';
        } else if (user && user.access && user.access.includes('overview')) {
            window.location.href = 'index.html';
        } else if (user && user.access && user.access.includes('products')) {
            window.location.href = 'products.html';
        } else {
            window.location.href = 'login.html';
        }
        return false;
    }

    return true;
}

// Logout function
function logout() {
    removeToken();
    localStorage.removeItem('freezyBiteCurrentUser');
    localStorage.removeItem('freezyBiteLoggedIn');
    window.location.href = 'login.html';
}

// Update sidebar based on user access
function updateSidebarAccess() {
    const user = getCurrentUser();
    if (!user) return;

    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (!href) return;

        const pageName = href.split('/').pop();

        if (!hasAccess(pageName)) {
            item.parentElement.style.display = 'none';
        }
    });
}

// Update user profile in sidebar and header
function updateUserProfile() {
    const user = getCurrentUser();
    if (!user) return;

    // Update sidebar user profile
    const sidebarUserAvatar = document.querySelector('.sidebar-footer .user-avatar');
    const sidebarUserName = document.querySelector('.sidebar-footer .user-info h4');
    const sidebarUserEmail = document.querySelector('.sidebar-footer .user-info p');

    if (sidebarUserAvatar) sidebarUserAvatar.src = user.avatar;
    if (sidebarUserName) sidebarUserName.textContent = user.name;
    if (sidebarUserEmail) sidebarUserEmail.textContent = user.email;

    // Update header avatar
    const headerAvatar = document.querySelector('.header-avatar');
    if (headerAvatar) {
        headerAvatar.src = user.avatar;
        headerAvatar.style.cursor = 'pointer';
        headerAvatar.onclick = function () {
            window.location.href = 'my-account.html';
        };
        headerAvatar.title = 'My Account';
    }

    // Make sidebar user profile clickable
    const userProfile = document.querySelector('.sidebar-footer .user-profile');
    if (userProfile) {
        userProfile.style.cursor = 'pointer';
        userProfile.onclick = function () {
            window.location.href = 'my-account.html';
        };
        userProfile.title = 'My Account Settings';
    }

    // Add role badge to sidebar
    const userInfo = document.querySelector('.sidebar-footer .user-info');
    if (userInfo && !userInfo.querySelector('.role-badge')) {
        const roleBadge = document.createElement('span');
        roleBadge.className = 'role-badge';
        roleBadge.style.cssText = 'display: inline-block; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.65rem; font-weight: 600; margin-top: 0.25rem;';

        switch (user.role) {
            case 'Super Admin':
                roleBadge.style.background = '#fee2e2';
                roleBadge.style.color = '#dc2626';
                break;
            case 'Admin':
                roleBadge.style.background = '#e0e7ff';
                roleBadge.style.color = '#4f46e5';
                break;
            case 'Manager':
                roleBadge.style.background = '#fef3c7';
                roleBadge.style.color = '#d97706';
                break;
            case 'Staff':
                roleBadge.style.background = '#d1fae5';
                roleBadge.style.color = '#059669';
                break;
        }

        roleBadge.textContent = user.role;
        userInfo.appendChild(roleBadge);
    }
}

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = function (e) {
            e.preventDefault();
            logout();
        };
    }
}

// Initialize authentication
async function initAuth() {
    // Check if on login page
    if (window.location.pathname.includes('login.html')) {
        return;
    }

    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return;
    }

    // Update UI based on user
    updateSidebarAccess();
    updateUserProfile();
    setupLogoutButton();
}

// Run on page load
document.addEventListener('DOMContentLoaded', initAuth);

// Export functions
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.isOwner = isOwner;
window.canDelete = canDelete;
window.hasAccess = hasAccess;
window.logout = logout;
window.login = login;
window.initAuth = initAuth;
window.apiFetch = apiFetch;
