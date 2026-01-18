// ===== API HELPERS =====
// These functions connect the dashboard to the backend database

const DashboardAPI = {
    token: localStorage.getItem('freezyBiteAdminToken'),

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(endpoint, { ...options, headers });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'API request failed');
        }
        return response.json();
    },

    // Products
    async getProducts() { return this.request('/api/admin/products?limit=1000'); },
    async createProduct(data) { return this.request('/api/admin/products', { method: 'POST', body: JSON.stringify(data) }); },
    async updateProduct(id, data) { return this.request(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async deleteProduct(id) { return this.request(`/api/admin/products/${id}`, { method: 'DELETE' }); },

    // Orders
    async getOrders() { return this.request('/api/admin/orders'); },
    async updateOrder(id, data) { return this.request(`/api/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async deleteOrder(id) { return this.request(`/api/admin/orders/${id}`, { method: 'DELETE' }); },

    // Customers
    async getCustomers() { return this.request('/api/admin/customers'); },

    // Offers  
    async getOffers(showAll = false) { return this.request(`/api/admin/offers?all=${showAll}`); },
    async createOffer(data) { return this.request('/api/admin/offers', { method: 'POST', body: JSON.stringify(data) }); },
    async updateOffer(id, data) { return this.request(`/api/admin/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async deleteOffer(id) { return this.request(`/api/admin/offers/${id}`, { method: 'DELETE' }); }
};

window.DashboardAPI = DashboardAPI;

// ===== MOCK DATA =====

// Products Data - NOW LOADED FROM DATABASE
const products = [];

// Orders Data - NOW LOADED FROM DATABASE
const orders = [];

// Customers Data - NOW LOADED FROM DATABASE  
const customers = [];

// Top Products Data - Will be calculated from real orders
const topProducts = [];

// Chart Data by Time Period - Will be calculated from real data
const chartDataByPeriod = {
    today: { revenue: { labels: [], data: [] }, category: { labels: [], data: [], colors: [] } },
    week: { revenue: { labels: [], data: [] }, category: { labels: [], data: [], colors: [] } },
    month: { revenue: { labels: [], data: [] }, category: { labels: [], data: [], colors: [] } },
    year: { revenue: { labels: [], data: [] }, category: { labels: [], data: [], colors: [] } }
};

// Chart Data (default) - Will be calculated from real data
const chartData = {
    revenueWeekly: { labels: [], data: [] },
    categoryDistribution: { labels: [], data: [], colors: [] },
    salesMonthly: { labels: [], data: [] },
    customerGrowth: { labels: [], data: [] },
    revenueByCategory: { labels: [], data: [], colors: [] }
};

// Store chart instances for updating
let revenueChartInstance = null;
let categoryChartInstance = null;

// Dashboard Stats by Time Period - Will be fetched from API
const dashboardStatsByPeriod = {
    today: { totalRevenue: 0, revenueGrowth: 0, totalOrders: 0, ordersGrowth: 0, totalCustomers: 0, customersGrowth: 0, totalProducts: 0, productsChange: 0 },
    week: { totalRevenue: 0, revenueGrowth: 0, totalOrders: 0, ordersGrowth: 0, totalCustomers: 0, customersGrowth: 0, totalProducts: 0, productsChange: 0 },
    month: { totalRevenue: 0, revenueGrowth: 0, totalOrders: 0, ordersGrowth: 0, totalCustomers: 0, customersGrowth: 0, totalProducts: 0, productsChange: 0 },
    year: { totalRevenue: 0, revenueGrowth: 0, totalOrders: 0, ordersGrowth: 0, totalCustomers: 0, customersGrowth: 0, totalProducts: 0, productsChange: 0 }
};

// Current dashboard stats (default to week)
let dashboardStats = { ...dashboardStatsByPeriod.week };

// Order Statistics - Will be calculated from real orders
const orderStats = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
};

// Trash for deleted/cancelled orders
let orderTrash = [];

// Messages Data - NOW LOADED FROM DATABASE
const messages = [];

// Trash for deleted messages
let messageTrash = [];

// Archived messages
let archivedMessages = [];

// Move message to archive
function moveMessageToArchive(msgId) {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex !== -1) {
        const msg = messages[msgIndex];
        msg.archivedDate = new Date().toISOString();
        archivedMessages.push(msg);
        messages.splice(msgIndex, 1);
        if (typeof updateMessageBadge === 'function') updateMessageBadge();
        return msg;
    }
    return null;
}

// Restore message from archive
function restoreMessageFromArchive(msgId) {
    const msgIndex = archivedMessages.findIndex(m => m.id === msgId);
    if (msgIndex !== -1) {
        const msg = archivedMessages[msgIndex];
        delete msg.archivedDate;
        messages.unshift(msg);
        archivedMessages.splice(msgIndex, 1);
        if (typeof updateMessageBadge === 'function') updateMessageBadge();
        return msg;
    }
    return null;
}

// Delete archived message (move to trash)
function deleteArchivedMessage(msgId) {
    const msgIndex = archivedMessages.findIndex(m => m.id === msgId);
    if (msgIndex !== -1) {
        const msg = archivedMessages[msgIndex];
        msg.deletedDate = new Date().toISOString();
        delete msg.archivedDate;
        messageTrash.push(msg);
        archivedMessages.splice(msgIndex, 1);
        if (typeof updateHeaderTrashBadge === 'function') updateHeaderTrashBadge();
        return msg;
    }
    return null;
}

// Expose archive functions globally
window.archivedMessages = archivedMessages;
window.moveMessageToArchive = moveMessageToArchive;
window.restoreMessageFromArchive = restoreMessageFromArchive;
window.deleteArchivedMessage = deleteArchivedMessage;

// Customer Statistics - Will be calculated from real data
const customerStats = {
    active: 0,
    newThisMonth: 0,
    avgOrderValue: 0,
    retentionRate: 0
};

// ===== UTILITY FUNCTIONS =====

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-EG', {
        style: 'currency',
        currency: 'EGP'
    }).format(amount);
}

// Format number with commas
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

// Get initials from name
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

// Generate random color for avatar
function getAvatarColor(name) {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
}

// Get avatar URL
function getAvatarUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
}

// Get stock status
function getStockStatus(stock, minStock) {
    if (stock === 0) return 'out-of-stock';
    if (stock <= minStock) return 'low-stock';
    return 'in-stock';
}

// Get status badge class
function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'badge-pending',
        'processing': 'badge-processing',
        'shipped': 'badge-shipped',
        'delivered': 'badge-delivered',
        'cancelled': 'badge-cancelled',
        'active': 'badge-active',
        'inactive': 'badge-inactive',
        'in-stock': 'badge-in-stock',
        'low-stock': 'badge-low-stock',
        'out-of-stock': 'badge-out-of-stock'
    };
    return classes[status] || 'badge-active';
}

// Placeholder image handler
function handleImageError(img) {
    img.onerror = null;
    img.style.opacity = '0';
    img.style.position = 'absolute';

    // Only add placeholder for product-image-wrapper elements
    const parent = img.parentElement;
    if (parent && parent.classList.contains('product-image-wrapper') && !parent.querySelector('.image-placeholder')) {
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.innerHTML = '<i class="fas fa-image"></i>';
        parent.appendChild(placeholder);
    }
}

// ===== SIDEBAR & NAVIGATION =====

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

// Close sidebar on mobile
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
}

// ===== MODAL FUNCTIONS =====

// Open modal by ID
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close modal by ID
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal when clicking overlay
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            activeModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// ===== ALERT/NOTIFICATION FUNCTIONS =====

// Show alert notification
function showAlert(type, message) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert-notification');
    if (existingAlert) existingAlert.remove();

    const iconMap = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };

    const colorMap = {
        'success': '#10b981',
        'error': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6'
    };

    const alert = document.createElement('div');
    alert.className = 'alert-notification';
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        border-left: 4px solid ${colorMap[type] || colorMap.info};
        max-width: 400px;
    `;

    alert.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.info}" style="color: ${colorMap[type] || colorMap.info}; font-size: 1.25rem;"></i>
        <span style="color: #1e293b; font-size: 0.95rem;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; padding: 0.25rem; margin-left: 0.5rem;">
            <i class="fas fa-times" style="color: #94a3b8;"></i>
        </button>
    `;

    // Add animation keyframes if not exists
    if (!document.querySelector('#alertAnimations')) {
        const style = document.createElement('style');
        style.id = 'alertAnimations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// ===== OFFERS PAGE SPECIFIC FUNCTIONS =====

// Open Add Offer Modal
function openAddOfferModal() {
    // Reset form
    const form = document.getElementById('addOfferForm');
    if (form) form.reset();

    // Reset image preview
    const preview = document.getElementById('addOfferImagePreview');
    const placeholder = document.getElementById('addOfferImagePlaceholder');
    if (preview) {
        preview.style.display = 'none';
        preview.src = '';
    }
    if (placeholder) placeholder.style.display = 'block';

    // Reset discount preview
    const discountPreview = document.getElementById('addDiscountPreview');
    if (discountPreview) discountPreview.textContent = '-0%';

    openModal('addOfferModal');
}

// Calculate discount percentage
function calculateDiscount(mode) {
    const prefix = mode === 'add' ? 'add' : 'edit';
    const originalPrice = parseFloat(document.getElementById(`${prefix}OfferOriginalPrice`)?.value) || 0;
    const salePrice = parseFloat(document.getElementById(`${prefix}OfferSalePrice`)?.value) || 0;
    const discountPreview = document.getElementById(`${prefix}DiscountPreview`);

    if (originalPrice > 0 && salePrice > 0 && salePrice < originalPrice) {
        const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
        if (discountPreview) discountPreview.textContent = `-${discount}%`;
    } else {
        if (discountPreview) discountPreview.textContent = '-0%';
    }
}

// Preview image for add offer
function previewAddOfferImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('addOfferImagePreview');
            const placeholder = document.getElementById('addOfferImagePlaceholder');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// Preview image for edit offer
function previewEditOfferImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('editOfferImagePreview');
            if (preview) preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Preview image generic
function previewImage(input, previewId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById(previewId);
            if (preview) preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// ===== EVENT LISTENERS SETUP =====

// Initialize navigation and sidebar events on DOM ready
document.addEventListener('DOMContentLoaded', function () {
    // Mobile menu button
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }

    // Sidebar toggle button
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Sidebar overlay (close when clicked)
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Set active nav item
    setActiveNavItem();

    // Update sidebar branding from localStorage
    if (typeof updateSidebarBranding === 'function') {
        updateSidebarBranding();
    }
});

// Set active navigation item
function setActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            item.classList.add('active');
        }
    });
}

// ===== CHART CREATION FUNCTIONS =====

// Create Revenue Line Chart
function createRevenueChart(canvasId, period = 'week') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const periodData = chartDataByPeriod[period] || chartDataByPeriod.week;

    // Destroy existing chart if it exists
    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periodData.revenue.labels,
            datasets: [{
                label: 'Revenue',
                data: periodData.revenue.data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
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
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(100, 116, 139, 0.1)'
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            if (value >= 1000) {
                                return 'EGP ' + (value / 1000).toFixed(0) + 'K';
                            }
                            return 'EGP ' + value;
                        }
                    }
                }
            }
        }
    });
}

// Create Category Doughnut Chart
function createCategoryChart(canvasId, period = 'week') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const periodData = chartDataByPeriod[period] || chartDataByPeriod.week;

    // Destroy existing chart if it exists
    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: periodData.category.labels,
            datasets: [{
                data: periodData.category.data,
                backgroundColor: periodData.category.colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: '#64748b'
                    }
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

// Create Sales Performance Bar Chart
function createSalesChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.salesMonthly.labels,
            datasets: [{
                label: 'Sales',
                data: chartData.salesMonthly.data,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderRadius: 8,
                borderSkipped: false,
                hoverBackgroundColor: '#8b5cf6'
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
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(100, 116, 139, 0.1)'
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return 'EGP ' + (value / 1000) + 'K';
                        }
                    }
                }
            }
        }
    });
}

