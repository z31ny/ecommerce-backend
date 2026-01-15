# Freezy Bite Admin Dashboard

A comprehensive, professional multi-page admin dashboard for the Freezy Bite e-commerce platform. Built with pure HTML5, CSS3, and Vanilla JavaScript.

![Dashboard Preview](https://via.placeholder.com/800x400/667eea/ffffff?text=Freezy+Bite+Dashboard)

## 🚀 Quick Start

1. **Open the Dashboard**
   - Simply open `index.html` in your web browser
   - No server or installation required
   - Works offline (except for CDN resources)

2. **Navigate Between Pages**
   - Use the sidebar navigation to switch between sections
   - Each page is fully functional and standalone

## 📁 Project Structure

```
freezy bite dashboard 1/
├── index.html          # Overview/Dashboard page
├── products.html       # Products Management
├── orders.html         # Orders Management
├── customers.html      # Customers Management
├── analytics.html      # Analytics & Reports
├── inventory.html      # Inventory Management
├── settings.html       # Settings & Configuration
├── README.md           # This file
├── styles/
│   └── dashboard.css   # All CSS styles
├── scripts/
│   └── dashboard.js    # All JavaScript functionality
└── assets/             # Your existing assets
    ├── fruits/
    ├── candy-page-img/
    ├── home-page-img/
    ├── about/
    ├── contact/
    ├── icons/
    └── 3d/
```

## 📄 Pages Overview

### 1. Overview (index.html)
- Dashboard statistics with animated counters
- Revenue overview line chart
- Product categories doughnut chart
- Recent orders table
- Top products list
- Date filter buttons (Today, Week, Month, Year)

### 2. Products (products.html)
- Product grid with responsive cards
- Filter by category and status
- Search functionality
- Add new product modal
- Edit and delete product actions
- Low stock indicators

### 3. Orders (orders.html)
- Order status summary cards
- Comprehensive orders table
- Status badges (Pending, Processing, Shipped, Delivered, Cancelled)
- Export functionality
- Filter and search options

### 4. Customers (customers.html)
- Customer statistics cards
- Customer database table
- Auto-generated avatars
- Search customers
- View customer profiles

### 5. Analytics (analytics.html)
- Sales performance bar chart (12 months)
- Customer growth line chart
- Top selling products with progress bars
- Revenue by category horizontal bar chart
- Generate report functionality

### 6. Inventory (inventory.html)
- Low stock warning alerts
- Stock overview table
- Current stock vs minimum stock
- Status badges (In Stock, Low Stock, Out of Stock)
- Add stock functionality
- Import inventory option

### 7. Settings (settings.html)
- **General Settings**: Store name, email, phone
- **Notification Settings**: Email, order, low stock alerts
- **Payment Settings**: Credit card, PayPal, COD toggles
- **Security**: Password change functionality
- Danger zone for account deletion

## 🎨 Customization

### Changing Colors
Edit the CSS variables in `styles/dashboard.css`:

```css
:root {
    --primary: #6366f1;        /* Main purple color */
    --secondary: #8b5cf6;      /* Secondary purple */
    --success: #10b981;        /* Green */
    --warning: #f59e0b;        /* Orange */
    --danger: #ef4444;         /* Red */
    --info: #3b82f6;           /* Blue */
}
```

### Changing Sidebar Gradient
```css
:root {
    --gradient-sidebar: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Adding Products
Edit the `products` array in `scripts/dashboard.js`:

```javascript
const products = [
    {
        id: 1,
        name: 'Product Name',
        sku: 'SKU-001',
        category: 'Category',
        price: 9.99,
        stock: 100,
        minStock: 20,
        status: 'active',
        image: 'path/to/image.png',
        description: 'Product description'
    },
    // Add more products...
];
```

## 🛠 Technical Details

### Dependencies (via CDN)
- **Chart.js v4.x** - For interactive charts
- **Font Awesome 6.4.0** - For icons
- **UI Avatars API** - For auto-generated avatars

### Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Features
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Collapsible sidebar
- ✅ Interactive charts with tooltips
- ✅ Modal popup forms
- ✅ Toggle switches
- ✅ Status badges
- ✅ Search and filter functionality
- ✅ Form validation
- ✅ Animated statistics
- ✅ Custom scrollbars
- ✅ Smooth transitions
- ✅ Low stock alerts
- ✅ Fallback images

## 📱 Responsive Breakpoints

| Breakpoint | Description |
|------------|-------------|
| > 1024px | Desktop - Full sidebar visible |
| 768px - 1024px | Tablet - Collapsible sidebar |
| < 768px | Mobile - Off-canvas sidebar |

## 🔧 API-Ready Structure

The dashboard is structured to easily connect to a backend API:

```javascript
// Example: Replace mock data with API calls
async function fetchProducts() {
    const response = await fetch('/api/products');
    const data = await response.json();
    return data;
}
```

## 📝 Mock Data

The dashboard includes realistic mock data for:
- 12 products across 4 categories
- 10 orders with various statuses
- 8 customers with order history
- Revenue data (7 days and 12 months)
- Customer growth statistics

## 🎯 Usage Tips

1. **Mobile Navigation**: Tap the hamburger menu to open the sidebar
2. **Sidebar Toggle**: Click the toggle button to collapse/expand on desktop
3. **Charts**: Hover over chart elements for detailed tooltips
4. **Products**: Use filters to narrow down product list
5. **Stock Alerts**: Check inventory page for low stock warnings

## 📄 License

This project is for educational and commercial use. Feel free to modify and adapt for your needs.

## 🤝 Support

For questions or issues, please create an issue in the repository or contact the development team.

---

**Built with ❤️ for Freezy Bite**

