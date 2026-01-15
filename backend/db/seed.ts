import { db } from './index';
import { products, users, adminUsers, customers, employees, offers } from './schema';
import bcrypt from 'bcrypt';

// Admin users for dashboard
const adminUsersData = [
    { email: 'sarah@freezybite.com', password: 'admin123', name: 'Sarah Johnson', role: 'Super Admin', access: ['all'] },
    { email: 'ahmed@freezybite.com', password: 'admin123', name: 'Ahmed Hassan', role: 'Admin', access: ['all'] },
    { email: 'mohamed@freezybite.com', password: 'manager123', name: 'Mohamed Ali', role: 'Manager', access: ['overview', 'content', 'products', 'orders', 'customers', 'messages', 'analytics', 'inventory', 'trash', 'offers'] },
    { email: 'fatima@freezybite.com', password: 'staff123', name: 'Fatima Ibrahim', role: 'Staff', access: ['products', 'orders', 'customers', 'inventory', 'messages', 'trash'] },
    { email: 'admin@freezybite.com', password: 'password', name: 'Admin User', role: 'Super Admin', access: ['all'] }
];

// Sample customers for dashboard
const customersData = [
    { name: 'John Smith', email: 'john@email.com', phone: '+20 109 396 1545', status: 'active', totalOrders: 5, totalSpent: '247.98' },
    { name: 'Emma Wilson', email: 'emma@email.com', phone: '+20 112 345 6789', status: 'active', totalOrders: 4, totalSpent: '161.99' },
    { name: 'Michael Brown', email: 'michael@email.com', phone: '+20 100 123 4567', status: 'active', totalOrders: 6, totalSpent: '327.74' },
    { name: 'Sarah Davis', email: 'sarah.d@email.com', phone: '+20 101 987 6543', status: 'active', totalOrders: 4, totalSpent: '130.49' },
    { name: 'James Miller', email: 'james@email.com', phone: '+20 111 222 3333', status: 'active', totalOrders: 3, totalSpent: '100.89' },
];

// Sample employees for dashboard
const employeesData = [
    { name: 'Omar Khalil', email: 'omar@freezybite.com', phone: '+20 100 111 2222', position: 'Warehouse Manager', department: 'Operations', status: 'active' },
    { name: 'Layla Ahmed', email: 'layla@freezybite.com', phone: '+20 100 333 4444', position: 'Customer Support', department: 'Support', status: 'active' },
    { name: 'Youssef Mahmoud', email: 'youssef@freezybite.com', phone: '+20 100 555 6666', position: 'Delivery Driver', department: 'Logistics', status: 'active' },
];

// Initial offers
const offersData = [
    { productSku: 'snickers-pack', name: 'Snickers Pack', image: 'assets/home-page-img/must-have/must have 3.png', originalPrice: '175.00', salePrice: '140.00', discount: 20, category: 'Candy' },
    { productSku: 'mango-250', name: 'Mango 250g', image: 'assets/home-page-img/must-have/must have1.png', originalPrice: '140.00', salePrice: '120.00', discount: 15, category: 'Fruits' },
    { productSku: 'banana-250', name: 'Banana 250g', image: 'assets/home-page-img/must-have/must have4.png', originalPrice: '120.00', salePrice: '110.00', discount: 10, category: 'Fruits' },
    { productSku: 'marshmallow-pack', name: 'Marshmallow Pack', image: 'assets/home-page-img/must-have/must have2.png', originalPrice: '100.00', salePrice: '90.00', discount: 10, category: 'Candy' },
];

// Products from Freezy Bites website