// Create Customer Growth Line Chart
function createCustomerGrowthChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.customerGrowth.labels,
            datasets: [{
                label: 'New Customers',
                data: chartData.customerGrowth.data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
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
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y + ' new customers';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(100, 116, 139, 0.1)'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

// Create Revenue by Category Horizontal Bar Chart
function createRevenueByCategoryChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.revenueByCategory.labels,
            datasets: [{
                label: 'Revenue',
                data: chartData.revenueByCategory.data,
                backgroundColor: chartData.revenueByCategory.colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return formatCurrency(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(100, 116, 139, 0.1)'
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return 'EGP ' + (value / 1000) + 'K';
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

// ===== RENDER FUNCTIONS =====

// Render Recent Orders Table
function renderRecentOrders(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const recentOrders = orders.slice(0, 5);

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    recentOrders.forEach(order => {
        html += `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${order.customer.name}</td>
                <td>${order.product}</td>
                <td><strong>${formatCurrency(order.amount)}</strong></td>
                <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Render Top Products
function renderTopProducts(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    topProducts.forEach(product => {
        html += `
            <div class="top-product-item">
                <img src="${product.image}" alt="${product.name}" class="top-product-img" onerror="this.style.opacity='0'">
                <div class="top-product-info">
                    <div class="top-product-name">${product.name}</div>
                    <div class="top-product-category">${product.category}</div>
                </div>
                <div class="top-product-sales">${product.sales} sales</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Render Products Grid
function renderProductsGrid(containerId, filterCategory = 'all', filterStatus = 'all', searchTerm = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let filteredProducts = products.filter(product => {
        const matchesCategory = filterCategory === 'all' || product.category.toLowerCase() === filterCategory.toLowerCase();
        const productStatus = product.stock === 0 ? 'out-of-stock' : (product.stock <= product.minStock ? 'low-stock' : 'active');
        const matchesStatus = filterStatus === 'all' || productStatus === filterStatus || product.status === filterStatus;
        const matchesSearch = searchTerm === '' ||
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesCategory && matchesStatus && matchesSearch;
    });

    let html = '';
    filteredProducts.forEach(product => {
        const stockStatus = getStockStatus(product.stock, product.minStock);
        const stockLabel = stockStatus === 'low-stock' ? 'LOW STOCK' : (stockStatus === 'out-of-stock' ? 'OUT OF STOCK' : 'In Stock');
        html += `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image-wrapper">
                    <div class="image-placeholder"><i class="fas fa-image"></i></div>
                    <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.style.opacity='0'">
                    <span class="product-category-badge">${product.category}</span>
                </div>
                <div class="product-content">
                    <div class="product-header">
                        <h3 class="product-name">${product.name}</h3>
                        <span class="product-price">${formatCurrency(product.price)}</span>
                    </div>
                    <div class="product-meta">
                        <span class="product-sku">${product.sku}</span>
                        <span class="badge ${getStatusBadgeClass(stockStatus)}">${stockLabel}</span>
                    </div>
                    <p class="product-stock">Stock: <strong>${product.stock}</strong> units | Min: ${product.minStock}</p>
                    ${product.description ? `<p class="product-description">${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</p>` : ''}
                    <div class="product-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<div class="no-products"><i class="fas fa-box-open"></i><p>No products found</p></div>';
}

// Render Orders Table
function renderOrdersTable(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th><input type="checkbox" id="selectAll" onchange="selectAllOrders(this)"></th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(order => {
        html += `
            <tr>
                <td><input type="checkbox" class="order-checkbox" data-id="${order.id}"></td>
                <td><strong>#${order.id}</strong></td>
                <td>
                    <div class="customer-cell">
                        <span class="customer-name">${order.customer.name}</span>
                        <span class="customer-email">${order.customer.email}</span>
                    </div>
                </td>
                <td>${order.date}</td>
                <td>${order.items} items</td>
                <td><strong>${formatCurrency(order.amount)}</strong></td>
                <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewOrder('${order.id}')" title="View Order">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Render Customers Table
function renderCustomersTable(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    customers.forEach(customer => {
        const avatarColor = getAvatarColor(customer.name);
        html += `
            <tr>
                <td>
                    <div class="customer-cell-with-avatar">
                        <div class="customer-avatar" style="background-color: ${avatarColor}">
                            ${getInitials(customer.name)}
                        </div>
                        <strong>${customer.name}</strong>
                    </div>
                </td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td>${customer.orders}</td>
                <td><strong>${formatCurrency(customer.spent)}</strong></td>
                <td><span class="badge ${getStatusBadgeClass(customer.status)}">${customer.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewCustomer(${customer.id})" title="View Profile">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Render Inventory Table
function renderInventoryTable(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Min Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    products.forEach(product => {
        const stockStatus = getStockStatus(product.stock, product.minStock);
        const statusLabel = stockStatus === 'low-stock' ? 'Low Stock' : (stockStatus === 'out-of-stock' ? 'Out of Stock' : 'In Stock');
        const initials = getInitials(product.name);
        const bgColor = getAvatarColor(product.name);

        html += `
            <tr>
                <td>
                    <div class="customer-cell-with-avatar">
                        <div class="inventory-img-wrapper" style="width: 45px; height: 45px; border-radius: 8px; overflow: hidden; flex-shrink: 0; position: relative; background: ${bgColor};">
                            <img src="${product.image}" alt="${product.name}" 
                                 style="width: 100%; height: 100%; object-fit: cover;"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="inventory-img-fallback" style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.8rem; position: absolute; top: 0; left: 0;">
                                ${initials}
                            </div>
                        </div>
                        <strong>${product.name}</strong>
                    </div>
                </td>
                <td>${product.sku}</td>
                <td><span class="badge badge-secondary" style="font-size: 0.7rem;">${product.category}</span></td>
                <td><strong>${product.stock}</strong></td>
                <td>${product.minStock}</td>
                <td><span class="badge ${getStatusBadgeClass(stockStatus)}">${statusLabel}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="updateStock(${product.id})" title="Add Stock" style="white-space: nowrap;">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===== MODAL FUNCTIONS =====

// Open Modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on click outside
function setupModalCloseOnClickOutside() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// ===== CRUD OPERATIONS =====

// Add Product
function addProduct(formData) {
    // Get the highest ID and add 1
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);

    const newProduct = {
        id: maxId + 1,
        name: formData.get('productName'),
        sku: formData.get('productSku'),
        category: formData.get('productCategory'),
        price: parseFloat(formData.get('productPrice')),
        stock: parseInt(formData.get('productStock')),
        minStock: parseInt(formData.get('productMinStock')) || 20,
        status: formData.get('productStatus') || 'active',
        description: formData.get('productDescription'),
        image: 'https://placehold.co/280x200/f1f5f9/64748b?text=New+Product'
    };

    // Handle image if uploaded
    const imageInput = document.getElementById('addProductImage');
    if (imageInput && imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            newProduct.image = e.target.result;
            products.push(newProduct);
            // Log employee activity
            if (typeof logEmployeeActivity === 'function') {
                logEmployeeActivity('product', `Added new product: ${newProduct.name} (SKU: ${newProduct.sku})`);
            }
            closeModal('addProductModal');
            resetAddProductForm();
            renderProductsGrid('productsGrid');
            showAlert('success', `Product "${newProduct.name}" added successfully!`);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        products.push(newProduct);
        // Log employee activity
        if (typeof logEmployeeActivity === 'function') {
            logEmployeeActivity('product', `Added new product: ${newProduct.name} (SKU: ${newProduct.sku})`);
        }
        closeModal('addProductModal');
        resetAddProductForm();
        renderProductsGrid('productsGrid');
        showAlert('success', `Product "${newProduct.name}" added successfully!`);
    }
}

// Reset Add Product Form
function resetAddProductForm() {
    const form = document.getElementById('addProductForm');
    if (form) {
        form.reset();
        // Reset image preview
        const preview = document.getElementById('addImagePreview');
        if (preview) {
            preview.src = 'https://placehold.co/200x150/f1f5f9/64748b?text=Product+Image';
        }
    }
}

// Edit Product - Open modal with product data
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Fill the edit form with product data
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductSku').value = product.sku;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductStock').value = product.stock;
    document.getElementById('editProductMinStock').value = product.minStock;
    document.getElementById('editProductDescription').value = product.description || '';

    // Set status
    const statusSelect = document.getElementById('editProductStatus');
    if (product.stock === 0) {
        statusSelect.value = 'out-of-stock';
    } else {
        statusSelect.value = product.status || 'active';
    }

    // Set image preview
    const imagePreview = document.getElementById('editImagePreview');
    imagePreview.src = product.image || 'https://placehold.co/200x150/f1f5f9/64748b?text=No+Image';
    imagePreview.onerror = function () {
        this.src = 'https://placehold.co/200x150/f1f5f9/64748b?text=No+Image';
    };

    // Open the modal
    openModal('editProductModal');
}

// Save edited product
function saveEditedProduct(event) {
    event.preventDefault();

    const productId = parseInt(document.getElementById('editProductId').value);
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        showAlert('error', 'Product not found!');
        return;
    }

    // Update product data
    products[productIndex].name = document.getElementById('editProductName').value;
    products[productIndex].sku = document.getElementById('editProductSku').value;
    products[productIndex].category = document.getElementById('editProductCategory').value;
    products[productIndex].price = parseFloat(document.getElementById('editProductPrice').value);
    products[productIndex].stock = parseInt(document.getElementById('editProductStock').value);
    products[productIndex].minStock = parseInt(document.getElementById('editProductMinStock').value) || 20;
    products[productIndex].description = document.getElementById('editProductDescription').value;
    products[productIndex].status = document.getElementById('editProductStatus').value;

    // Handle image if a new one was uploaded
    const imageInput = document.getElementById('editProductImage');
    if (imageInput.files && imageInput.files[0]) {
        // In a real app, this would upload to server
        // For now, we'll use the preview URL
        const reader = new FileReader();
        reader.onload = function (e) {
            products[productIndex].image = e.target.result;
            renderProductsGrid('productsGrid');
        };
        reader.readAsDataURL(imageInput.files[0]);
    }

    // Close modal and refresh grid
    closeModal('editProductModal');
    renderProductsGrid('productsGrid');
    showAlert('success', `Product "${products[productIndex].name}" updated successfully!`);
}

// Preview image before upload
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Delete Product
function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Create confirm modal
    let modal = document.getElementById('confirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-trash" style="color: var(--danger); margin-right: 0.5rem;"></i>Delete Product</h2>
                <button class="modal-close" onclick="closeModal('confirmModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1rem; border-radius: 50%; background: var(--danger-light); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--danger);"></i>
                </div>
                <p style="font-size: 1rem; margin-bottom: 0.5rem;">Are you sure you want to delete</p>
                <p style="font-weight: 700; font-size: 1.125rem; color: var(--primary);">"${product.name}"?</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">This action cannot be undone.</p>
            </div>
            <div class="modal-footer" style="justify-content: center;">
                <button class="btn btn-secondary" onclick="closeModal('confirmModal')">Cancel</button>
                <button class="btn btn-danger" onclick="confirmDeleteProduct(${productId})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;

    openModal('confirmModal');
}

// Confirm Delete Product
function confirmDeleteProduct(productId) {
    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
        const productName = products[index].name;
        products.splice(index, 1);
        closeModal('confirmModal');
        renderProductsGrid('productsGrid');
        showAlert('success', `Product "${productName}" has been deleted successfully.`);
    }
}

// View Order - Show Full Receipt
function viewOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const remainingAmount = order.amount - (order.depositAmount || 0);
    const depositBadgeClass = order.depositStatus === 'paid' ? 'badge-delivered' :
        order.depositStatus === 'pending' ? 'badge-pending' :
            order.depositStatus === 'refunded' ? 'badge-shipped' : 'badge-inactive';

    // Create order receipt modal
    let modal = document.getElementById('orderReceiptModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'orderReceiptModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal order-receipt-modal">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-receipt" style="color: var(--primary); margin-right: 0.5rem;"></i>Order Receipt</h2>
                <button class="modal-close" onclick="closeModal('orderReceiptModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <!-- Receipt Content -->
                <div class="receipt-container">
                    <!-- Header -->
                    <div class="receipt-header">
                        <div class="receipt-logo">
                            <i class="fas fa-snowflake"></i>
                            <span>Freezy Bite</span>
                        </div>
                        <div class="receipt-order-id">#${order.id}</div>
                    </div>
                    
                    <!-- Status Banner -->
                    <div class="receipt-status-banner status-${order.status}">
                        <span class="status-label">Order Status</span>
                        <span class="status-value">${order.status.toUpperCase()}</span>
                    </div>
                    
                    <!-- Order Info -->
                    <div class="receipt-section">
                        <div class="receipt-row">
                            <span class="receipt-label"><i class="fas fa-calendar"></i> Date</span>
                            <span class="receipt-value">${order.date}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label"><i class="fas fa-box"></i> Items</span>
                            <span class="receipt-value">${order.items} item${order.items > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    
                    <!-- Customer Info -->
                    <div class="receipt-section">
                        <h4 class="receipt-section-title"><i class="fas fa-user"></i> Customer Information</h4>
                        <div class="receipt-row">
                            <span class="receipt-label">Name</span>
                            <span class="receipt-value">${order.customer.name}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Phone</span>
                            <span class="receipt-value">${order.customer.phone || 'N/A'}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Email</span>
                            <span class="receipt-value">${order.customer.email}</span>
                        </div>
                    </div>
                    
                    <!-- Order Items -->
                    <div class="receipt-section">
                        <h4 class="receipt-section-title"><i class="fas fa-shopping-basket"></i> Order Items</h4>
                        <div class="receipt-item">
                            <div class="receipt-item-info">
                                <span class="receipt-item-name">${order.product}</span>
                                <span class="receipt-item-qty">× ${order.items}</span>
                            </div>
                            <span class="receipt-item-price">${formatCurrency(order.amount)}</span>
                        </div>
                    </div>
                    
                    <!-- Payment Info -->
                    <div class="receipt-section">
                        <h4 class="receipt-section-title"><i class="fas fa-credit-card"></i> Payment Details</h4>
                        <div class="receipt-row">
                            <span class="receipt-label">Method</span>
                            <span class="receipt-value"><span class="badge badge-shipped">Cash on Delivery</span></span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">InstaPay Deposit</span>
                            <span class="receipt-value"><span class="badge ${depositBadgeClass}">${order.depositStatus === 'paid' ? formatCurrency(order.depositAmount) : order.depositStatus}</span></span>
                        </div>
                    </div>
                    
                    <!-- Totals -->
                    <div class="receipt-totals">
                        <div class="receipt-total-row">
                            <span>Subtotal</span>
                            <span>${formatCurrency(order.amount)}</span>
                        </div>
                        <div class="receipt-total-row">
                            <span>Deposit Paid</span>
                            <span style="color: var(--success);">- ${formatCurrency(order.depositAmount || 0)}</span>
                        </div>
                        <div class="receipt-total-row total-final">
                            <span>Due on Delivery</span>
                            <span>${formatCurrency(remainingAmount)}</span>
                        </div>
                    </div>
                    
                    <!-- InstaPay Info -->
                    <div class="receipt-instapay">
                        <i class="fas fa-mobile-alt"></i>
                        <span>InstaPay: <strong>01093961545</strong></span>
                    </div>
                </div>
                
                <!-- Status Change Section -->
                <div class="receipt-actions-section">
                    <h4 class="receipt-section-title"><i class="fas fa-edit"></i> Update Order Status</h4>
                    <div class="status-buttons">
                        <button class="status-btn ${order.status === 'pending' ? 'active' : ''}" onclick="updateOrderStatus('${order.id}', 'pending')">
                            <i class="fas fa-clock"></i> Pending
                        </button>
                        <button class="status-btn ${order.status === 'processing' ? 'active' : ''}" onclick="updateOrderStatus('${order.id}', 'processing')">
                            <i class="fas fa-cog"></i> Processing
                        </button>
                        <button class="status-btn ${order.status === 'shipped' ? 'active' : ''}" onclick="updateOrderStatus('${order.id}', 'shipped')">
                            <i class="fas fa-truck"></i> Shipped
                        </button>
                        <button class="status-btn ${order.status === 'delivered' ? 'active' : ''}" onclick="updateOrderStatus('${order.id}', 'delivered')">
                            <i class="fas fa-check-circle"></i> Delivered
                        </button>
                        <button class="status-btn cancelled ${order.status === 'cancelled' ? 'active' : ''}" onclick="updateOrderStatus('${order.id}', 'cancelled')">
                            <i class="fas fa-times-circle"></i> Cancelled
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="printReceipt('${order.id}')">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn btn-primary" onclick="closeModal('orderReceiptModal')">
                    <i class="fas fa-check"></i> Done
                </button>
            </div>
        </div>
    `;

    openModal('orderReceiptModal');
}

// Update Order Status
function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;

    // Handle stock changes based on status transition
    handleOrderStockChange(order, oldStatus, newStatus);

    // If cancelling, move to trash
    if (newStatus === 'cancelled') {
        moveOrderToTrash(orderId);
        return;
    }

    order.status = newStatus;

    // Update the receipt modal if open
    viewOrder(orderId);

    // Also update the orders table
    renderFilteredOrders();

    // Show success message
    showAlert('success', `Order Status Updated!\n\nOrder: #${orderId}\nFrom: ${oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1)}\nTo: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`);
}

// Handle Stock Change based on Order Status
function handleOrderStockChange(order, oldStatus, newStatus) {
    // Find the product by ID first, then by name
    let product = null;
    if (order.productId) {
        product = products.find(p => p.id === order.productId);
    }
    if (!product) {
        product = findProductByName(order.product);
    }

    if (!product) {
        console.log(`Product not found for order: ${order.product}`);
        return;
    }

    const quantity = order.quantity || order.items || 1;

    // Stock should be deducted when order moves from pending to processing/shipped/delivered
    // Stock should be restored when order is cancelled

    // If order was cancelled and now is being reactivated
    if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
        // Deduct stock
        deductStock(product, quantity, order.id);
        order.stockDeducted = true;
    }

    // If order is being cancelled and stock was previously deducted
    if (oldStatus !== 'cancelled' && newStatus === 'cancelled' && order.stockDeducted) {
        // Restore stock
        restoreStock(product, quantity, order.id);
        order.stockDeducted = false;
    }

    // If order moves from pending to processing (first time confirmation)
    if (oldStatus === 'pending' && !order.stockDeducted && (newStatus === 'processing' || newStatus === 'shipped')) {
        deductStock(product, quantity, order.id);
        order.stockDeducted = true;
    }
}

// Find product by name (partial match)
function findProductByName(productName) {
    if (!productName) return null;

    const nameLower = productName.toLowerCase();

    // Try exact match first
    let product = products.find(p => p.name.toLowerCase() === nameLower);
    if (product) return product;

    // Try partial match
    product = products.find(p =>
        p.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(p.name.toLowerCase())
    );
    if (product) return product;

    // Try matching first word
    const firstWord = nameLower.split(' ')[0];
    product = products.find(p => p.name.toLowerCase().includes(firstWord));

    return product;
}

// Deduct stock for an order
function deductStock(product, quantity, orderId) {
    if (!product) return;

    const newStock = Math.max(0, product.stock - quantity);
    console.log(`Stock deducted for ${product.name}: ${product.stock} -> ${newStock} (Order: ${orderId})`);
    product.stock = newStock;

    // Update product status based on stock
    if (product.stock === 0) {
        product.status = 'out-of-stock';
    } else if (product.stock <= product.minStock) {
        product.status = 'low-stock';
    }

    // Refresh inventory table if on inventory page
    if (document.getElementById('inventoryTable')) {
        renderInventoryTable('inventoryTable');
        updateLowStockAlert();
    }
}

// Restore stock for a cancelled order
function restoreStock(product, quantity, orderId) {
    if (!product) return;

    const newStock = product.stock + quantity;
    console.log(`Stock restored for ${product.name}: ${product.stock} -> ${newStock} (Order: ${orderId})`);
    product.stock = newStock;

    // Update product status based on stock
    if (product.stock > product.minStock) {
        product.status = 'active';
    } else if (product.stock > 0) {
        product.status = 'low-stock';
    }

    // Refresh inventory table if on inventory page
    if (document.getElementById('inventoryTable')) {
        renderInventoryTable('inventoryTable');
        updateLowStockAlert();
    }
}

// Confirm Move to Trash
function confirmMoveToTrash(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Create confirm modal
    let modal = document.getElementById('confirmTrashModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmTrashModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-trash" style="color: var(--warning); margin-right: 0.5rem;"></i>Move to Trash</h2>
                <button class="modal-close" onclick="closeModal('confirmTrashModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1rem; border-radius: 50%; background: var(--warning-light); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-trash" style="font-size: 2rem; color: var(--warning);"></i>
                </div>
                <p style="font-size: 1rem; margin-bottom: 0.5rem;">Move order to trash?</p>
                <p style="font-weight: 700; font-size: 1.125rem; color: var(--primary);">#${orderId}</p>
                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--border-radius-md); margin-top: 1rem; text-align: left;">
                    <p style="font-size: 0.875rem;"><strong>Customer:</strong> ${order.customer.name}</p>
                    <p style="font-size: 0.875rem;"><strong>Amount:</strong> ${formatCurrency(order.amount)}</p>
                </div>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 1rem;">
                    <i class="fas fa-info-circle"></i> You can restore this order from the trash later.
                </p>
            </div>
            <div class="modal-footer" style="justify-content: center;">
                <button class="btn btn-secondary" onclick="closeModal('confirmTrashModal')">Cancel</button>
                <button class="btn btn-warning" style="background: var(--warning); color: white;" onclick="closeModal('confirmTrashModal'); moveOrderToTrash('${orderId}')">
                    <i class="fas fa-trash"></i> Move to Trash
                </button>
            </div>
        </div>
    `;

    openModal('confirmTrashModal');
}

// Move Order to Trash
function moveOrderToTrash(orderId) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = orders[orderIndex];
    const oldStatus = order.status;

    // Restore stock if order was not already cancelled
    if (oldStatus !== 'cancelled') {
        const product = findProductByName(order.product);
        if (product) {
            const quantity = order.items || 1;
            restoreStock(product, quantity, orderId);
        }
    }

    // Add deletion date and move to trash
    order.status = 'cancelled';
    order.deletedAt = new Date().toISOString();
    order.stockDeducted = false; // Reset flag

    orderTrash.push(order);
    orders.splice(orderIndex, 1);

    // Close the receipt modal if open
    closeModal('orderReceiptModal');

    // Update the orders table
    renderFilteredOrders();
    updateTrashCount();

    // Show success message with stock info
    const product = findProductByName(order.product);
    const stockInfo = product ? `\nStock restored: ${product.name} (${product.stock} units)` : '';
    showAlert('info', `Order Moved to Trash\n\nOrder: #${orderId}\nStatus: Cancelled${stockInfo}\n\nYou can restore it from the trash or delete it permanently.`);
}

// Restore Order from Trash
function restoreOrderFromTrash(orderId) {
    const trashIndex = orderTrash.findIndex(o => o.id === orderId);
    if (trashIndex === -1) return;

    const order = orderTrash[trashIndex];

    // Remove deletion info and restore
    delete order.deletedAt;
    delete order.autoDeleteDate;
    order.status = 'pending'; // Reset to pending

    orders.push(order);
    orderTrash.splice(trashIndex, 1);

    // Update displays
    renderFilteredOrders();
    renderTrashTable();
    updateTrashCount();

    showAlert('success', `Order Restored!\n\nOrder: #${orderId}\nStatus: Pending\n\nThe order has been restored and set to Pending status.`);
}

// Permanently Delete from Trash
function permanentlyDeleteOrder(orderId) {
    const trashIndex = orderTrash.findIndex(o => o.id === orderId);
    if (trashIndex === -1) return;

    const order = orderTrash[trashIndex];

    // Create confirm modal
    let modal = document.getElementById('confirmDeleteOrderModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmDeleteOrderModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-trash" style="color: var(--danger); margin-right: 0.5rem;"></i>Delete Permanently</h2>
                <button class="modal-close" onclick="closeModal('confirmDeleteOrderModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1rem; border-radius: 50%; background: var(--danger-light); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--danger);"></i>
                </div>
                <p style="font-size: 1rem; margin-bottom: 0.5rem;">Permanently delete order</p>
                <p style="font-weight: 700; font-size: 1.125rem; color: var(--primary);">#${orderId}?</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">This action cannot be undone.</p>
            </div>
            <div class="modal-footer" style="justify-content: center;">
                <button class="btn btn-secondary" onclick="closeModal('confirmDeleteOrderModal')">Cancel</button>
                <button class="btn btn-danger" onclick="confirmPermanentDelete('${orderId}')">
                    <i class="fas fa-trash"></i> Delete Forever
                </button>
            </div>
        </div>
    `;

    openModal('confirmDeleteOrderModal');
}

// Confirm Permanent Delete
function confirmPermanentDelete(orderId) {
    const trashIndex = orderTrash.findIndex(o => o.id === orderId);
    if (trashIndex !== -1) {
        orderTrash.splice(trashIndex, 1);
        closeModal('confirmDeleteOrderModal');
        renderTrashTable();
        updateTrashCount();
        showAlert('success', `Order #${orderId} has been permanently deleted.`);
    }
}

// Empty All Trash
function emptyAllTrash() {
    if (orderTrash.length === 0) {
        showAlert('info', 'Trash is already empty.');
        return;
    }

    let modal = document.getElementById('confirmEmptyTrashModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmEmptyTrashModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-trash" style="color: var(--danger); margin-right: 0.5rem;"></i>Empty Trash</h2>
                <button class="modal-close" onclick="closeModal('confirmEmptyTrashModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1rem; border-radius: 50%; background: var(--danger-light); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-trash" style="font-size: 2rem; color: var(--danger);"></i>
                </div>
                <p style="font-size: 1rem; margin-bottom: 0.5rem;">Empty all trash?</p>
                <p style="font-weight: 700; font-size: 1.125rem; color: var(--danger);">${orderTrash.length} order${orderTrash.length !== 1 ? 's' : ''} will be deleted</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">This action cannot be undone.</p>
            </div>
            <div class="modal-footer" style="justify-content: center;">
                <button class="btn btn-secondary" onclick="closeModal('confirmEmptyTrashModal')">Cancel</button>
                <button class="btn btn-danger" onclick="confirmEmptyTrash()">
                    <i class="fas fa-trash"></i> Empty Trash
                </button>
            </div>
        </div>
    `;

    openModal('confirmEmptyTrashModal');
}

// Confirm Empty Trash
function confirmEmptyTrash() {
    const count = orderTrash.length;
    orderTrash = [];
    closeModal('confirmEmptyTrashModal');
    renderTrashTable();
    updateTrashCount();
    showAlert('success', `Trash emptied!\n\n${count} order${count !== 1 ? 's' : ''} permanently deleted.`);
}

// Calculate days since deleted
function getDaysSinceDeleted(deletedAt) {
    const now = new Date();
    const deleteDate = new Date(deletedAt);
    const diffTime = now - deleteDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Update trash count badge
function updateTrashCount() {
    const trashCountBadge = document.getElementById('trashCountBadge');
    if (trashCountBadge) {
        trashCountBadge.textContent = orderTrash.length;
        trashCountBadge.style.display = orderTrash.length > 0 ? 'inline-flex' : 'none';
    }

    // Update cancelled count in stats
    const cancelledCount = document.getElementById('cancelledCount');
    if (cancelledCount) {
        cancelledCount.textContent = orderTrash.length;
    }
}

// Render Trash Table
function renderTrashTable() {
    const container = document.getElementById('trashTableBody');
    if (!container) return;

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Deleted On</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (orderTrash.length === 0) {
        html += `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-trash" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: var(--text-light);"></i>
                    Trash is empty
                </td>
            </tr>
        `;
    } else {
        orderTrash.forEach(order => {
            const deletedDate = new Date(order.deletedAt).toLocaleDateString();
            const daysSince = getDaysSinceDeleted(order.deletedAt);

            html += `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>
                        <div class="customer-cell">
                            <span class="customer-name">${order.customer.name}</span>
                            <span class="customer-email">${order.customer.phone || order.customer.email}</span>
                        </div>
                    </td>
                    <td><strong>${formatCurrency(order.amount)}</strong></td>
                    <td>${deletedDate} <span style="color: var(--text-muted); font-size: 0.75rem;">(${daysSince} days ago)</span></td>
                    <td>
                        <button class="action-btn add" onclick="restoreOrderFromTrash('${order.id}')" title="Restore Order">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="action-btn delete" onclick="permanentlyDeleteOrder('${order.id}')" title="Delete Permanently">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Toggle Trash View
function toggleTrashView() {
    const trashSection = document.getElementById('trashSection');
    const ordersSection = document.getElementById('ordersSection');
    const toggleBtn = document.getElementById('trashToggleBtn');

    if (trashSection && ordersSection) {
        const isTrashVisible = trashSection.style.display !== 'none';

        trashSection.style.display = isTrashVisible ? 'none' : 'block';
        ordersSection.style.display = isTrashVisible ? 'block' : 'none';

        if (toggleBtn) {
            toggleBtn.innerHTML = isTrashVisible
                ? '<i class="fas fa-trash"></i> Trash <span class="badge" id="trashCountBadge" style="margin-left: 0.5rem;">' + orderTrash.length + '</span>'
                : '<i class="fas fa-arrow-left"></i> Back to Orders';
        }

        if (!isTrashVisible) {
            renderTrashTable();
        }
    }
}

// Print Receipt
function printReceipt(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Create print content
    const printContent = `
        <html>
        <head>
            <title>Order Receipt - #${order.id}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
                .order-id { font-size: 14px; color: #666; }
                .section { margin: 15px 0; padding: 10px 0; border-bottom: 1px dashed #ddd; }
                .row { display: flex; justify-content: space-between; margin: 5px 0; }
                .label { color: #666; }
                .value { font-weight: 500; }
                .total { font-size: 18px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #333; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">❄️ Freezy Bite</div>
                <div class="order-id">Order #${order.id}</div>
                <div class="order-id">${order.date}</div>
            </div>
            <div class="section">
                <div class="row"><span class="label">Customer:</span><span class="value">${order.customer.name}</span></div>
                <div class="row"><span class="label">Phone:</span><span class="value">${order.customer.phone || 'N/A'}</span></div>
            </div>
            <div class="section">
                <div class="row"><span class="label">Items:</span><span class="value">${order.product} × ${order.items}</span></div>
                <div class="row"><span class="label">Status:</span><span class="value">${order.status.toUpperCase()}</span></div>
            </div>
            <div class="section">
                <div class="row"><span class="label">Subtotal:</span><span class="value">${formatCurrency(order.amount)}</span></div>
                <div class="row"><span class="label">Deposit Paid:</span><span class="value">- ${formatCurrency(order.depositAmount || 0)}</span></div>
            </div>
            <div class="total">
                <div class="row"><span>Due on Delivery:</span><span>${formatCurrency(order.amount - (order.depositAmount || 0))}</span></div>
            </div>
            <div class="footer">
                <p>Payment: Cash on Delivery</p>
                <p>InstaPay: 01093961545</p>
                <p>Thank you for your order!</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Confirm Deposit
function confirmDeposit(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Create deposit modal
    let modal = document.getElementById('depositModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'depositModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-money-bill-wave" style="color: var(--success); margin-right: 0.5rem;"></i>Confirm Deposit</h2>
                <button class="modal-close" onclick="closeModal('depositModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">Order</p>
                    <p style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">#${orderId}</p>
                </div>
                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--border-radius-md); margin-bottom: 1rem;">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Customer</p>
                    <p style="font-weight: 600;">${order.customer.name}</p>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">${order.customer.phone}</p>
                </div>
                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--border-radius-md); margin-bottom: 1rem;">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Order Total</p>
                    <p style="font-weight: 700; font-size: 1.125rem;">${formatCurrency(order.amount)}</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Deposit Amount Received (EGP)</label>
                    <input type="number" class="form-input" id="depositAmountInput" placeholder="Enter amount" value="20" min="1" step="0.01">
                </div>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); text-align: center;">
                    <i class="fas fa-info-circle"></i> Received via InstaPay to 01093961545
                </p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('depositModal')">Cancel</button>
                <button class="btn btn-success" onclick="processDeposit('${orderId}')">
                    <i class="fas fa-check"></i> Confirm Deposit
                </button>
            </div>
        </div>
    `;

    openModal('depositModal');
}

// Process Deposit
function processDeposit(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const depositInput = document.getElementById('depositAmountInput');
    const depositAmount = parseFloat(depositInput.value);

    if (isNaN(depositAmount) || depositAmount <= 0) {
        showAlert('error', 'Please enter a valid deposit amount.');
        return;
    }

    order.depositStatus = 'paid';
    order.depositAmount = depositAmount;
    order.status = order.status === 'pending' ? 'processing' : order.status;

    closeModal('depositModal');
    renderFilteredOrders();
    showAlert('success', `Deposit Confirmed!\n\nAmount: ${formatCurrency(depositAmount)}\nOrder: #${orderId}\nStatus: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}\n\nRemaining on delivery: ${formatCurrency(order.amount - depositAmount)}`);
}

// View Customer
function viewCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Get all orders for this customer (match by email or name)
    const customerOrders = orders.filter(o =>
        o.customer.email.toLowerCase() === customer.email.toLowerCase() ||
        o.customer.name.toLowerCase() === customer.name.toLowerCase()
    );

    // Create customer profile modal
    let modal = document.getElementById('customerProfileModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customerProfileModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const avatarColor = getAvatarColor(customer.name);

    // Store customer orders globally for search
    window.currentCustomerOrders = customerOrders;
    window.currentCustomerId = customerId;

    // Generate orders list HTML
    let ordersHtml = '';
    if (customerOrders.length > 0) {
        ordersHtml = `
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin: 0;">
                        <i class="fas fa-shopping-bag" style="margin-right: 0.5rem;"></i>Order History (${customerOrders.length})
                    </h4>
                </div>
                <!-- Search Bar -->
                <div style="position: relative; margin-bottom: 0.75rem;">
                    <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
                    <input type="text" 
                           id="customerOrderSearch" 
                           placeholder="Search by order number (e.g., ORD-2024-001)..." 
                           style="width: 100%; padding: 0.6rem 0.75rem 0.6rem 2.25rem; border: 1px solid var(--bg-secondary); border-radius: var(--border-radius-sm); font-size: 0.85rem; background: var(--bg-secondary); transition: all 0.2s;"
                           oninput="filterCustomerOrders(this.value)"
                           onfocus="this.style.borderColor='var(--primary)'; this.style.background='var(--bg-card)';"
                           onblur="this.style.borderColor='var(--bg-secondary)'; this.style.background='var(--bg-secondary)';">
                </div>
                <div id="customerOrdersList" style="max-height: 280px; overflow-y: auto; border: 1px solid var(--bg-secondary); border-radius: var(--border-radius-md);">
                    ${renderCustomerOrdersList(customerOrders)}
                </div>
            </div>
        `;
    } else {
        ordersHtml = `
            <div style="margin-bottom: 1.5rem;">
                <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">
                    <i class="fas fa-shopping-bag" style="margin-right: 0.5rem;"></i>Order History
                </h4>
                <div style="text-align: center; padding: 2rem; background: var(--bg-secondary); border-radius: var(--border-radius-md); color: var(--text-secondary);">
                    <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
                    <p>No orders found for this customer</p>
                </div>
            </div>
        `;
    }

    // Calculate actual totals from orders
    const actualOrderCount = customerOrders.length;
    const actualTotalSpent = customerOrders.reduce((sum, o) => sum + o.amount, 0);

    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-user" style="color: var(--primary); margin-right: 0.5rem;"></i>Customer Profile</h2>
                <button class="modal-close" onclick="closeModal('customerProfileModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <!-- Customer Header -->
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--bg-secondary);">
                    <div class="customer-avatar" style="width: 70px; height: 70px; font-size: 1.5rem; background-color: ${avatarColor}">
                        ${getInitials(customer.name)}
                    </div>
                    <div>
                        <h3 style="font-size: 1.25rem; margin-bottom: 0.25rem;">${customer.name}</h3>
                        <span class="badge ${getStatusBadgeClass(customer.status)}">${customer.status}</span>
                    </div>
                </div>
                
                <!-- Contact Info -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">Contact Information</h4>
                    <div style="display: grid; gap: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-envelope" style="color: var(--primary); width: 20px;"></i>
                            <span>${customer.email}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-phone" style="color: var(--primary); width: 20px;"></i>
                            <span>${customer.phone}</span>
                        </div>
                        ${customer.address ? `
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-map-marker-alt" style="color: var(--primary); width: 20px;"></i>
                            <span>${customer.address}${customer.city ? ', ' + customer.city : ''}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Order Stats -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: linear-gradient(135deg, var(--primary-light) 0%, var(--bg-secondary) 100%); padding: 1rem; border-radius: var(--border-radius-md); text-align: center;">
                        <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Total Orders</p>
                        <p style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${Math.max(customer.orders, actualOrderCount)}</p>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-secondary) 100%); padding: 1rem; border-radius: var(--border-radius-md); text-align: center;">
                        <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Total Spent</p>
                        <p style="font-size: 1.25rem; font-weight: 700; color: var(--success);">${formatCurrency(Math.max(customer.spent, actualTotalSpent))}</p>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, var(--bg-secondary) 100%); padding: 1rem; border-radius: var(--border-radius-md); text-align: center;">
                        <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Avg. Order</p>
                        <p style="font-size: 1.25rem; font-weight: 700; color: var(--warning);">${actualOrderCount > 0 ? formatCurrency(actualTotalSpent / actualOrderCount) : formatCurrency(0)}</p>
                    </div>
                </div>
                
                <!-- Order History -->
                ${ordersHtml}
                
                ${customer.notes ? `
                <div style="margin-bottom: 1rem;">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Notes</h4>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--border-radius-sm);">${customer.notes}</p>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="editCustomer(${customer.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-primary" onclick="closeModal('customerProfileModal')">
                    <i class="fas fa-check"></i> Done
                </button>
            </div>
        </div>
    `;

    openModal('customerProfileModal');
}

// Render Customer Orders List
function renderCustomerOrdersList(ordersToRender) {
    if (ordersToRender.length === 0) {
        return `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-search" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
                <p style="margin: 0;">No orders found matching your search</p>
            </div>
        `;
    }

    return ordersToRender.map(order => `
        <div class="customer-order-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--bg-secondary); cursor: pointer; transition: background 0.2s;" onclick="viewOrderFromCustomer('${order.id}')" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <strong style="color: var(--primary); font-size: 0.875rem;">${order.id}</strong>
                    <span class="badge ${getStatusBadgeClass(order.status)}" style="font-size: 0.65rem; padding: 0.15rem 0.4rem;">${order.status}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                    <i class="fas fa-calendar-alt" style="margin-right: 0.25rem;"></i>${order.date}
                    <span style="margin: 0 0.5rem;">•</span>
                    <i class="fas fa-box" style="margin-right: 0.25rem;"></i>${order.items} item${order.items > 1 ? 's' : ''}
                    <span style="margin: 0 0.5rem;">•</span>
                    <span style="color: var(--text-muted);">${order.product}</span>
                </div>
            </div>
            <div style="text-align: right;">
                <p style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">${formatCurrency(order.amount)}</p>
                ${order.depositStatus === 'paid' ? `<span style="font-size: 0.65rem; color: var(--success);"><i class="fas fa-check-circle"></i> Deposit Paid</span>` :
            order.depositStatus === 'pending' ? `<span style="font-size: 0.65rem; color: var(--warning);"><i class="fas fa-clock"></i> Pending</span>` :
                order.depositStatus === 'refunded' ? `<span style="font-size: 0.65rem; color: var(--text-secondary);"><i class="fas fa-undo"></i> Refunded</span>` : ''}
            </div>
            <div style="margin-left: 0.75rem; color: var(--text-muted);">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `).join('');
}

// Filter Customer Orders by Search
function filterCustomerOrders(searchTerm) {
    const ordersList = document.getElementById('customerOrdersList');
    if (!ordersList || !window.currentCustomerOrders) return;

    const filteredOrders = window.currentCustomerOrders.filter(order => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return order.id.toLowerCase().includes(term) ||
            order.product.toLowerCase().includes(term) ||
            order.date.includes(term) ||
            order.status.toLowerCase().includes(term);
    });

    ordersList.innerHTML = renderCustomerOrdersList(filteredOrders);
}

// View Order from Customer Profile
function viewOrderFromCustomer(orderId) {
    // Close customer profile modal
    closeModal('customerProfileModal');

    // Find the order
    const order = orders.find(o => o.id === orderId);
    if (order) {
        // Open order details modal
        showOrderDetailsModal(orderId);
    } else {
        showAlert('error', 'Order not found.');
    }
}

// Show Order Details Modal
function showOrderDetailsModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        showAlert('error', 'Order not found.');
        return;
    }

    // Create or get modal
    let modal = document.getElementById('orderDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'orderDetailsModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    // Generate items list (if available) or show product
    let itemsHtml = '';
    if (order.orderItems && order.orderItems.length > 0) {
        itemsHtml = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
                <thead>
                    <tr style="background: var(--bg-secondary);">
                        <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; color: var(--text-secondary);">Product</th>
                        <th style="padding: 0.5rem; text-align: center; font-size: 0.75rem; color: var(--text-secondary);">Qty</th>
                        <th style="padding: 0.5rem; text-align: right; font-size: 0.75rem; color: var(--text-secondary);">Price</th>
                        <th style="padding: 0.5rem; text-align: right; font-size: 0.75rem; color: var(--text-secondary);">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.orderItems.map(item => `
                        <tr style="border-bottom: 1px solid var(--bg-secondary);">
                            <td style="padding: 0.5rem;">${item.name}</td>
                            <td style="padding: 0.5rem; text-align: center;">${item.quantity}</td>
                            <td style="padding: 0.5rem; text-align: right;">${formatCurrency(item.price)}</td>
                            <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        itemsHtml = `
            <div style="padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--border-radius-sm); margin-top: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="font-weight: 600; color: var(--text-primary);">${order.product || 'Order Items'}</p>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">${order.items} item${order.items > 1 ? 's' : ''}</p>
                    </div>
                    <p style="font-weight: 700; color: var(--primary);">${formatCurrency(order.amount)}</p>
                </div>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 550px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-receipt" style="color: var(--primary); margin-right: 0.5rem;"></i>
                    Order Details
                </h2>
                <button class="modal-close" onclick="closeModal('orderDetailsModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <!-- Order Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 1px solid var(--bg-secondary); margin-bottom: 1rem;">
                    <div>
                        <h3 style="font-size: 1.125rem; color: var(--primary); margin-bottom: 0.25rem;">${order.id}</h3>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);"><i class="fas fa-calendar-alt" style="margin-right: 0.25rem;"></i>${order.date}</p>
                    </div>
                    <span class="badge ${getStatusBadgeClass(order.status)}" style="font-size: 0.875rem; padding: 0.5rem 1rem;">${order.status.toUpperCase()}</span>
                </div>
                
                <!-- Customer Info -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">
                        <i class="fas fa-user" style="margin-right: 0.5rem;"></i>Customer Information
                    </h4>
                    <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--border-radius-md);">
                        <p style="font-weight: 600; margin-bottom: 0.25rem;">${order.customer.name}</p>
                        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                            <i class="fas fa-envelope" style="width: 16px;"></i> ${order.customer.email}
                        </p>
                        <p style="font-size: 0.875rem; color: var(--text-secondary);">
                            <i class="fas fa-phone" style="width: 16px;"></i> ${order.customer.phone}
                        </p>
                    </div>
                </div>
                
                <!-- Order Items -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">
                        <i class="fas fa-shopping-cart" style="margin-right: 0.5rem;"></i>Order Items
                    </h4>
                    ${itemsHtml}
                </div>
                
                <!-- Payment Info -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">
                        <i class="fas fa-credit-card" style="margin-right: 0.5rem;"></i>Payment Information
                    </h4>
                    <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--border-radius-md);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Payment Method</span>
                            <span style="font-weight: 600;">${order.paymentMethod || 'Cash on Delivery'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Deposit Status</span>
                            <span class="badge ${order.depositStatus === 'paid' ? 'badge-success' : order.depositStatus === 'awaiting' ? 'badge-warning' : 'badge-secondary'}">${order.depositStatus || 'N/A'}</span>
                        </div>
                        ${order.depositAmount ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Deposit Amount</span>
                            <span style="font-weight: 600; color: var(--success);">${formatCurrency(order.depositAmount)}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); margin-top: 0.5rem;">
                            <span style="font-weight: 600; color: var(--text-primary);">Total Amount</span>
                            <span style="font-weight: 700; font-size: 1.125rem; color: var(--primary);">${formatCurrency(order.amount)}</span>
                        </div>
                        ${order.depositAmount && order.depositStatus === 'paid' ? `
                        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
                            <span style="color: var(--text-secondary);">Remaining Balance</span>
                            <span style="font-weight: 600; color: var(--warning);">${formatCurrency(order.amount - order.depositAmount)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Status Actions -->
                <div style="margin-bottom: 1rem;">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">
                        <i class="fas fa-tasks" style="margin-right: 0.5rem;"></i>Update Status
                    </h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        <button class="btn btn-sm ${order.status === 'pending' ? 'btn-warning' : 'btn-outline'}" onclick="updateOrderStatusFromModal('${order.id}', 'pending')" ${order.status === 'pending' ? 'disabled' : ''}>
                            <i class="fas fa-clock"></i> Pending
                        </button>
                        <button class="btn btn-sm ${order.status === 'processing' ? 'btn-info' : 'btn-outline'}" onclick="updateOrderStatusFromModal('${order.id}', 'processing')" ${order.status === 'processing' ? 'disabled' : ''}>
                            <i class="fas fa-cog"></i> Processing
                        </button>
                        <button class="btn btn-sm ${order.status === 'shipped' ? 'btn-primary' : 'btn-outline'}" onclick="updateOrderStatusFromModal('${order.id}', 'shipped')" ${order.status === 'shipped' ? 'disabled' : ''}>
                            <i class="fas fa-truck"></i> Shipped
                        </button>
                        <button class="btn btn-sm ${order.status === 'delivered' ? 'btn-success' : 'btn-outline'}" onclick="updateOrderStatusFromModal('${order.id}', 'delivered')" ${order.status === 'delivered' ? 'disabled' : ''}>
                            <i class="fas fa-check-circle"></i> Delivered
                        </button>
                        <button class="btn btn-sm ${order.status === 'cancelled' ? 'btn-danger' : 'btn-outline'}" onclick="updateOrderStatusFromModal('${order.id}', 'cancelled')" ${order.status === 'cancelled' ? 'disabled' : ''}>
                            <i class="fas fa-times-circle"></i> Cancelled
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('orderDetailsModal')">
                    <i class="fas fa-times"></i> Close
                </button>
                <button class="btn btn-primary" onclick="printOrderDetails('${order.id}')">
                    <i class="fas fa-print"></i> Print
                </button>
            </div>
        </div>
    `;

    openModal('orderDetailsModal');
}

// Update Order Status from Modal
function updateOrderStatusFromModal(orderId, newStatus) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        const order = orders[orderIndex];
        const oldStatus = order.status;

        // Handle stock changes
        handleOrderStockChange(order, oldStatus, newStatus);

        order.status = newStatus;
        showOrderDetailsModal(orderId); // Refresh the modal

        // Log employee activity
        if (typeof logEmployeeActivity === 'function') {
            logEmployeeActivity('order', `Updated order #${orderId} status from ${oldStatus} to ${newStatus}`);
        }

        // Find product for notification
        let product = order.productId ? products.find(p => p.id === order.productId) : findProductByName(order.product);
        const quantity = order.quantity || order.items || 1;

        // Show stock change notification
        if (product && oldStatus !== 'cancelled' && newStatus === 'cancelled') {
            showAlert('info', `Order cancelled!\n\nStock restored: +${quantity} units\nProduct: ${product.name}\nNew stock level: ${product.stock} units`);
        } else if (product && oldStatus === 'cancelled' && newStatus !== 'cancelled') {
            showAlert('info', `Order reactivated!\n\nStock deducted: -${quantity} units\nProduct: ${product.name}\nNew stock level: ${product.stock} units`);
        } else if (product && oldStatus === 'pending' && (newStatus === 'processing' || newStatus === 'shipped')) {
            showAlert('success', `Order confirmed!\n\nStock deducted: -${quantity} units\nProduct: ${product.name}\nNew stock level: ${product.stock} units`);
        } else {
            showAlert('success', `Order status updated to ${newStatus}`);
        }
    }
}

// Print Order Details
function printOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Order ${order.id} - Freezy Bite</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
                h1 { color: #6366f1; font-size: 24px; margin-bottom: 5px; }
                .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 15px; }
                .order-id { font-size: 18px; color: #333; }
                .section { margin-bottom: 20px; }
                .section-title { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .label { color: #666; }
                .value { font-weight: 600; }
                .total { font-size: 18px; color: #6366f1; }
                .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
                .status.delivered { background: #d1fae5; color: #059669; }
                .status.shipped { background: #dbeafe; color: #2563eb; }
                .status.processing { background: #e0e7ff; color: #4f46e5; }
                .status.pending { background: #fef3c7; color: #d97706; }
                .status.cancelled { background: #fee2e2; color: #dc2626; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="logo">
                <span style="font-size: 28px;">❄️</span>
                <div>
                    <h1>Freezy Bite</h1>
                    <span class="order-id">${order.id}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Order Status</div>
                <span class="status ${order.status}">${order.status}</span>
                <p style="margin-top: 10px; color: #666;">Date: ${order.date}</p>
            </div>
            
            <div class="section">
                <div class="section-title">Customer Information</div>
                <p><strong>${order.customer.name}</strong></p>
                <p>${order.customer.email}</p>
                <p>${order.customer.phone}</p>
            </div>
            
            <div class="section">
                <div class="section-title">Order Summary</div>
                <div class="info-row">
                    <span class="label">Items</span>
                    <span class="value">${order.items} item(s)</span>
                </div>
                <div class="info-row">
                    <span class="label">Payment Method</span>
                    <span class="value">${order.paymentMethod || 'Cash on Delivery'}</span>
                </div>
                ${order.depositAmount ? `
                <div class="info-row">
                    <span class="label">Deposit Paid</span>
                    <span class="value">EGP ${order.depositAmount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="info-row" style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ddd;">
                    <span class="label" style="font-weight: 600;">Total Amount</span>
                    <span class="value total">EGP ${order.amount.toFixed(2)}</span>
                </div>
            </div>
            
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 40px;">
                Thank you for shopping with Freezy Bite! ❄️
            </p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Edit Customer
function editCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Close profile modal if open
    closeModal('customerProfileModal');

    // Fill the edit form
    document.getElementById('editCustomerId').value = customer.id;
    document.getElementById('editCustomerName').value = customer.name;
    document.getElementById('editCustomerEmail').value = customer.email;
    document.getElementById('editCustomerPhone').value = customer.phone;
    document.getElementById('editCustomerAddress').value = customer.address || '';
    document.getElementById('editCustomerCity').value = customer.city || '';
    document.getElementById('editCustomerStatus').value = customer.status;
    document.getElementById('editCustomerNotes').value = customer.notes || '';

    openModal('editCustomerModal');
}

// Save Edited Customer
function saveEditedCustomer(event) {
    event.preventDefault();

    const customerId = parseInt(document.getElementById('editCustomerId').value);
    const customerIndex = customers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
        showAlert('error', 'Customer not found!');
        return;
    }

    // Update customer data
    customers[customerIndex].name = document.getElementById('editCustomerName').value;
    customers[customerIndex].email = document.getElementById('editCustomerEmail').value;
    customers[customerIndex].phone = document.getElementById('editCustomerPhone').value;
    customers[customerIndex].address = document.getElementById('editCustomerAddress').value;
    customers[customerIndex].city = document.getElementById('editCustomerCity').value;
    customers[customerIndex].status = document.getElementById('editCustomerStatus').value;
    customers[customerIndex].notes = document.getElementById('editCustomerNotes').value;

    closeModal('editCustomerModal');
    renderFilteredCustomers();
    showAlert('success', `Customer "${customers[customerIndex].name}" updated successfully!`);
}

// Add New Customer
function addNewCustomer(event) {
    event.preventDefault();

    const name = document.getElementById('addCustomerName').value;
    const email = document.getElementById('addCustomerEmail').value;
    const phone = document.getElementById('addCustomerPhone').value;

    // Validate required fields
    if (!name || !email || !phone) {
        showAlert('error', 'Please fill in all required fields.');
        return;
    }

    // Get the highest ID and add 1
    const maxId = customers.reduce((max, c) => Math.max(max, c.id), 0);

    const newCustomer = {
        id: maxId + 1,
        name: name,
        email: email,
        phone: phone,
        address: document.getElementById('addCustomerAddress').value,
        city: document.getElementById('addCustomerCity').value,
        status: document.getElementById('addCustomerStatus').value,
        notes: document.getElementById('addCustomerNotes').value,
        orders: 0,
        spent: 0
    };

    customers.push(newCustomer);

    // Log employee activity
    if (typeof logEmployeeActivity === 'function') {
        logEmployeeActivity('customer', `Added new customer: ${newCustomer.name}`);
    }

    closeModal('addCustomerModal');
    document.getElementById('addCustomerForm').reset();
    renderFilteredCustomers();
    showAlert('success', `Customer "${newCustomer.name}" added successfully!`);
}

// Delete Customer
function deleteCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Create confirm modal
    let modal = document.getElementById('confirmDeleteCustomerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmDeleteCustomerModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-user-times" style="color: var(--danger); margin-right: 0.5rem;"></i>Delete Customer</h2>
                <button class="modal-close" onclick="closeModal('confirmDeleteCustomerModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1rem; border-radius: 50%; background: var(--danger-light); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--danger);"></i>
                </div>
                <p style="font-size: 1rem; margin-bottom: 0.5rem;">Are you sure you want to delete</p>
                <p style="font-weight: 700; font-size: 1.125rem; color: var(--primary);">${customer.name}?</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">This action cannot be undone.</p>
            </div>
            <div class="modal-footer" style="justify-content: center;">
                <button class="btn btn-secondary" onclick="closeModal('confirmDeleteCustomerModal')">Cancel</button>
                <button class="btn btn-danger" onclick="confirmDeleteCustomer(${customerId})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;

    openModal('confirmDeleteCustomerModal');
}

// Confirm Delete Customer
function confirmDeleteCustomer(customerId) {
    const index = customers.findIndex(c => c.id === customerId);
    if (index !== -1) {
        const customerName = customers[index].name;
        customers.splice(index, 1);
        closeModal('confirmDeleteCustomerModal');
        renderFilteredCustomers();
        showAlert('success', `Customer "${customerName}" has been deleted.`);
    }
}

// Customer Filters
let currentCustomerFilters = {
    status: 'all',
    search: ''
};

// Apply Customer Filters
function applyCustomerFilters() {
    const statusFilter = document.getElementById('customerStatusFilter');
    const searchInput = document.getElementById('customerSearch');

    if (statusFilter) currentCustomerFilters.status = statusFilter.value;
    if (searchInput) currentCustomerFilters.search = searchInput.value.toLowerCase();

    renderFilteredCustomers();
}

// Render Filtered Customers
function renderFilteredCustomers() {
    const container = document.getElementById('customersTableBody');
    if (!container) return;

    let filteredCustomers = customers.filter(customer => {
        // Status filter
        if (currentCustomerFilters.status !== 'all' && customer.status !== currentCustomerFilters.status) {
            return false;
        }

        // Search filter
        if (currentCustomerFilters.search) {
            const searchTerm = currentCustomerFilters.search;
            const matchesName = customer.name.toLowerCase().includes(searchTerm);
            const matchesEmail = customer.email.toLowerCase().includes(searchTerm);
            const matchesPhone = customer.phone.includes(searchTerm);
            if (!matchesName && !matchesEmail && !matchesPhone) return false;
        }

        return true;
    });

    // Update count
    const countElement = document.getElementById('customersCount');
    if (countElement) {
        countElement.textContent = `${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`;
    }

    // Render table
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (filteredCustomers.length === 0) {
        html += `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: var(--text-light);"></i>
                    No customers found
                </td>
            </tr>
        `;
    } else {
        filteredCustomers.forEach(customer => {
            const avatarColor = getAvatarColor(customer.name);
            html += `
                <tr>
                    <td>
                        <div class="customer-cell-with-avatar">
                            <div class="customer-avatar" style="background-color: ${avatarColor}">
                                ${getInitials(customer.name)}
                            </div>
                            <strong>${customer.name}</strong>
                        </div>
                    </td>
                    <td>${customer.email}</td>
                    <td>${customer.phone}</td>
                    <td>${customer.orders}</td>
                    <td><strong>${formatCurrency(customer.spent)}</strong></td>
                    <td><span class="badge ${getStatusBadgeClass(customer.status)}">${customer.status}</span></td>
                    <td>
                        <button class="action-btn view" onclick="viewCustomer(${customer.id})" title="View Profile">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editCustomer(${customer.id})" title="Edit Customer">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteCustomer(${customer.id})" title="Delete Customer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Open Add Stock Modal (Select Product)
function openAddStockModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('addStockSelectModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'addStockSelectModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);

    // Generate products list with search
    let productsHtml = products.map(product => {
        const stockStatus = getStockStatus(product.stock, product.minStock);
        const statusColor = stockStatus === 'in-stock' ? 'var(--success)' : stockStatus === 'low-stock' ? 'var(--warning)' : 'var(--danger)';
        const initials = getInitials(product.name);
        const bgColor = getAvatarColor(product.name);

        return `
            <div class="product-select-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--bg-secondary); cursor: pointer; transition: background 0.2s;" 
                 onclick="selectProductForStock(${product.id})"
                 onmouseover="this.style.background='var(--bg-secondary)'" 
                 onmouseout="this.style.background='transparent'"
                 data-name="${product.name.toLowerCase()}"
                 data-sku="${product.sku.toLowerCase()}">
                <div style="width: 45px; height: 45px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: ${bgColor};">
                    <img src="${product.image}" alt="${product.name}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.8rem;">
                        ${initials}
                    </div>
                </div>
                <div style="flex: 1;">
                    <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.15rem;">${product.name}</p>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">${product.sku} • ${product.category}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 1.1rem; font-weight: 700; color: ${statusColor};">${product.stock}</p>
                    <p style="font-size: 0.65rem; color: var(--text-secondary);">in stock</p>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--text-muted);"></i>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="modal" style="max-width: 550px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-boxes" style="color: var(--primary); margin-right: 0.5rem;"></i>
                    Add Stock - Select Product
                </h2>
                <button class="modal-close" onclick="closeModal('addStockSelectModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <!-- Search Bar -->
                <div style="padding: 1rem; border-bottom: 1px solid var(--bg-secondary);">
                    <div style="position: relative;">
                        <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                        <input type="text" 
                               id="productStockSearch" 
                               placeholder="Search products by name or SKU..." 
                               style="width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid var(--bg-secondary); border-radius: var(--border-radius-sm); font-size: 0.9rem; background: var(--bg-secondary);"
                               oninput="filterProductsForStock(this.value)"
                               onfocus="this.style.borderColor='var(--primary)'; this.style.background='var(--bg-card)';"
                               onblur="this.style.borderColor='var(--bg-secondary)'; this.style.background='var(--bg-secondary)';">
                    </div>
                </div>
                
                <!-- Products List -->
                <div id="productStockList" style="max-height: 400px; overflow-y: auto;">
                    ${productsHtml}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('addStockSelectModal')">Cancel</button>
            </div>
        </div>
    `;

    // Add click outside to close
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal('addStockSelectModal');
        }
    });

    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
}

// Filter products for stock selection
function filterProductsForStock(searchTerm) {
    const items = document.querySelectorAll('#productStockList .product-select-item');
    const term = searchTerm.toLowerCase();

    items.forEach(item => {
        const name = item.getAttribute('data-name');
        const sku = item.getAttribute('data-sku');

        if (name.includes(term) || sku.includes(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Select product for stock update
function selectProductForStock(productId) {
    closeModal('addStockSelectModal');
    updateStock(productId);
}

// Expose filter function
window.filterProductsForStock = filterProductsForStock;

// Update Stock
function updateStock(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showAlert('error', 'Product not found!');
        return;
    }

    // Store current product ID for save function
    window.currentStockProductId = productId;

    // Remove existing modal if any
    const existingModal = document.getElementById('stockModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create stock modal
    const modal = document.createElement('div');
    modal.id = 'stockModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);

    const stockStatus = getStockStatus(product.stock, product.minStock);
    const statusColor = stockStatus === 'in-stock' ? 'var(--success)' : stockStatus === 'low-stock' ? 'var(--warning)' : 'var(--danger)';
    const statusLabel = stockStatus === 'in-stock' ? 'In Stock' : stockStatus === 'low-stock' ? 'Low Stock' : 'Out of Stock';
    const initials = getInitials(product.name);
    const bgColor = getAvatarColor(product.name);

    modal.innerHTML = `
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-boxes" style="color: var(--primary); margin-right: 0.5rem;"></i>Update Stock</h2>
                <button class="modal-close" onclick="closeModal('stockModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <!-- Product Info -->
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--bg-secondary);">
                    <div style="width: 60px; height: 60px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: ${bgColor};">
                        <img src="${product.image}" alt="${product.name}" 
                             style="width: 100%; height: 100%; object-fit: cover;"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1rem;">
                            ${initials}
                        </div>
                    </div>
                    <div>
                        <p style="font-weight: 700; font-size: 1.125rem; color: var(--text-primary); margin-bottom: 0.25rem;">${product.name}</p>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);">${product.sku} • ${product.category}</p>
                    </div>
                </div>
                
                <!-- Stock Status -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;">
                    <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--border-radius-md); text-align: center;">
                        <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Current</p>
                        <p style="font-weight: 700; font-size: 1.25rem; color: ${statusColor};">${product.stock}</p>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--border-radius-md); text-align: center;">
                        <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Minimum</p>
                        <p style="font-weight: 700; font-size: 1.25rem;">${product.minStock}</p>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--border-radius-md); text-align: center;">
                        <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Status</p>
                        <span class="badge ${getStatusBadgeClass(stockStatus)}" style="font-size: 0.7rem;">${statusLabel}</span>
                    </div>
                </div>
                
                <!-- New Stock Input -->
                <div class="form-group">
                    <label class="form-label">Set New Stock Quantity</label>
                    <input type="number" class="form-input" id="newStockInput" placeholder="Enter quantity" value="${product.stock}" min="0" style="font-size: 1.25rem; text-align: center; font-weight: 600;">
                </div>
                
                <!-- Quick Add Buttons -->
                <div class="form-group">
                    <label class="form-label">Quick Add to Stock</label>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-sm btn-outline" onclick="addToStock(5)">+5</button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="addToStock(10)">+10</button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="addToStock(25)">+25</button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="addToStock(50)">+50</button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="addToStock(100)">+100</button>
                    </div>
                </div>
                
                <!-- Quick Subtract Buttons -->
                <div class="form-group">
                    <label class="form-label">Quick Remove from Stock</label>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-sm btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="addToStock(-5)">-5</button>
                        <button type="button" class="btn btn-sm btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="addToStock(-10)">-10</button>
                        <button type="button" class="btn btn-sm btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="addToStock(-25)">-25</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal('stockModal')">Cancel</button>
                <button type="button" class="btn btn-success" onclick="saveStock(${productId})">
                    <i class="fas fa-check"></i> Update Stock
                </button>
            </div>
        </div>
    `;

    // Add click outside to close
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal('stockModal');
        }
    });

    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
}

// Add to stock input
function addToStock(amount) {
    const input = document.getElementById('newStockInput');
    if (input) {
        input.value = parseInt(input.value || 0) + amount;
    }
}

// Save stock
function saveStock(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newStockInput = document.getElementById('newStockInput');
    const newStock = parseInt(newStockInput.value);

    if (isNaN(newStock) || newStock < 0) {
        showAlert('error', 'Please enter a valid stock quantity.');
        return;
    }

    const oldStock = product.stock;
    product.stock = newStock;

    if (product.stock > 0) {
        product.status = 'active';
    } else {
        product.status = 'out-of-stock';
    }

    closeModal('stockModal');
    renderInventoryTable('inventoryTable');

    const change = newStock - oldStock;
    const changeText = change > 0 ? `+${change}` : change.toString();

    // Log employee activity
    if (typeof logEmployeeActivity === 'function') {
        logEmployeeActivity('inventory', `Updated stock for ${product.name}: ${oldStock} → ${newStock} units (${changeText})`);
    }

    showAlert('success', `Stock Updated!\n\nProduct: ${product.name}\nPrevious: ${oldStock} units\nNew: ${newStock} units\nChange: ${changeText} units`);
}

// Select All Orders
function selectAllOrders(checkbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

// ===== ALERT & NOTIFICATION FUNCTIONS =====

// Show Alert Modal
function showAlert(type, message) {
    // Create modal if it doesn't exist
    let alertModal = document.getElementById('alertModal');
    if (!alertModal) {
        alertModal = document.createElement('div');
        alertModal.id = 'alertModal';
        alertModal.className = 'modal-overlay';
        alertModal.innerHTML = `
            <div class="modal alert-modal">
                <div class="modal-header">
                    <h2 class="modal-title" id="alertModalTitle">Alert</h2>
                    <button class="modal-close" onclick="closeAlertModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="alert-modal-icon" id="alertModalIcon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="alert-modal-message" id="alertModalMessage"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="closeAlertModal()">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(alertModal);
    }

    // Set content based on type
    const titleEl = document.getElementById('alertModalTitle');
    const iconEl = document.getElementById('alertModalIcon');
    const messageEl = document.getElementById('alertModalMessage');

    const typeConfig = {
        success: { title: 'Success', icon: 'fa-check-circle', color: '#10b981' },
        error: { title: 'Error', icon: 'fa-times-circle', color: '#ef4444' },
        warning: { title: 'Warning', icon: 'fa-exclamation-triangle', color: '#f59e0b' },
        info: { title: 'Information', icon: 'fa-info-circle', color: '#6366f1' }
    };

    const config = typeConfig[type] || typeConfig.info;

    titleEl.textContent = config.title;
    iconEl.innerHTML = `<i class="fas ${config.icon}" style="color: ${config.color}"></i>`;
    messageEl.innerHTML = message.replace(/\n/g, '<br>');

    // Show modal
    alertModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close Alert Modal
function closeAlertModal() {
    const alertModal = document.getElementById('alertModal');
    if (alertModal) {
        alertModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Show Notifications
// Notifications Data
let notifications = [
    {
        id: 1,
        type: 'order',
        title: 'New Order Received',
        message: 'Order #ORD-2024-011 has been placed by Ahmed Hassan for EGP 125.50',
        details: 'Customer: Ahmed Hassan\nEmail: ahmed@email.com\nItems: 3x Strawberry Freeze, 2x Chocolate Delight\nTotal: EGP 125.50\nPayment: Cash on Delivery',
        icon: 'fa-shopping-cart',
        iconBg: 'var(--success-light)',
        iconColor: 'var(--success)',
        time: '2 minutes ago',
        read: false,
        action: 'viewOrder',
        actionData: 'ORD-2024-011'
    },
    {
        id: 2,
        type: 'stock',
        title: 'Low Stock Alert',
        message: 'Candy Mix is running low on stock (12 units remaining)',
        details: 'Product: Candy Mix\nSKU: CND-001\nCurrent Stock: 12 units\nMinimum Stock: 20 units\n\nAction Required: Please restock this item soon to avoid stockouts.',
        icon: 'fa-exclamation-triangle',
        iconBg: 'var(--warning-light)',
        iconColor: 'var(--warning)',
        time: '15 minutes ago',
        read: false,
        action: 'viewInventory',
        actionData: 5
    },
    {
        id: 3,
        type: 'feedback',
        title: 'Customer Feedback',
        message: 'New 5-star review from Sarah Davis',
        details: 'Customer: Sarah Davis\nRating: ⭐⭐⭐⭐⭐ (5 stars)\n\nReview: "Amazing quality products! The Strawberry Freeze is absolutely delicious. Fast delivery and great customer service. Will definitely order again!"\n\nDate: Today at 10:30 AM',
        icon: 'fa-star',
        iconBg: 'var(--info-light)',
        iconColor: 'var(--info)',
        time: '1 hour ago',
        read: false,
        action: null,
        actionData: null
    },
    {
        id: 4,
        type: 'payment',
        title: 'Deposit Confirmed',
        message: 'InstaPay deposit received for order #ORD-2024-008',
        details: 'Order: #ORD-2024-008\nCustomer: Jennifer White\nDeposit Amount: EGP 30.00\nPayment Method: InstaPay\nReference: IP2024011015\n\nOrder total: EGP 89.99\nRemaining balance: EGP 59.99 (COD)',
        icon: 'fa-check-circle',
        iconBg: 'var(--success-light)',
        iconColor: 'var(--success)',
        time: '2 hours ago',
        read: true,
        action: 'viewOrder',
        actionData: 'ORD-2024-008'
    },
    {
        id: 5,
        type: 'customer',
        title: 'New Customer Registered',
        message: 'Mohamed Ali just created an account',
        details: 'Customer Name: Mohamed Ali\nEmail: mohamed.ali@email.com\nPhone: +20 100 123 4567\nRegistration Date: Today at 8:45 AM\n\nThis customer found us through: Social Media (Instagram)',
        icon: 'fa-user-plus',
        iconBg: '#ede9fe',
        iconColor: 'var(--secondary)',
        time: '3 hours ago',
        read: true,
        action: null,
        actionData: null
    }
];

function showNotifications() {
    showNotificationModal();
}

// Show Notification Modal
function showNotificationModal() {
    // Remove existing modal
    const existingModal = document.getElementById('notificationModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'notificationModal';
    modal.className = 'modal-overlay';

    const unreadCount = notifications.filter(n => !n.read).length;

    let notificationsHtml = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" 
             onclick="viewNotification(${notif.id})"
             style="cursor: pointer; transition: all 0.2s;"
             onmouseover="this.style.background='var(--bg-secondary)'"
             onmouseout="this.style.background='${notif.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)'}'"
             data-id="${notif.id}">
            <div class="notification-icon" style="background: ${notif.iconBg}; color: ${notif.iconColor};">
                <i class="fas ${notif.icon}"></i>
            </div>
            <div class="notification-content" style="flex: 1;">
                <p class="notification-text">${notif.message}</p>
                <span class="notification-time">${notif.time}</span>
            </div>
            ${notif.read ? '' : '<div style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; flex-shrink: 0;"></div>'}
        </div>
    `).join('');

    if (notifications.length === 0) {
        notificationsHtml = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-bell-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No notifications</p>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-bell" style="color: var(--primary); margin-right: 0.5rem;"></i>
                    Notifications
                    ${unreadCount > 0 ? `<span style="background: var(--danger); color: white; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 10px; margin-left: 0.5rem;">${unreadCount} new</span>` : ''}
                </h2>
                <button class="modal-close" onclick="closeModal('notificationModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0; max-height: 400px; overflow-y: auto;">
                <div class="notification-list">
                    ${notificationsHtml}
                </div>
            </div>
            <div class="modal-footer" style="justify-content: space-between;">
                <button class="btn btn-sm btn-outline" onclick="clearAllNotifications()">
                    <i class="fas fa-trash"></i> Clear All
                </button>
                <button class="btn btn-sm btn-primary" onclick="markAllNotificationsRead()">
                    <i class="fas fa-check-double"></i> Mark All Read
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add click outside to close
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal('notificationModal');
    });

    openModal('notificationModal');
}

// View single notification
function viewNotification(notifId) {
    const notif = notifications.find(n => n.id === notifId);
    if (!notif) return;

    // Mark as read
    notif.read = true;
    updateNotificationBadge();

    // Close notifications modal
    closeModal('notificationModal');

    // Show notification detail modal
    const detailModal = document.createElement('div');
    detailModal.id = 'notificationDetailModal';
    detailModal.className = 'modal-overlay';

    // Format details with line breaks
    const formattedDetails = notif.details.split('\n').map(line => {
        if (line.includes(':')) {
            const [label, ...value] = line.split(':');
            return `<p style="margin: 0.3rem 0;"><span style="color: var(--text-secondary);">${label}:</span> <strong>${value.join(':').trim()}</strong></p>`;
        }
        return `<p style="margin: 0.5rem 0; color: var(--text-secondary);">${line}</p>`;
    }).join('');

    detailModal.innerHTML = `
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header" style="background: linear-gradient(135deg, ${notif.iconBg} 0%, var(--bg-secondary) 100%);">
                <h2 class="modal-title" style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; background: ${notif.iconBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${notif.icon}" style="color: ${notif.iconColor}; font-size: 1rem;"></i>
                    </div>
                    ${notif.title}
                </h2>
                <button class="modal-close" onclick="closeModal('notificationDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p style="font-size: 1rem; color: var(--text-primary); margin-bottom: 1rem; font-weight: 500;">${notif.message}</p>
                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    ${formattedDetails}
                </div>
                <p style="font-size: 0.75rem; color: var(--text-muted);"><i class="fas fa-clock" style="margin-right: 0.25rem;"></i>${notif.time}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('notificationDetailModal'); showNotificationModal();">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                ${notif.action ? `<button class="btn btn-primary" onclick="handleNotificationAction('${notif.action}', '${notif.actionData}')">
                    <i class="fas fa-external-link-alt"></i> View Details
                </button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(detailModal);

    detailModal.addEventListener('click', function (e) {
        if (e.target === detailModal) closeModal('notificationDetailModal');
    });

    setTimeout(() => {
        detailModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
}

// Handle notification action button
function handleNotificationAction(action, data) {
    closeModal('notificationDetailModal');

    switch (action) {
        case 'viewOrder':
            // Navigate to orders page or show order details
            if (typeof showOrderDetailsModal === 'function') {
                showOrderDetailsModal(data);
            } else {
                window.location.href = 'orders.html';
            }
            break;
        case 'viewInventory':
            window.location.href = 'inventory.html';
            break;
        case 'viewCustomer':
            window.location.href = 'customers.html';
            break;
        default:
            break;
    }
}

// Mark all notifications as read
function markAllNotificationsRead() {
    notifications.forEach(n => n.read = true);
    updateNotificationBadge();
    showNotificationModal(); // Refresh the modal
    showAlert('success', 'All notifications marked as read!');
}

// Clear all notifications
function clearAllNotifications() {
    if (notifications.length === 0) {
        showAlert('info', 'No notifications to clear.');
        return;
    }

    notifications = [];
    updateNotificationBadge();
    showNotificationModal(); // Refresh the modal
    showAlert('success', 'All notifications cleared!');
}

// Update notification badge count
function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badges = document.querySelectorAll('.header-btn .badge');

    badges.forEach((badge, index) => {
        // First badge is notifications
        if (index === 0) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    });
}

// Add a new notification (can be called from anywhere)
function addNotification(type, title, message, details, action = null, actionData = null) {
    const iconMap = {
        order: { icon: 'fa-shopping-cart', bg: 'var(--success-light)', color: 'var(--success)' },
        stock: { icon: 'fa-exclamation-triangle', bg: 'var(--warning-light)', color: 'var(--warning)' },
        payment: { icon: 'fa-check-circle', bg: 'var(--success-light)', color: 'var(--success)' },
        customer: { icon: 'fa-user-plus', bg: '#ede9fe', color: 'var(--secondary)' },
        feedback: { icon: 'fa-star', bg: 'var(--info-light)', color: 'var(--info)' },
        error: { icon: 'fa-times-circle', bg: 'var(--danger-light)', color: 'var(--danger)' },
        info: { icon: 'fa-info-circle', bg: 'var(--info-light)', color: 'var(--info)' }
    };

    const iconInfo = iconMap[type] || iconMap.info;

    const newNotif = {
        id: Date.now(),
        type: type,
        title: title,
        message: message,
        details: details,
        icon: iconInfo.icon,
        iconBg: iconInfo.bg,
        iconColor: iconInfo.color,
        time: 'Just now',
        read: false,
        action: action,
        actionData: actionData
    };

    // Add to beginning of array
    notifications.unshift(newNotif);
    updateNotificationBadge();

    return newNotif;
}

// Show Messages
// Messages Data
let messages = [
    {
        id: 1,
        sender: 'John Smith',
        email: 'john@email.com',
        subject: 'Question about my order',
        preview: 'I have a question about my order...',
        fullMessage: 'Hi,\n\nI placed an order yesterday (#ORD-2024-001) and I wanted to know if it\'s possible to add one more item to it before it ships?\n\nI\'d like to add 2x Blueberry Blast if possible.\n\nThank you!',
        avatar: 'JS',
        avatarColor: '#6366f1',
        time: '10 minutes ago',
        read: false
    },
    {
        id: 2,
        sender: 'Ahmed Corp.',
        email: 'purchasing@ahmedcorp.com',
        subject: 'Bulk Order Inquiry',
        preview: 'Inquiry about bulk orders for events',
        fullMessage: 'Dear Freezy Bite Team,\n\nWe are interested in placing a bulk order for our upcoming corporate event on February 15th.\n\nWe would need:\n- 50x Strawberry Freeze\n- 30x Chocolate Delight\n- 40x Mixed Candy Pack\n\nCould you please provide a quote with any available bulk discounts?\n\nBest regards,\nAhmed Corp. Purchasing Department',
        avatar: 'AC',
        avatarColor: '#10b981',
        time: '1 hour ago',
        read: false
    },
    {
        id: 3,
        sender: 'Premium Partners',
        email: 'partnerships@premiumpartners.com',
        subject: 'Partnership Proposal',
        preview: 'Partnership proposal for distribution',
        fullMessage: 'Hello,\n\nWe are Premium Partners, a distribution company specializing in frozen goods across Egypt.\n\nWe\'ve been impressed by your product quality and would like to discuss a potential partnership to distribute Freezy Bite products in the Alexandria and Delta regions.\n\nWould you be available for a call this week?\n\nLooking forward to hearing from you.\n\nBest,\nSarah Ahmed\nBusiness Development Manager',
        avatar: 'PP',
        avatarColor: '#f59e0b',
        time: 'Yesterday',
        read: true
    },
    {
        id: 4,
        sender: 'Fatima Hassan',
        email: 'fatima.hassan@gmail.com',
        subject: 'Delivery Issue - Need Help!',
        preview: 'My order hasn\'t arrived yet and it\'s been 3 days...',
        fullMessage: 'Hello Freezy Bite Support,\n\nI placed an order 3 days ago (Order #ORD-2024-008) but it still hasn\'t arrived. The tracking shows it\'s been "out for delivery" for 2 days now.\n\nCan you please check what\'s happening with my order? I\'m really looking forward to receiving my items.\n\nMy address is:\n123 Nile Street, Giza, Egypt\nPhone: +20 101 234 5678\n\nThank you for your help!\n\nFatima',
        avatar: 'FH',
        avatarColor: '#ec4899',
        time: '2 days ago',
        read: true
    },
    {
        id: 5,
        sender: 'Cairo Events Co.',
        email: 'events@cairoevents.com',
        subject: 'Catering Request for Wedding',
        preview: 'We would like to discuss frozen desserts for a wedding...',
        fullMessage: 'Dear Freezy Bite Team,\n\nWe are Cairo Events Co., a premier event planning company in Egypt.\n\nWe are organizing a wedding reception for 200 guests on March 20th and would love to include your frozen desserts in our menu.\n\nWe\'re interested in:\n- Ice cream bar setup\n- Frozen fruit platters\n- Chocolate desserts\n\nCould we schedule a tasting session and discuss bulk pricing?\n\nBest regards,\nMohamed Ali\nEvent Director\nCairo Events Co.',
        avatar: 'CE',
        avatarColor: '#8b5cf6',
        time: '3 days ago',
        read: true
    },
    {
        id: 6,
        sender: 'Omar Farouk',
        email: 'omar.farouk@outlook.com',
        subject: 'Product Suggestion',
        preview: 'I have some ideas for new flavors you might like...',
        fullMessage: 'Hi Freezy Bite!\n\nI\'m a regular customer and I absolutely love your products! I wanted to suggest some new flavors that I think would be amazing:\n\n1. Mango Tango - Fresh frozen mango with a hint of chili\n2. Egyptian Dates & Cream - Dates mixed with vanilla ice cream\n3. Guava Blast - Frozen guava with cream\n\nJust some ideas from a big fan! Keep up the great work!\n\nCheers,\nOmar',
        avatar: 'OF',
        avatarColor: '#3b82f6',
        time: '4 days ago',
        read: true
    },
    {
        id: 7,
        sender: 'Quality Supplies Ltd.',
        email: 'supply@qualitysupplies.com',
        subject: 'Re: Packaging Materials Quote',
        preview: 'Here is the updated quote for eco-friendly packaging...',
        fullMessage: 'Dear Freezy Bite Team,\n\nThank you for your inquiry about eco-friendly packaging materials.\n\nPlease find below our updated quote:\n\n- Biodegradable containers (500pcs): EGP 2,500\n- Eco-friendly bags (1000pcs): EGP 1,800\n- Recyclable cups (500pcs): EGP 1,200\n- Wooden spoons (1000pcs): EGP 800\n\nTotal: EGP 6,300 (10% discount applied)\n\nDelivery within 5 business days.\n\nLet us know if you\'d like to proceed!\n\nBest,\nSupply Team\nQuality Supplies Ltd.',
        avatar: 'QS',
        avatarColor: '#06b6d4',
        time: '5 days ago',
        read: true
    },
    {
        id: 8,
        sender: 'Layla Mohamed',
        email: 'layla.m@yahoo.com',
        subject: 'Thank you! Amazing service!',
        preview: 'I just wanted to say thank you for the wonderful...',
        fullMessage: 'Hello Freezy Bite!\n\nI just wanted to send a quick message to say THANK YOU!\n\nMy order arrived today and everything was perfect - the packaging was beautiful, the products were fresh, and the delivery was super fast.\n\nI ordered the Strawberry Freeze and Chocolate Delight for my daughter\'s birthday party and everyone loved them! The kids were so happy!\n\nYou\'ve definitely earned a loyal customer. I\'ll be ordering again soon!\n\nBest wishes,\nLayla',
        avatar: 'LM',
        avatarColor: '#ef4444',
        time: '1 week ago',
        read: true
    }
];

function showMessages() {
    showMessagesModal();
}

// Show Messages Modal
function showMessagesModal() {
    // Remove existing modal
    const existingModal = document.getElementById('messagesModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'messagesModal';
    modal.className = 'modal-overlay';

    const unreadCount = messages.filter(m => !m.read).length;

    let messagesHtml = messages.map(msg => `
        <div class="notification-item ${msg.read ? '' : 'unread'}" 
             onclick="viewMessage(${msg.id})"
             style="cursor: pointer; transition: all 0.2s;"
             onmouseover="this.style.background='var(--bg-secondary)'"
             onmouseout="this.style.background='${msg.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)'}'"
             data-id="${msg.id}">
            <div class="notification-avatar" style="background: ${msg.avatarColor}; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.85rem; flex-shrink: 0;">
                ${msg.avatar}
            </div>
            <div class="notification-content" style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.15rem;">
                    <p class="notification-text" style="font-weight: 600; margin: 0;">${msg.sender}</p>
                    <span class="notification-time" style="font-size: 0.7rem;">${msg.time}</span>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${msg.subject}</p>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.25rem 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${msg.preview}</p>
            </div>
            ${msg.read ? '' : '<div style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; flex-shrink: 0;"></div>'}
        </div>
    `).join('');

    if (messages.length === 0) {
        messagesHtml = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No messages</p>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-envelope" style="color: var(--primary); margin-right: 0.5rem;"></i>
                    Messages
                    ${unreadCount > 0 ? `<span style="background: var(--danger); color: white; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 10px; margin-left: 0.5rem;">${unreadCount} new</span>` : ''}
                </h2>
                <button class="modal-close" onclick="closeModal('messagesModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0; max-height: 400px; overflow-y: auto;">
                <div class="notification-list">
                    ${messagesHtml}
                </div>
            </div>
            <div class="modal-footer" style="justify-content: space-between;">
                <button class="btn btn-sm btn-outline" onclick="clearAllMessages()">
                    <i class="fas fa-trash"></i> Clear All
                </button>
                <button class="btn btn-sm btn-primary" onclick="markAllMessagesRead()">
                    <i class="fas fa-check-double"></i> Mark All Read
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal('messagesModal');
    });

    openModal('messagesModal');
}

// View single message
function viewMessage(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    // Mark as read
    msg.read = true;
    updateMessageBadge();

    // Close messages modal
    closeModal('messagesModal');

    // Show message detail modal
    const detailModal = document.createElement('div');
    detailModal.id = 'messageDetailModal';
    detailModal.className = 'modal-overlay';

    detailModal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <h2 class="modal-title" style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; background: ${msg.avatarColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                        ${msg.avatar}
                    </div>
                    <div>
                        <div style="font-size: 1rem;">${msg.sender}</div>
                        <div style="font-size: 0.75rem; font-weight: 400; color: var(--text-secondary);">${msg.email}</div>
                    </div>
                </h2>
                <button class="modal-close" onclick="closeModal('messageDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="background: var(--bg-secondary); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p style="font-weight: 600; color: var(--text-primary); margin: 0;">Subject: ${msg.subject}</p>
                </div>
                <div style="background: var(--bg-card); border: 1px solid var(--bg-secondary); padding: 1rem; border-radius: 8px; white-space: pre-line; line-height: 1.6; color: var(--text-primary);">
                    ${msg.fullMessage}
                </div>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1rem;"><i class="fas fa-clock" style="margin-right: 0.25rem;"></i>${msg.time}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('messageDetailModal'); showMessagesModal();">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <button class="btn btn-primary" onclick="replyToMessage(${msg.id})">
                    <i class="fas fa-reply"></i> Reply
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(detailModal);

    detailModal.addEventListener('click', function (e) {
        if (e.target === detailModal) closeModal('messageDetailModal');
    });

    setTimeout(() => {
        detailModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
}

// Reply to message
function replyToMessage(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    closeModal('messageDetailModal');

    // Show reply modal
    const replyModal = document.createElement('div');
    replyModal.id = 'replyModal';
    replyModal.className = 'modal-overlay';

    replyModal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-reply" style="color: var(--primary); margin-right: 0.5rem;"></i>
                    Reply to ${msg.sender}
                </h2>
                <button class="modal-close" onclick="closeModal('replyModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">To:</label>
                    <input type="email" class="form-input" value="${msg.email}" readonly style="background: var(--bg-secondary);">
                </div>
                <div class="form-group">
                    <label class="form-label">Subject:</label>
                    <input type="text" class="form-input" value="Re: ${msg.subject}" id="replySubject">
                </div>
                <div class="form-group">
                    <label class="form-label">Message:</label>
                    <textarea class="form-input" rows="6" id="replyMessage" placeholder="Type your reply here..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('replyModal')">Cancel</button>
                <button class="btn btn-primary" onclick="sendReply(${msg.id})">
                    <i class="fas fa-paper-plane"></i> Send Reply
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(replyModal);

    replyModal.addEventListener('click', function (e) {
        if (e.target === replyModal) closeModal('replyModal');
    });

    setTimeout(() => {
        replyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
}

// Send reply
function sendReply(msgId) {
    const replyMessage = document.getElementById('replyMessage')?.value;
    if (!replyMessage || replyMessage.trim() === '') {
        showAlert('error', 'Please enter a message.');
        return;
    }

    closeModal('replyModal');
    showAlert('success', 'Reply sent successfully!');
}

// Mark all messages as read
function markAllMessagesRead() {
    messages.forEach(m => m.read = true);
    updateMessageBadge();
    showMessagesModal();
    showAlert('success', 'All messages marked as read!');
}

// Clear all messages
function clearAllMessages() {
    if (messages.length === 0) {
        showAlert('info', 'No messages to clear.');
        return;
    }

    messages = [];
    updateMessageBadge();
    showMessagesModal();
    showAlert('success', 'All messages cleared!');
}

// Update message badge count
function updateMessageBadge() {
    const unreadCount = messages.filter(m => !m.read).length;
    const badges = document.querySelectorAll('.header-btn .badge');

    badges.forEach((badge, index) => {
        // Second badge is messages
        if (index === 1) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    });
}

// Update header trash badge count
function updateHeaderTrashBadge() {
    const trashCount = orderTrash.length + messageTrash.length;
    const badge = document.getElementById('headerTrashBadge');
    if (badge) {
        badge.textContent = trashCount;
        badge.style.display = trashCount > 0 ? 'flex' : 'none';
    }
}

// Show Trash Modal in header
function showTrashModal() {
    // Remove existing modal
    const existingModal = document.getElementById('headerTrashModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'headerTrashModal';
    modal.className = 'modal-overlay';

    const totalTrash = orderTrash.length + messageTrash.length;
    let trashHtml = '';

    if (totalTrash === 0) {
        trashHtml = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-trash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>Trash is empty</p>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">Deleted items will appear here</p>
            </div>
        `;
    } else {
        // Orders section
        if (orderTrash.length > 0) {
            trashHtml += `<div style="padding: 0.5rem 1rem; background: var(--bg-secondary); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">
                <i class="fas fa-shopping-cart"></i> Orders (${orderTrash.length})
            </div>`;
            trashHtml += orderTrash.slice(0, 3).map(order => `
                <div class="notification-item" style="cursor: pointer; padding: 1rem; border-bottom: 1px solid var(--bg-secondary);">
                    <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
                        <div style="width: 40px; height: 40px; background: var(--danger-light); color: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <strong style="color: var(--text-primary);">${order.id}</strong>
                                <span class="badge badge-danger" style="font-size: 0.65rem;">Cancelled</span>
                            </div>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">${order.customer.name}</p>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">EGP ${order.totalAmount.toFixed(2)}</p>
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                            <button class="btn btn-sm btn-success" onclick="restoreOrderFromHeader('${order.id}')" title="Restore">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="permanentlyDeleteFromHeader('${order.id}')" title="Delete Forever">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            if (orderTrash.length > 3) {
                trashHtml += `<div style="padding: 0.5rem 1rem; text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                    +${orderTrash.length - 3} more orders in trash
                </div>`;
            }
        }

        // Messages section
        if (messageTrash.length > 0) {
            trashHtml += `<div style="padding: 0.5rem 1rem; background: var(--bg-secondary); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">
                <i class="fas fa-envelope"></i> Messages (${messageTrash.length})
            </div>`;
            trashHtml += messageTrash.slice(0, 3).map(msg => `
                <div class="notification-item" style="cursor: pointer; padding: 1rem; border-bottom: 1px solid var(--bg-secondary);">
                    <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
                        <div style="width: 40px; height: 40px; background: var(--primary-light); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <strong style="color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${msg.subject}</strong>
                            </div>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">${msg.sender}</p>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.25rem 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${msg.preview}</p>
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                            <button class="btn btn-sm btn-success" onclick="restoreMessageFromHeader(${msg.id})" title="Restore">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="permanentlyDeleteMessageFromHeader(${msg.id})" title="Delete Forever">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            if (messageTrash.length > 3) {
                trashHtml += `<div style="padding: 0.5rem 1rem; text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                    +${messageTrash.length - 3} more messages in trash
                </div>`;
            }
        }
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-trash-alt" style="color: var(--danger); margin-right: 0.5rem;"></i>
                    Trash
                    ${totalTrash > 0 ? `<span style="background: var(--danger); color: white; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 10px; margin-left: 0.5rem;">${totalTrash}</span>` : ''}
                </h2>
                <button class="modal-close" onclick="closeModal('headerTrashModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0; max-height: 400px; overflow-y: auto;">
                ${trashHtml}
            </div>
            <div class="modal-footer" style="justify-content: space-between;">
                <a href="trash.html" class="btn btn-primary" onclick="closeModal('headerTrashModal')">
                    <i class="fas fa-external-link-alt"></i> View All Trash
                </a>
                ${totalTrash > 0 ? `
                <button class="btn btn-danger" onclick="emptyAllTrashFromHeader()">
                    <i class="fas fa-trash"></i> Empty All
                </button>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal('headerTrashModal');
    });

    setTimeout(() => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
}

// Restore order from header trash modal
function restoreOrderFromHeader(orderId) {
    const orderIndex = orderTrash.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        const order = orderTrash[orderIndex];
        order.status = 'pending';
        delete order.deletedDate;
        orders.push(order);
        orderTrash.splice(orderIndex, 1);

        updateHeaderTrashBadge();
        showTrashModal(); // Refresh the modal
        showAlert('success', `Order ${orderId} restored successfully!`);
    }
}

// Permanently delete order from header trash modal
function permanentlyDeleteFromHeader(orderId) {
    if (confirm('Are you sure you want to permanently delete this order? This action cannot be undone.')) {
        const orderIndex = orderTrash.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            orderTrash.splice(orderIndex, 1);
            updateHeaderTrashBadge();
            showTrashModal(); // Refresh the modal
            showAlert('success', `Order ${orderId} permanently deleted.`);
        }
    }
}

// Restore message from header trash modal
function restoreMessageFromHeader(msgId) {
    const msgIndex = messageTrash.findIndex(m => m.id === msgId);
    if (msgIndex !== -1) {
        const msg = messageTrash[msgIndex];
        delete msg.deletedDate;
        messages.push(msg);
        messageTrash.splice(msgIndex, 1);

        updateHeaderTrashBadge();
        updateMessageBadge();
        showTrashModal(); // Refresh the modal
        showAlert('success', `Message "${msg.subject}" restored successfully!`);
    }
}

// Permanently delete message from header trash modal
function permanentlyDeleteMessageFromHeader(msgId) {
    if (confirm('Are you sure you want to permanently delete this message? This action cannot be undone.')) {
        const msgIndex = messageTrash.findIndex(m => m.id === msgId);
        if (msgIndex !== -1) {
            messageTrash.splice(msgIndex, 1);
            updateHeaderTrashBadge();
            showTrashModal(); // Refresh the modal
            showAlert('success', 'Message permanently deleted.');
        }
    }
}

// Move message to trash (instead of permanent delete)
function moveMessageToTrash(msgId) {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex !== -1) {
        const msg = messages[msgIndex];
        msg.deletedDate = new Date().toISOString();
        messageTrash.push(msg);
        messages.splice(msgIndex, 1);

        updateHeaderTrashBadge();
        updateMessageBadge();
        return msg;
    }
    return null;
}

// Empty all trash from header modal (orders + messages)
function emptyAllTrashFromHeader() {
    const totalItems = orderTrash.length + messageTrash.length;
    if (totalItems === 0) {
        showAlert('info', 'Trash is already empty.');
        return;
    }

    if (confirm(`Are you sure you want to permanently delete all ${totalItems} items? This action cannot be undone.`)) {
        orderTrash = [];
        messageTrash = [];
        updateHeaderTrashBadge();
        closeModal('headerTrashModal');
        showAlert('success', 'Trash emptied successfully!');
    }
}

// Expose trash functions globally
window.showTrashModal = showTrashModal;
window.restoreOrderFromHeader = restoreOrderFromHeader;
window.permanentlyDeleteFromHeader = permanentlyDeleteFromHeader;
window.restoreMessageFromHeader = restoreMessageFromHeader;
window.permanentlyDeleteMessageFromHeader = permanentlyDeleteMessageFromHeader;
window.moveMessageToTrash = moveMessageToTrash;
window.emptyAllTrashFromHeader = emptyAllTrashFromHeader;
window.updateHeaderTrashBadge = updateHeaderTrashBadge;
window.orderTrash = orderTrash;
window.messageTrash = messageTrash;

// ===== FILTER & SEARCH FUNCTIONS =====

// Filter Products
function filterProducts() {
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';
    const search = document.getElementById('productSearch')?.value || '';

    renderProductsGrid('productsGrid', category, status, search);
}

// Setup Filter Listeners
function setupFilterListeners() {
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const productSearch = document.getElementById('productSearch');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterProducts);
    }
    if (productSearch) {
        productSearch.addEventListener('input', filterProducts);
    }
}

// ===== DATE FILTER FUNCTIONS =====

// Set Active Date Filter
function setActiveDateFilter(button) {
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    // Get the filter type
    const filterType = button.textContent.toLowerCase().trim();

    // Update dashboard data based on filter
    updateDashboardData(filterType);
}

// Update Dashboard Data based on time period
function updateDashboardData(period) {
    const stats = dashboardStatsByPeriod[period];
    if (!stats) return;

    // Update stats cards with animation
    updateStatCard('revenue', stats.totalRevenue, stats.revenueGrowth, 'EGP ');
    updateStatCard('orders', stats.totalOrders, stats.ordersGrowth);
    updateStatCard('customers', stats.totalCustomers, stats.customersGrowth);
    updateStatCard('products', stats.totalProducts, stats.productsChange);

    // Update charts
    createRevenueChart('revenueChart', period);
    createCategoryChart('categoryChart', period);

    // Update chart labels
    const chartLabels = {
        today: 'Today',
        week: 'Last 7 Days',
        month: 'Last 30 Days',
        year: 'Last 12 Months'
    };

    const revenueLabel = document.getElementById('revenueChartLabel');
    if (revenueLabel) {
        revenueLabel.textContent = chartLabels[period] || 'Last 7 Days';
    }
}

// Update individual stat card
function updateStatCard(type, value, change, prefix = '') {
    const statCards = document.querySelectorAll('.stat-card');
    let targetCard = null;

    statCards.forEach(card => {
        const title = card.querySelector('.stat-info h3');
        if (title) {
            const titleText = title.textContent.toLowerCase();
            if (type === 'revenue' && titleText.includes('revenue')) targetCard = card;
            if (type === 'orders' && titleText.includes('orders')) targetCard = card;
            if (type === 'customers' && titleText.includes('customers')) targetCard = card;
            if (type === 'products' && titleText.includes('products')) targetCard = card;
        }
    });

    if (!targetCard) return;

    const valueElement = targetCard.querySelector('.stat-value');
    const changeElement = targetCard.querySelector('.stat-change');

    if (valueElement) {
        // Animate the value change
        animateValue(valueElement, value, prefix);
    }

    if (changeElement) {
        // Update change indicator
        const isPositive = change >= 0;
        changeElement.className = 'stat-change ' + (isPositive ? 'positive' : 'negative');
        changeElement.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            <span>${isPositive ? '+' : ''}${change}% from last period</span>
        `;
    }
}

// Animate value change
function animateValue(element, target, prefix = '') {
    const duration = 800;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }

        element.textContent = prefix + formatNumber(Math.floor(current));
    }, 16);
}

// ===== STATS ANIMATION =====

// Animate Counter
function animateCounter(element, target, prefix = '', suffix = '') {
    const duration = 1500;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }

        if (Number.isInteger(target)) {
            element.textContent = prefix + formatNumber(Math.floor(current)) + suffix;
        } else {
            element.textContent = prefix + current.toFixed(1) + suffix;
        }
    }, 16);
}

// Initialize Stats Animation
function initStatsAnimation() {
    const statElements = document.querySelectorAll('.stat-value[data-target]');

    statElements.forEach(element => {
        const target = parseFloat(element.dataset.target);
        let prefix = element.dataset.prefix || '';
        const suffix = element.dataset.suffix || '';

        // Convert $ to EGP if present
        if (prefix === '$') {
            prefix = 'EGP ';
        }

        animateCounter(element, target, prefix, suffix);
    });
}

// ===== SETTINGS FUNCTIONS =====

// Save General Settings
function saveGeneralSettings(event) {
    event.preventDefault();
    showAlert('success', 'General settings saved successfully!');
}

// Save Notification Settings
function saveNotificationSettings(event) {
    event.preventDefault();
    showAlert('success', 'Notification settings saved successfully!');
}

// Save Payment Settings
function savePaymentSettings(event) {
    event.preventDefault();
    showAlert('success', 'Payment settings saved successfully!');
}

// Update Password
function updatePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('error', 'Please fill in all password fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('error', 'New passwords do not match.');
        return;
    }

    if (newPassword.length < 8) {
        showAlert('error', 'Password must be at least 8 characters long.');
        return;
    }

    showAlert('success', 'Password updated successfully!');

    // Clear form
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

// ===== ORDER FILTER FUNCTIONS =====

// Current order filters
let currentOrderFilters = {
    status: 'all',
    depositStatus: 'all',
    date: 'all',
    search: '',
    minAmount: null,
    maxAmount: null
};

// Filter Orders - Open modal
function filterOrders() {
    openModal('orderFilterModal');
}

// Filter by status (from status cards)
function filterByStatus(status) {
    currentOrderFilters.status = status;
    document.getElementById('orderStatusFilter').value = status;
    applyOrderFilters();
}

// Apply order filters from the filter bar
function applyOrderFilters() {
    const statusFilter = document.getElementById('orderStatusFilter');
    const depositStatusFilter = document.getElementById('depositStatusFilter');
    const dateFilter = document.getElementById('orderDateFilter');
    const searchInput = document.getElementById('orderSearch');

    if (statusFilter) currentOrderFilters.status = statusFilter.value;
    if (depositStatusFilter) currentOrderFilters.depositStatus = depositStatusFilter.value;
    if (dateFilter) currentOrderFilters.date = dateFilter.value;
    if (searchInput) currentOrderFilters.search = searchInput.value.toLowerCase();

    renderFilteredOrders();
}

// Apply filters from modal
function applyModalFilters() {
    const statusFilter = document.getElementById('modalStatusFilter');
    const dateFilter = document.getElementById('modalDateFilter');
    const minAmount = document.getElementById('modalMinAmount');
    const maxAmount = document.getElementById('modalMaxAmount');

    if (statusFilter) {
        currentOrderFilters.status = statusFilter.value;
        document.getElementById('orderStatusFilter').value = statusFilter.value;
    }
    if (dateFilter) {
        currentOrderFilters.date = dateFilter.value;
        document.getElementById('orderDateFilter').value = dateFilter.value;
    }
    if (minAmount && minAmount.value) {
        currentOrderFilters.minAmount = parseFloat(minAmount.value);
    } else {
        currentOrderFilters.minAmount = null;
    }
    if (maxAmount && maxAmount.value) {
        currentOrderFilters.maxAmount = parseFloat(maxAmount.value);
    } else {
        currentOrderFilters.maxAmount = null;
    }

    closeModal('orderFilterModal');
    renderFilteredOrders();
}

// Clear all order filters
function clearOrderFilters() {
    currentOrderFilters = {
        status: 'all',
        depositStatus: 'all',
        date: 'all',
        search: '',
        minAmount: null,
        maxAmount: null
    };

    // Reset filter inputs
    const statusFilter = document.getElementById('orderStatusFilter');
    const depositStatusFilter = document.getElementById('depositStatusFilter');
    const dateFilter = document.getElementById('orderDateFilter');
    const searchInput = document.getElementById('orderSearch');

    if (statusFilter) statusFilter.value = 'all';
    if (depositStatusFilter) depositStatusFilter.value = 'all';
    if (dateFilter) dateFilter.value = 'all';
    if (searchInput) searchInput.value = '';

    renderFilteredOrders();
}

// Render filtered orders
function renderFilteredOrders() {
    const container = document.getElementById('ordersTableBody');
    if (!container) return;

    let filteredOrders = orders.filter(order => {
        // Status filter
        if (currentOrderFilters.status !== 'all' && order.status !== currentOrderFilters.status) {
            return false;
        }

        // Deposit status filter
        if (currentOrderFilters.depositStatus !== 'all' && order.depositStatus !== currentOrderFilters.depositStatus) {
            return false;
        }

        // Date filter
        if (currentOrderFilters.date !== 'all') {
            const orderDate = new Date(order.date);
            const today = new Date();

            if (currentOrderFilters.date === 'today') {
                if (orderDate.toDateString() !== today.toDateString()) return false;
            } else if (currentOrderFilters.date === 'week') {
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (orderDate < weekAgo) return false;
            } else if (currentOrderFilters.date === 'month') {
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                if (orderDate < monthAgo) return false;
            }
        }

        // Search filter
        if (currentOrderFilters.search) {
            const searchTerm = currentOrderFilters.search;
            const matchesId = order.id.toLowerCase().includes(searchTerm);
            const matchesCustomer = order.customer.name.toLowerCase().includes(searchTerm);
            const matchesEmail = order.customer.email.toLowerCase().includes(searchTerm);
            if (!matchesId && !matchesCustomer && !matchesEmail) return false;
        }

        // Amount filters
        if (currentOrderFilters.minAmount !== null && order.amount < currentOrderFilters.minAmount) {
            return false;
        }
        if (currentOrderFilters.maxAmount !== null && order.amount > currentOrderFilters.maxAmount) {
            return false;
        }

        return true;
    });

    // Update orders count
    const countElement = document.getElementById('ordersCount');
    if (countElement) {
        countElement.textContent = `${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''}`;
    }

    // Render table
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th><input type="checkbox" id="selectAll" onchange="selectAllOrders(this)"></th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Deposit</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (filteredOrders.length === 0) {
        html += `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    No orders found matching your filters
                </td>
            </tr>
        `;
    } else {
        filteredOrders.forEach(order => {
            const depositBadgeClass = order.depositStatus === 'paid' ? 'badge-delivered' :
                order.depositStatus === 'pending' ? 'badge-pending' :
                    order.depositStatus === 'refunded' ? 'badge-shipped' : 'badge-inactive';
            const depositLabel = order.depositStatus === 'paid' ? `Paid (${formatCurrency(order.depositAmount)})` :
                order.depositStatus === 'pending' ? 'Awaiting' :
                    order.depositStatus === 'refunded' ? 'Refunded' : 'N/A';

            html += `
                <tr>
                    <td><input type="checkbox" class="order-checkbox" data-id="${order.id}"></td>
                    <td><strong>#${order.id}</strong></td>
                    <td>
                        <div class="customer-cell">
                            <span class="customer-name">${order.customer.name}</span>
                            <span class="customer-email">${order.customer.phone || order.customer.email}</span>
                        </div>
                    </td>
                    <td>${order.date}</td>
                    <td><strong>${formatCurrency(order.amount)}</strong></td>
                    <td><span class="badge ${depositBadgeClass}">${depositLabel}</span></td>
                    <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
                    <td>
                        <button class="action-btn view" onclick="viewOrder('${order.id}')" title="View Order">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${order.depositStatus === 'pending' ? `
                        <button class="action-btn add" onclick="confirmDeposit('${order.id}')" title="Confirm Deposit">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
                        <button class="action-btn delete" onclick="confirmMoveToTrash('${order.id}')" title="Move to Trash">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===== EXPORT FUNCTIONS =====

// Export Orders
function exportOrders() {
    showAlert('info', 'Exporting orders to CSV...\n\nIn a real application, this would download a CSV file with all order data.');
}

// Generate Report
function generateReport() {
    showAlert('info', 'Generating analytics report...\n\nIn a real application, this would generate a PDF report with charts and insights.');
}

// Import Inventory
function importInventory() {
    showAlert('info', 'Import Inventory\n\nIn a real application, this would open a file picker to import inventory data from CSV/Excel.');
}

// ===== FORM SUBMISSION HANDLERS =====

// Handle Add Product Form
function handleAddProductForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Validate required fields
    const requiredFields = ['productName', 'productSku', 'productCategory', 'productPrice', 'productStock'];
    let isValid = true;
    let missingFields = [];

    requiredFields.forEach(field => {
        if (!formData.get(field)) {
            isValid = false;
            missingFields.push(field.replace('product', ''));
        }
    });

    if (!isValid) {
        showAlert('error', `Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
    }

    addProduct(formData);
}

// ===== INITIALIZATION =====

// Initialize Dashboard
function initDashboard() {
    // Set active navigation item
    setActiveNavItem();

    // Setup modal close on click outside
    setupModalCloseOnClickOutside();

    // Setup filter listeners
    setupFilterListeners();

    // Load saved branding (logo and store name)
    updateSidebarBranding();

    // Update header trash badge
    updateHeaderTrashBadge();

    // Initialize stats animation after a short delay
    setTimeout(initStatsAnimation, 500);

    // Page-specific initialization
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    switch (currentPage) {
        case 'index.html':
        case '':
            initOverviewPage();
            break;
        case 'products.html':
            initProductsPage();
            break;
        case 'orders.html':
            initOrdersPage();
            break;
        case 'customers.html':
            initCustomersPage();
            break;
        case 'analytics.html':
            initAnalyticsPage();
            break;
        case 'inventory.html':
            initInventoryPage();
            break;
        case 'settings.html':
            initSettingsPage();
            break;
    }
}

// Initialize Overview Page
function initOverviewPage() {
    createRevenueChart('revenueChart');
    createCategoryChart('categoryChart');
    renderRecentOrders('recentOrdersTable');
    renderTopProducts('topProductsList');
}

// Initialize Products Page
function initProductsPage() {
    renderProductsGrid('productsGrid');
}

// Initialize Orders Page
function initOrdersPage() {
    // Render orders
    renderFilteredOrders();

    // Update trash count
    updateTrashCount();

    // Update cancelled count in stats
    const cancelledCount = document.getElementById('cancelledCount');
    if (cancelledCount) {
        cancelledCount.textContent = orderTrash.length;
    }
}

// Initialize Customers Page
function initCustomersPage() {
    renderFilteredCustomers();

    // Add Customer Form
    const addCustomerForm = document.getElementById('addCustomerForm');
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', addNewCustomer);
    }

    // Edit Customer Form
    const editCustomerForm = document.getElementById('editCustomerForm');
    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', saveEditedCustomer);
    }
}

// Initialize Analytics Page
function initAnalyticsPage() {
    createSalesChart('salesChart');
    createCustomerGrowthChart('customerGrowthChart');
    createRevenueByCategoryChart('revenueCategoryChart');
}

// Initialize Inventory Page
function initInventoryPage() {
    renderInventoryTable('inventoryTable');
    updateLowStockAlert();
}

// Update Low Stock Alert
function updateLowStockAlert() {
    const lowStockProducts = products.filter(p => {
        const status = getStockStatus(p.stock, p.minStock);
        return status === 'low-stock' || status === 'out-of-stock';
    });

    const alertElement = document.getElementById('lowStockAlert');
    const countElement = document.getElementById('lowStockCount');

    if (alertElement && countElement) {
        if (lowStockProducts.length > 0) {
            countElement.textContent = lowStockProducts.length;
            alertElement.style.display = 'flex';
        } else {
            alertElement.style.display = 'none';
        }
    }
}

// View Low Stock Details
function viewLowStockDetails() {
    const lowStockProducts = products.filter(p => {
        const status = getStockStatus(p.stock, p.minStock);
        return status === 'low-stock' || status === 'out-of-stock';
    });

    if (lowStockProducts.length === 0) {
        showAlert('success', 'All products have sufficient stock!');
        return;
    }

    // Remove existing modal if any
    const existingModal = document.getElementById('lowStockModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'lowStockModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);

    // Generate products list
    let productsHtml = lowStockProducts.map(product => {
        const status = getStockStatus(product.stock, product.minStock);
        const statusLabel = status === 'out-of-stock' ? 'Out of Stock' : 'Low Stock';
        const statusColor = status === 'out-of-stock' ? 'var(--danger)' : 'var(--warning)';
        const initials = getInitials(product.name);
        const bgColor = getAvatarColor(product.name);
        const urgency = product.stock === 0 ? 'URGENT' : product.stock <= product.minStock / 2 ? 'HIGH' : 'MEDIUM';
        const urgencyColor = urgency === 'URGENT' ? 'var(--danger)' : urgency === 'HIGH' ? 'var(--warning)' : 'var(--info)';

        return `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--bg-secondary); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">
                <div style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: ${bgColor};">
                    <img src="${product.image}" alt="${product.name}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.85rem;">
                        ${initials}
                    </div>
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <strong style="color: var(--text-primary);">${product.name}</strong>
                        <span style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background: ${urgencyColor}; color: white; border-radius: 3px; font-weight: 600;">${urgency}</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">${product.sku} • ${product.category}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 1.25rem; font-weight: 700; color: ${statusColor};">${product.stock}</p>
                    <p style="font-size: 0.7rem; color: var(--text-secondary);">min: ${product.minStock}</p>
                </div>
                <button class="btn btn-sm btn-success" onclick="closeModal('lowStockModal'); updateStock(${product.id});" style="flex-shrink: 0;">
                    <i class="fas fa-plus"></i> Restock
                </button>
            </div>
        `;
    }).join('');

    const outOfStockCount = lowStockProducts.filter(p => p.stock === 0).length;
    const lowStockCount = lowStockProducts.length - outOfStockCount;

    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--warning) 0%, var(--danger) 100%); color: white;">
                <h2 class="modal-title" style="color: white;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                    Low Stock Alert
                </h2>
                <button class="modal-close" onclick="closeModal('lowStockModal')" style="color: white;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <!-- Summary -->
                <div style="display: flex; gap: 1rem; padding: 1rem; background: var(--bg-secondary);">
                    <div style="flex: 1; text-align: center; padding: 0.75rem; background: var(--bg-card); border-radius: var(--border-radius-md);">
                        <p style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">${outOfStockCount}</p>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Out of Stock</p>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 0.75rem; background: var(--bg-card); border-radius: var(--border-radius-md);">
                        <p style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${lowStockCount}</p>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Low Stock</p>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 0.75rem; background: var(--bg-card); border-radius: var(--border-radius-md);">
                        <p style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${lowStockProducts.length}</p>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Total Items</p>
                    </div>
                </div>
                
                <!-- Products List -->
                <div style="max-height: 350px; overflow-y: auto;">
                    ${productsHtml}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('lowStockModal')">Close</button>
                <button class="btn btn-primary" onclick="closeModal('lowStockModal'); restockAllLowStock();">
                    <i class="fas fa-boxes"></i> Restock All
                </button>
            </div>
        </div>
    `;

    // Add click outside to close
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal('lowStockModal');
        }
    });

    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
}

// Restock All Low Stock Products
function restockAllLowStock() {
    const lowStockProducts = products.filter(p => {
        const status = getStockStatus(p.stock, p.minStock);
        return status === 'low-stock' || status === 'out-of-stock';
    });

    let restockedCount = 0;
    lowStockProducts.forEach(product => {
        // Set stock to minimum + 50% buffer
        const newStock = Math.ceil(product.minStock * 1.5);
        if (product.stock < newStock) {
            product.stock = newStock;
            product.status = 'active';
            restockedCount++;
        }
    });

    renderInventoryTable('inventoryTable');
    updateLowStockAlert();

    if (restockedCount > 0) {
        showAlert('success', `Successfully restocked ${restockedCount} products to safe levels!`);
    } else {
        showAlert('info', 'All products already have sufficient stock.');
    }
}

// Initialize Settings Page
function initSettingsPage() {
    // Load saved settings
    loadSavedSettings();
    console.log('Settings page initialized');
}

// Load saved settings from localStorage
function loadSavedSettings() {
    // Load logo
    const savedLogo = localStorage.getItem('freezyBiteLogo');
    if (savedLogo) {
        const logoImg = document.getElementById('currentLogo');
        const defaultIcon = document.getElementById('defaultLogoIcon');
        if (logoImg && defaultIcon) {
            logoImg.src = savedLogo;
            logoImg.style.display = 'block';
            defaultIcon.style.display = 'none';
        }
    }

    // Load store settings
    const storeName = localStorage.getItem('freezyBiteStoreName');
    const storeTagline = localStorage.getItem('freezyBiteTagline');
    const storeEmail = localStorage.getItem('freezyBiteEmail');
    const storePhone = localStorage.getItem('freezyBitePhone');
    const storeAddress = localStorage.getItem('freezyBiteAddress');
    const instapayNumber = localStorage.getItem('freezyBiteInstaPay');

    if (storeName) document.getElementById('storeName')?.setAttribute('value', storeName);
    if (storeTagline) document.getElementById('storeTagline')?.setAttribute('value', storeTagline);
    if (storeEmail) document.getElementById('storeEmail')?.setAttribute('value', storeEmail);
    if (storePhone) document.getElementById('storePhone')?.setAttribute('value', storePhone);
    if (storeAddress && document.getElementById('storeAddress')) document.getElementById('storeAddress').value = storeAddress;
    if (instapayNumber) document.getElementById('instapayNumber')?.setAttribute('value', instapayNumber);
}

// Preview logo before upload
function previewLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const logoImg = document.getElementById('currentLogo');
            const defaultIcon = document.getElementById('defaultLogoIcon');
            if (logoImg && defaultIcon) {
                logoImg.src = e.target.result;
                logoImg.style.display = 'block';
                defaultIcon.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
}

// Save branding settings
function saveBrandingSettings() {
    const logoImg = document.getElementById('currentLogo');
    const storeName = document.getElementById('storeName')?.value;
    const storeTagline = document.getElementById('storeTagline')?.value;

    // Save logo to localStorage
    if (logoImg && logoImg.src && logoImg.style.display !== 'none') {
        localStorage.setItem('freezyBiteLogo', logoImg.src);
    }

    if (storeName) localStorage.setItem('freezyBiteStoreName', storeName);
    if (storeTagline) localStorage.setItem('freezyBiteTagline', storeTagline);

    // Update sidebar logo if needed
    updateSidebarBranding();

    showAlert('success', 'Branding settings saved successfully!');
}

// Save general settings
function saveGeneralSettings() {
    const storeEmail = document.getElementById('storeEmail')?.value;
    const storePhone = document.getElementById('storePhone')?.value;
    const storeAddress = document.getElementById('storeAddress')?.value;
    const storeCurrency = document.getElementById('storeCurrency')?.value;

    if (storeEmail) localStorage.setItem('freezyBiteEmail', storeEmail);
    if (storePhone) localStorage.setItem('freezyBitePhone', storePhone);
    if (storeAddress) localStorage.setItem('freezyBiteAddress', storeAddress);
    if (storeCurrency) localStorage.setItem('freezyBiteCurrency', storeCurrency);

    showAlert('success', 'Store information saved successfully!');
}

// Save notification settings
function saveNotificationSettings() {
    showAlert('success', 'Notification settings saved successfully!');
}

// Save payment settings
function savePaymentSettings() {
    const instapayNumber = document.getElementById('instapayNumber')?.value;
    if (instapayNumber) localStorage.setItem('freezyBiteInstaPay', instapayNumber);

    showAlert('success', 'Payment settings saved successfully!\n\nInstaPay: ' + instapayNumber);
}

// Update password
function updatePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('error', 'Please fill in all password fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('error', 'New passwords do not match!');
        return;
    }

    if (newPassword.length < 6) {
        showAlert('error', 'Password must be at least 6 characters long.');
        return;
    }

    // Clear fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    showAlert('success', 'Password updated successfully!');
}

// Update sidebar branding
function updateSidebarBranding() {
    const savedLogo = localStorage.getItem('freezyBiteLogo');
    const savedName = localStorage.getItem('freezyBiteStoreName');

    // Update logo in sidebar
    const sidebarLogoIcon = document.querySelector('.sidebar-logo .logo-icon');
    if (sidebarLogoIcon && savedLogo) {
        sidebarLogoIcon.innerHTML = `<img src="${savedLogo}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">`;
    }

    // Update store name in sidebar
    const sidebarLogoText = document.querySelector('.sidebar-logo span');
    if (sidebarLogoText && savedName) {
        sidebarLogoText.textContent = savedName;
    }
}

// ===== PRODUCTS RENDERING =====

// Render products in the admin products table/grid
function renderProducts() {
    const grid = document.getElementById('productsGrid') || document.querySelector('.products-grid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>No Products Found</h3>
                <p>Add your first product to get started.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image-wrapper">
                <img src="${product.image || product.images?.[0] || 'https://placehold.co/200x150/f1f5f9/64748b?text=No+Image'}" 
                     alt="${product.name}" 
                     class="product-image"
                     onerror="handleImageError(this)">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-sku">${product.sku || 'No SKU'}</p>
                <div class="product-meta">
                    <span class="product-category">${product.category || 'Uncategorized'}</span>
                    <span class="product-price">${formatCurrency(product.price)}</span>
                </div>
                <div class="product-stock">
                    <span class="stock-badge ${getStockStatus(product.stock, product.minStock)}">
                        ${product.stock} in stock
                    </span>
                </div>
                <span class="badge ${getStatusBadgeClass(product.status)}">${product.status}</span>
            </div>
            <div class="product-actions">
                <button class="btn btn-sm btn-secondary" onclick="editProduct(${product.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Edit product - populate edit form and open modal
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductSku').value = product.sku || '';
    document.getElementById('editProductCategory').value = product.category || '';
    document.getElementById('editProductPrice').value = product.price || '';
    document.getElementById('editProductStock').value = product.stock || 0;
    document.getElementById('editProductMinStock').value = product.minStock || 20;
    document.getElementById('editProductStatus').value = product.status || 'active';
    document.getElementById('editProductDescription').value = product.description || '';

    openModal('editProductModal');
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        await DashboardAPI.deleteProduct(productId);
        showAlert('success', 'Product deleted successfully!');
        // Reload products
        const apiProducts = await DashboardAPI.getProducts();
        products.length = 0;
        apiProducts.forEach(p => {
            products.push({
                id: p.id,
                name: p.name,
                sku: p.sku || '',
                category: p.category || '',
                price: parseFloat(p.price) || 0,
                stock: p.stock || 0,
                minStock: p.minStock || 10,
                status: p.status || 'active',
                image: p.images?.[0] || '',
                description: p.description || ''
            });
        });
        renderProducts();
    } catch (err) {
        // Fallback to local-only
        const idx = products.findIndex(p => p.id === productId);
        if (idx !== -1) products.splice(idx, 1);
        renderProducts();
        showAlert('warning', 'Deleted locally (API unavailable)');
    }
}

// ===== EXPOSE FUNCTIONS GLOBALLY =====
// Make functions available for onclick handlers in dynamically generated HTML
window.updateStock = updateStock;
window.saveStock = saveStock;
window.addToStock = addToStock;
window.viewLowStockDetails = viewLowStockDetails;
window.restockAllLowStock = restockAllLowStock;
window.openAddStockModal = openAddStockModal;
window.selectProductForStock = selectProductForStock;
window.openModal = openModal;
window.closeModal = closeModal;
window.showAlert = showAlert;
window.viewCustomer = viewCustomer;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.viewOrderFromCustomer = viewOrderFromCustomer;
window.filterCustomerOrders = filterCustomerOrders;
window.updateOrderStatusFromModal = updateOrderStatusFromModal;
window.handleOrderStockChange = handleOrderStockChange;
window.deductStock = deductStock;
window.restoreStock = restoreStock;
window.previewLogo = previewLogo;
window.saveBrandingSettings = saveBrandingSettings;
window.saveGeneralSettings = saveGeneralSettings;
window.saveNotificationSettings = saveNotificationSettings;
window.savePaymentSettings = savePaymentSettings;
window.updatePassword = updatePassword;
window.viewNotification = viewNotification;
window.markAllNotificationsRead = markAllNotificationsRead;
window.clearAllNotifications = clearAllNotifications;
window.handleNotificationAction = handleNotificationAction;
window.addNotification = addNotification;
window.viewMessage = viewMessage;
window.replyToMessage = replyToMessage;
window.sendReply = sendReply;
window.markAllMessagesRead = markAllMessagesRead;
window.clearAllMessages = clearAllMessages;
window.renderProducts = renderProducts;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

// ===== EVENT LISTENERS =====

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function () {
    initDashboard();

    // Sidebar toggle button
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Mobile menu button
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }

    // Sidebar overlay
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Date filter buttons
    const dateFilterBtns = document.querySelectorAll('.date-filter-btn');
    dateFilterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            setActiveDateFilter(this);
        });
    });

    // Add product form
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProductForm);
    }

    // Edit product form
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', saveEditedProduct);
    }

    // Settings forms
    const generalSettingsForm = document.getElementById('generalSettingsForm');
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', saveGeneralSettings);
    }

    const notificationSettingsForm = document.getElementById('notificationSettingsForm');
    if (notificationSettingsForm) {
        notificationSettingsForm.addEventListener('submit', saveNotificationSettings);
    }

    const paymentSettingsForm = document.getElementById('paymentSettingsForm');
    if (paymentSettingsForm) {
        paymentSettingsForm.addEventListener('submit', savePaymentSettings);
    }

    const securityForm = document.getElementById('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', updatePassword);
    }
});

// Window Resize Handler
window.addEventListener('resize', function () {
    // Close mobile sidebar on resize to desktop
    if (window.innerWidth > 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
});

// ===== HELPER FUNCTIONS FOR HTML =====

// Get Low Stock Count
function getLowStockCount() {
    return products.filter(p => p.stock > 0 && p.stock <= p.minStock).length +
        products.filter(p => p.stock === 0).length;
}

// Get Low Stock Products
function getLowStockProducts() {
    return products.filter(p => p.stock <= p.minStock);
}

// Calculate Progress Bar Width
function calculateProgressWidth(value, max) {
    return Math.min((value / max) * 100, 100);
}

// ===== EMPLOYEE ACTIVITY TRACKING SYSTEM =====

// Global employees data (shared across pages)
let globalEmployees = JSON.parse(localStorage.getItem('freezyBiteEmployees')) || [
    {
        id: 'EMP-001',
        name: 'Ahmed Hassan',
        email: 'ahmed@freezybite.com',
        phone: '+20 101 234 5678',
        department: 'sales',
        position: 'Senior Sales Associate',
        status: 'active',
        hireDate: '2023-06-15',
        salary: 8500,
        address: 'Cairo, Egypt',
        avatar: null,
        stats: { orders: 156, messages: 42, inventory: 8 }
    },
    {
        id: 'EMP-002',
        name: 'Fatima Ali',
        email: 'fatima@freezybite.com',
        phone: '+20 102 345 6789',
        department: 'support',
        position: 'Customer Support Lead',
        status: 'active',
        hireDate: '2023-03-20',
        salary: 9000,
        address: 'Giza, Egypt',
        avatar: null,
        stats: { orders: 23, messages: 234, inventory: 2 }
    },
    {
        id: 'EMP-003',
        name: 'Mohamed Ibrahim',
        email: 'mohamed@freezybite.com',
        phone: '+20 103 456 7890',
        department: 'inventory',
        position: 'Inventory Manager',
        status: 'active',
        hireDate: '2023-01-10',
        salary: 10000,
        address: 'Alexandria, Egypt',
        avatar: null,
        stats: { orders: 5, messages: 18, inventory: 312 }
    },
    {
        id: 'EMP-004',
        name: 'Sara Mahmoud',
        email: 'sara@freezybite.com',
        phone: '+20 104 567 8901',
        department: 'sales',
        position: 'Sales Associate',
        status: 'on-leave',
        hireDate: '2023-09-01',
        salary: 6500,
        address: 'Cairo, Egypt',
        avatar: null,
        stats: { orders: 89, messages: 15, inventory: 0 }
    },
    {
        id: 'EMP-005',
        name: 'Omar Khaled',
        email: 'omar@freezybite.com',
        phone: '+20 105 678 9012',
        department: 'delivery',
        position: 'Delivery Driver',
        status: 'active',
        hireDate: '2023-07-22',
        salary: 5500,
        address: 'Cairo, Egypt',
        avatar: null,
        stats: { orders: 245, messages: 8, inventory: 0 }
    },
    {
        id: 'EMP-006',
        name: 'Nour Ahmed',
        email: 'nour@freezybite.com',
        phone: '+20 106 789 0123',
        department: 'support',
        position: 'Support Agent',
        status: 'inactive',
        hireDate: '2023-04-15',
        salary: 5000,
        address: 'Mansoura, Egypt',
        avatar: null,
        stats: { orders: 0, messages: 156, inventory: 0 }
    }
];

// Global activity log (shared across pages)
let globalActivityLog = JSON.parse(localStorage.getItem('freezyBiteActivityLog')) || [
    { id: 1, employeeId: 'EMP-001', employeeName: 'Ahmed Hassan', type: 'order', action: 'Created order #ORD-2024-015', timestamp: '2024-01-14 10:35:00' },
    { id: 2, employeeId: 'EMP-002', employeeName: 'Fatima Ali', type: 'message', action: 'Replied to customer inquiry from John Smith', timestamp: '2024-01-14 10:20:00' },
    { id: 3, employeeId: 'EMP-003', employeeName: 'Mohamed Ibrahim', type: 'inventory', action: 'Added 50 units of Strawberry Freeze', timestamp: '2024-01-14 09:45:00' },
    { id: 4, employeeId: 'EMP-005', employeeName: 'Omar Khaled', type: 'order', action: 'Delivered order #ORD-2024-012', timestamp: '2024-01-14 09:30:00' },
    { id: 5, employeeId: 'EMP-001', employeeName: 'Ahmed Hassan', type: 'customer', action: 'Added new customer: Premium Foods Inc.', timestamp: '2024-01-14 09:15:00' },
    { id: 6, employeeId: 'EMP-003', employeeName: 'Mohamed Ibrahim', type: 'product', action: 'Updated price for Chocolate Delight', timestamp: '2024-01-14 09:00:00' },
    { id: 7, employeeId: 'EMP-002', employeeName: 'Fatima Ali', type: 'message', action: 'Resolved support ticket #TKT-4521', timestamp: '2024-01-13 17:30:00' },
    { id: 8, employeeId: 'EMP-001', employeeName: 'Ahmed Hassan', type: 'order', action: 'Processed payment for order #ORD-2024-011', timestamp: '2024-01-13 16:45:00' },
    { id: 9, employeeId: 'EMP-005', employeeName: 'Omar Khaled', type: 'order', action: 'Picked up order #ORD-2024-010 for delivery', timestamp: '2024-01-13 15:20:00' },
    { id: 10, employeeId: 'EMP-003', employeeName: 'Mohamed Ibrahim', type: 'inventory', action: 'Restocked Mixed Candy Pack - 100 units', timestamp: '2024-01-13 14:00:00' }
];

// Current active employee (who is performing actions)
let currentActiveEmployee = JSON.parse(localStorage.getItem('freezyBiteActiveEmployee')) || globalEmployees[0];

// Save employee data to localStorage
function saveEmployeeData() {
    localStorage.setItem('freezyBiteEmployees', JSON.stringify(globalEmployees));
    localStorage.setItem('freezyBiteActivityLog', JSON.stringify(globalActivityLog));
    localStorage.setItem('freezyBiteActiveEmployee', JSON.stringify(currentActiveEmployee));
}

// Log an activity
function logEmployeeActivity(type, action) {
    if (!currentActiveEmployee) return;

    const newActivity = {
        id: Date.now(),
        employeeId: currentActiveEmployee.id,
        employeeName: currentActiveEmployee.name,
        type: type,
        action: action,
        timestamp: new Date().toLocaleString()
    };

    globalActivityLog.unshift(newActivity);

    // Update employee stats
    const emp = globalEmployees.find(e => e.id === currentActiveEmployee.id);
    if (emp) {
        if (type === 'order') emp.stats.orders++;
        if (type === 'message') emp.stats.messages++;
        if (type === 'inventory') emp.stats.inventory++;
    }

    // Keep only last 500 activities
    if (globalActivityLog.length > 500) {
        globalActivityLog = globalActivityLog.slice(0, 500);
    }

    saveEmployeeData();
}

// Show employee selector modal
function showEmployeeSelector(callback) {
    const activeEmployees = globalEmployees.filter(e => e.status === 'active');

    let modalHTML = `
        <div class="modal-overlay active" id="employeeSelectorModal" style="z-index: 9999;">
            <div class="modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h2 class="modal-title"><i class="fas fa-user-check" style="color: var(--primary); margin-right: 0.5rem;"></i>Select Employee</h2>
                    <button class="modal-close" onclick="closeEmployeeSelector()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">Who is performing this action?</p>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${activeEmployees.map(emp => `
                            <div class="employee-selector-item" onclick="selectEmployee('${emp.id}', ${callback ? 'true' : 'false'})" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border-radius: var(--border-radius-md); cursor: pointer; transition: background 0.2s; border: 2px solid ${currentActiveEmployee?.id === emp.id ? 'var(--primary)' : 'transparent'}; background: ${currentActiveEmployee?.id === emp.id ? 'var(--primary-light)' : 'var(--bg-secondary)'}; margin-bottom: 0.5rem;">
                                <img src="${emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=6366f1&color=fff&size=80`}" alt="${emp.name}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--text-primary);">${emp.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${emp.position}</div>
                                </div>
                                ${currentActiveEmployee?.id === emp.id ? '<i class="fas fa-check-circle" style="color: var(--primary);"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeEmployeeSelector()">Cancel</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('employeeSelectorModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store callback for later use
    window.employeeSelectorCallback = callback;
}

// Select an employee
function selectEmployee(empId, executeCallback) {
    const emp = globalEmployees.find(e => e.id === empId);
    if (emp) {
        currentActiveEmployee = emp;
        saveEmployeeData();
        closeEmployeeSelector();

        if (executeCallback && window.employeeSelectorCallback) {
            window.employeeSelectorCallback();
            window.employeeSelectorCallback = null;
        }
    }
}

// Close employee selector
function closeEmployeeSelector() {
    const modal = document.getElementById('employeeSelectorModal');
    if (modal) modal.remove();
}

// Make functions globally available
window.globalEmployees = globalEmployees;
window.globalActivityLog = globalActivityLog;
window.currentActiveEmployee = currentActiveEmployee;
window.logEmployeeActivity = logEmployeeActivity;
window.showEmployeeSelector = showEmployeeSelector;
window.selectEmployee = selectEmployee;
window.closeEmployeeSelector = closeEmployeeSelector;
window.saveEmployeeData = saveEmployeeData;


