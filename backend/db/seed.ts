import { db } from './index';
import { products, users } from './schema';
import bcrypt from 'bcrypt';

// Product data matching frontend SKUs
const productData = [
    // Fruits
    { sku: 'mango-250', name: 'Mango 250g', price: '120.00', stock: 50, category: 'Fruits', description: 'Freeze dried mango slices, 250g pack' },
    { sku: 'strawberries-250', name: 'Strawberries 250g', price: '130.00', stock: 50, category: 'Fruits', description: 'Freeze dried whole strawberries, 250g pack' },
    { sku: 'blueberries-250', name: 'Blueberries 250g', price: '150.00', stock: 50, category: 'Fruits', description: 'Freeze dried blueberries, 250g pack' },
    { sku: 'banana-250', name: 'Banana 250g', price: '110.00', stock: 50, category: 'Fruits', description: 'Freeze dried banana chips, 250g pack' },

    // Candy
    { sku: 'marshmallow-pack', name: 'Marshmallow Pack', price: '90.00', stock: 100, category: 'Candy', description: 'Freeze dried marshmallows assortment' },
    { sku: 'marshmallows-pack', name: 'Marshmallows Pack', price: '90.00', stock: 100, category: 'Candy', description: 'Freeze dried marshmallows assortment (alternate)' },
    { sku: 'snickers-pack', name: 'Snickers Pack', price: '140.00', stock: 80, category: 'Candy', description: 'Freeze dried Snickers bites' },
    { sku: 'chocolate-bar', name: 'Chocolate Bar', price: '80.00', stock: 100, category: 'Candy', description: 'Premium freeze dried chocolate bar' },
    { sku: 'chocolate-brownie', name: 'Chocolate Brownie', price: '95.00', stock: 60, category: 'Candy', description: 'Freeze dried chocolate brownie bites' },
    { sku: 'gummy-rainbow', name: 'Gummy Rainbow', price: '60.00', stock: 120, category: 'Candy', description: 'Freeze dried rainbow gummy bears' },
    { sku: 'marshmallow-cup', name: 'Marshmallow Cup', price: '85.00', stock: 70, category: 'Candy', description: 'Freeze dried marshmallow cups' },
    { sku: 'lollipop-pop', name: 'Lollipop Pop', price: '45.00', stock: 150, category: 'Candy', description: 'Freeze dried lollipop bites' },
    { sku: 'ice-cream-cup', name: 'Ice Cream Cup', price: '90.00', stock: 50, category: 'Candy', description: 'Freeze dried ice cream bites' },
    { sku: 'nut-mix', name: 'Nut Mix', price: '120.00', stock: 80, category: 'Snacks', description: 'Premium mixed nuts assortment' },

    // Mood products
    { sku: 'sweet', name: 'Sweet & Flirty Mix', price: '120.00', stock: 40, category: 'Moods', description: 'Strawberries dipped in charm' },
    { sku: 'bold', name: 'Bold & Bright Mix', price: '120.00', stock: 40, category: 'Moods', description: 'Tangy tropicals with a citrus pop' },
    { sku: 'cool', name: 'Cool & Crisp Mix', price: '120.00', stock: 40, category: 'Moods', description: 'So fresh, it\'s unreal' },
    { sku: 'chill', name: 'Chill & Juicy Mix', price: '120.00', stock: 40, category: 'Moods', description: 'Your summer crush in a bag' },
    { sku: 'mysterious', name: 'Mysterious & Magical Mix', price: '130.00', stock: 40, category: 'Moods', description: 'Grapes with a galaxy twist' },
    { sku: 'zesty', name: 'Zesty & Wild Mix', price: '130.00', stock: 40, category: 'Moods', description: 'A bite full of sass & spice' },
];

async function main() {
    console.log('🌱 Seeding Freezy Bites database...\n');

    // Create test user with proper hashed password
    console.log('Creating test user...');
    const passwordHash = await bcrypt.hash('test123', 10);

    const userResult = await db.insert(users).values({
        email: 'test@freezybites.com',
        passwordHash: passwordHash,
        fullName: 'Test Customer',
        address: '123 Test Street, Cairo, Egypt'
    }).onConflictDoNothing().returning();

    if (userResult.length > 0) {
        console.log('✅ Test user created: test@freezybites.com / test123');
    } else {
        console.log('ℹ️  Test user already exists');
    }

    // Insert products
    console.log('\nInserting products...');
    let insertedCount = 0;
    let skippedCount = 0;

    for (const product of productData) {
        const result = await db.insert(products).values(product).onConflictDoNothing().returning();
        if (result.length > 0) {
            console.log(`  ✅ ${product.name} (${product.sku})`);
            insertedCount++;
        } else {
            skippedCount++;
        }
    }

    console.log('\n🎉 Seeding complete!');
    console.log(`   - ${insertedCount} new products inserted`);
    console.log(`   - ${skippedCount} products already existed`);
    console.log('   - Test user: test@freezybites.com / test123');
    process.exit(0);
}

main().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
});