const productData = [
    { sku: 'snickers-pack', name: 'Snickers Pack', price: '140.00', stock: 100, category: 'Candy', description: 'Freeze dried Snickers bites - 20% off' },
    { sku: 'mango-250', name: 'Mango 250g', price: '120.00', stock: 100, category: 'Fruits', description: 'Freeze dried mango slices, 250g pack' },
    { sku: 'banana-250', name: 'Banana 250g', price: '110.00', stock: 100, category: 'Fruits', description: 'Freeze dried banana chips, 250g pack' },
    { sku: 'marshmallow-pack', name: 'Marshmallow Pack', price: '90.00', stock: 100, category: 'Candy', description: 'Freeze dried marshmallows assortment' },
    { sku: 'strawberries-250', name: 'Freeze Dried Strawberries', price: '130.00', stock: 100, category: 'Fruits', description: 'Sweet strawberry pieces. 250gm' },
    { sku: 'blueberries-250', name: 'Freeze Dried Blueberries', price: '150.00', stock: 100, category: 'Fruits', description: 'Freeze dried blueberries, 250g pack' },
    { sku: 'sweet', name: 'Sweet & Flirty Mix', price: '120.00', stock: 50, category: 'Moods', description: 'Strawberries dipped in charm' },
    { sku: 'bold', name: 'Bold & Bright Mix', price: '120.00', stock: 50, category: 'Moods', description: 'Tangy tropicals with a citrus pop' },
    { sku: 'cool', name: 'Cool & Crisp Mix', price: '120.00', stock: 50, category: 'Moods', description: 'Clean crunch with garden-fresh vibes' },
    { sku: 'chill', name: 'Chill & Juicy Mix', price: '120.00', stock: 50, category: 'Moods', description: 'Cool sips, juicy hits' },
    { sku: 'peach-slices', name: 'Peach Slices', price: '120.00', stock: 80, category: 'Summer Fruits', description: 'Juicy peaches freeze-dried. 200gm' },
    { sku: 'mango-bites', name: 'Mango Bites', price: '150.00', stock: 80, category: 'Summer Fruits', description: 'Tropical mango with a clean snap. 200gm' },
    { sku: 'pineapple-rings', name: 'Pineapple Rings', price: '160.00', stock: 80, category: 'Tropical Fruits', description: 'Golden, tangy rings. 200gm' },
    { sku: 'banana-chips', name: 'Banana Chips', price: '110.00', stock: 80, category: 'Tropical Fruits', description: 'Naturally sweet banana. 250gm' },
    { sku: 'apple-slices', name: 'Apple Slices', price: '120.00', stock: 80, category: 'Winter Fruits', description: 'Classic apple crunch. 200gm' },
    { sku: 'fd-skittles', name: 'Freeze-Dried Skittles', price: '150.00', stock: 100, category: 'Candies', description: 'Taste the rainbow—crispy style! 250gm' },
    { sku: 'fd-gummies', name: 'Freeze-Dried Gummies', price: '200.00', stock: 100, category: 'Candies', description: 'Crispy cuties bursting with flavor! 280gm' },
    { sku: 'mars', name: 'Mars', price: '150.00', stock: 80, category: 'Chocolate', description: 'Bold and chewy with caramel. 250gm' },
    { sku: 'snickers', name: 'Snickers', price: '150.00', stock: 80, category: 'Chocolate', description: 'Peanuts, caramel, nougat. 250gm' },
    { sku: 'ice-cream-cubes', name: 'Mixed Ice Cream Cubes', price: '400.00', stock: 40, category: 'Ice Cream', description: 'Freeze-dried ice cream cubes. 200gm' },
];

async function main() {
    console.log('🌱 Seeding Freezy Bites database...\n');

    // Admin Users
    console.log('Creating admin users for dashboard...');
    for (const admin of adminUsersData) {
        const passwordHash = await bcrypt.hash(admin.password, 10);
        const result = await db.insert(adminUsers).values({
            email: admin.email.toLowerCase(),
            passwordHash,
            name: admin.name,
            role: admin.role,
            access: admin.access,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=6366f1&color=fff`,
            isActive: true,
        }).onConflictDoNothing().returning();
        if (result.length > 0) console.log(`  ✅ ${admin.name} (${admin.role})`);
    }

    // Customers
    console.log('\nCreating sample customers...');
    for (const customer of customersData) {
        const result = await db.insert(customers).values(customer).onConflictDoNothing().returning();
        if (result.length > 0) console.log(`  ✅ ${customer.name}`);
    }

    // Employees
    console.log('\nCreating sample employees...');
    for (const employee of employeesData) {
        const result = await db.insert(employees).values({
            ...employee,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=10b981&color=fff`,
        }).onConflictDoNothing().returning();
        if (result.length > 0) console.log(`  ✅ ${employee.name}`);
    }

    // Storefront User
    console.log('\nCreating storefront admin...');
    const passwordHash = await bcrypt.hash('FreezyAdmin2025!', 10);
    await db.insert(users).values({
        email: 'admin@freezybites.com',
        passwordHash,
        fullName: 'Freezy Bites Admin',
        address: 'Cairo, Egypt'
    }).onConflictDoNothing();

    // Products
    console.log('\nInserting products...');
    let count = 0;
    for (const product of productData) {
        const result = await db.insert(products).values(product).onConflictDoNothing().returning();
        if (result.length > 0) count++;
    }

    // Offers
    console.log('\nCreating offers...');
    for (const offer of offersData) {
        const result = await db.insert(offers).values({
            ...offer,
            isActive: true,
        }).onConflictDoNothing().returning();
        if (result.length > 0) console.log(`  ✅ ${offer.name} (-${offer.discount}%)`);
    }

    console.log('\n🎉 Seeding complete!');
    console.log(`   Products: ${count}`);
    console.log(`   Offers: ${offersData.length}`);
    console.log('\n📋 Dashboard Login:');
    console.log('   Super Admin: sarah@freezybite.com / admin123');
    console.log('   Admin: ahmed@freezybite.com / admin123');
    console.log('   Manager: mohamed@freezybite.com / manager123');
    console.log('   Staff: fatima@freezybite.com / staff123');
    process.exit(0);

}

main().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
});