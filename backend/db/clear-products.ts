import { db } from './index';
import { products, orderItems, cartItems, reviews, offers } from './schema';

async function clearProducts() {
    console.log('🗑️  Clearing all products from database...\n');

    try {
        // Clear dependent tables first (foreign key constraints)
        console.log('Clearing order items...');
        await db.delete(orderItems);

        console.log('Clearing cart items...');
        await db.delete(cartItems);

        console.log('Clearing reviews...');
        await db.delete(reviews);

        console.log('Clearing offers...');
        await db.delete(offers);

        // Now clear products
        console.log('Clearing products...');
        const deleted = await db.delete(products).returning();

        console.log(`\n✅ Deleted ${deleted.length} products from database.`);
        console.log('✅ Also cleared: order_items, cart_items, reviews, offers');
        console.log('\n🎉 Database is now empty. Add products from the admin dashboard!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing products:', error);
        process.exit(1);
    }
}

clearProducts();
