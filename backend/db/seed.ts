import { db } from './index';
import { products, users } from './schema';
import bcrypt from 'bcrypt';

// All actual products from the Freezy Bites website
const productData = [
    // ============ HOME PAGE PRODUCTS ============
    // Special Offers
    { sku: 'snickers-pack', name: 'Snickers Pack', price: '140.00', stock: 100, category: 'Candy', description: 'Freeze dried Snickers bites - 20% off' },
    { sku: 'mango-250', name: 'Mango 250g', price: '120.00', stock: 100, category: 'Fruits', description: 'Freeze dried mango slices, 250g pack' },
    { sku: 'banana-250', name: 'Banana 250g', price: '110.00', stock: 100, category: 'Fruits', description: 'Freeze dried banana chips, 250g pack' },
    { sku: 'marshmallow-pack', name: 'Marshmallow Pack', price: '90.00', stock: 100, category: 'Candy', description: 'Freeze dried marshmallows assortment' },

    // What's Inside (Fruits from home)
    { sku: 'strawberries-250', name: 'Freeze Dried Strawberries', price: '130.00', stock: 100, category: 'Fruits', description: 'Sweet strawberry pieces — light, lovely, irresistible. 250gm' },
    { sku: 'marshmallows-pack', name: 'Marshmallows Pack', price: '90.00', stock: 100, category: 'Candy', description: 'Freeze dried marshmallows (alternate SKU)' },
    { sku: 'blueberries-250', name: 'Freeze Dried Blueberries', price: '150.00', stock: 100, category: 'Fruits', description: 'Freeze dried blueberries, 250g pack' },

    // Pick Your Mood Products
    { sku: 'sweet', name: 'Sweet & Flirty Mix', price: '120.00', stock: 50, category: 'Moods', description: 'Strawberries dipped in charm — light, lovely, irresistibly sweet' },
    { sku: 'bold', name: 'Bold & Bright Mix', price: '120.00', stock: 50, category: 'Moods', description: 'Tangy tropicals with a citrus pop — your taste buds wake-up call' },
    { sku: 'cool', name: 'Cool & Crisp Mix', price: '120.00', stock: 50, category: 'Moods', description: 'Clean crunch with garden-fresh vibes — the snackable deep breath' },
    { sku: 'chill', name: 'Chill & Juicy Mix', price: '120.00', stock: 50, category: 'Moods', description: 'Cool sips, juicy hits — pop one and feel the sun' },
    { sku: 'mysterious', name: 'Mysterious & Magical Mix', price: '130.00', stock: 50, category: 'Moods', description: 'Deep, dreamy grape flavors that sparkle — midnight snacking approved' },
    { sku: 'zesty', name: 'Zesty & Wild Mix', price: '130.00', stock: 50, category: 'Moods', description: 'Sweet heat with a playful kick — turn snack time into showtime' },

    // ============ FRUITS PAGE PRODUCTS ============
    // Customer Favorites
    { sku: 'strawberry-fav', name: 'Strawberries 250gm', price: '130.00', stock: 100, category: 'Fruits', description: 'Real strawberries — sweet, crisp, and snack-ready' },

    // Summer Fruits
    { sku: 'peach-slices', name: 'Peach Slices', price: '120.00', stock: 80, category: 'Summer Fruits', description: 'Juicy peaches freeze-dried for a bright, sunny crunch. 200gm' },
    { sku: 'mango-bites', name: 'Mango Bites', price: '150.00', stock: 80, category: 'Summer Fruits', description: 'Tropical mango with a clean, crisp snap. 200gm' },

    // Tropical Fruits
    { sku: 'pineapple-rings', name: 'Pineapple Rings', price: '160.00', stock: 80, category: 'Tropical Fruits', description: 'Golden, tangy rings with a sunny crunch. 200gm' },
    { sku: 'banana-chips', name: 'Banana Chips', price: '110.00', stock: 80, category: 'Tropical Fruits', description: 'Naturally sweet banana — simply crisp. 250gm' },
    { sku: 'coconut-crisp', name: 'Coconut Crisp', price: '140.00', stock: 80, category: 'Tropical Fruits', description: 'Lightly sweet coconut with a tropical twist. 200gm' },

    // Winter Fruits
    { sku: 'apple-slices', name: 'Apple Slices', price: '120.00', stock: 80, category: 'Winter Fruits', description: 'Classic apple crunch with cozy sweetness. 200gm' },
    { sku: 'pear-bites', name: 'Pear Bites', price: '130.00', stock: 80, category: 'Winter Fruits', description: 'Soft, delicate pear now a snappy delight. 200gm' },
    { sku: 'cranberry-pop', name: 'Cranberry Pop', price: '135.00', stock: 80, category: 'Winter Fruits', description: 'Bright, zingy cranberries with a festive crunch. 200gm' },

    // Fall Favorites
    { sku: 'figs', name: 'Figs', price: '140.00', stock: 80, category: 'Fall Favorites', description: 'Rich, jammy figs with a light crunch. 200gm' },
    { sku: 'pear-fall', name: 'Pear', price: '130.00', stock: 80, category: 'Fall Favorites', description: 'Soft, mellow pear — sweet and satisfying. 200gm' },
    { sku: 'plum-dream', name: 'Plum Dream', price: '145.00', stock: 80, category: 'Fall Favorites', description: 'Sweet-tart plums — a cozy autumn treat. 200gm' },

    // Mixed Fruit Packs
    { sku: 'rainbow-mix', name: 'Rainbow Mix', price: '160.00', stock: 60, category: 'Mixed Packs', description: 'A colorful blend — each bite a new burst. 220gm' },
    { sku: 'berry-bash', name: 'Berry Bash', price: '155.00', stock: 60, category: 'Mixed Packs', description: 'A berry-forward mix for fruit lovers. 220gm' },
    { sku: 'citrus-party', name: 'Citrus Party', price: '150.00', stock: 60, category: 'Mixed Packs', description: 'A bright mix of citrus favorites. 220gm' },

    // Veggies
    { sku: 'veggie-crunch', name: 'Veggie Crunch', price: '140.00', stock: 60, category: 'Veggies', description: 'Crisp garden goodness for a light, savory snack. 200gm' },

    // ============ CANDY PAGE PRODUCTS ============
    // Customer Favorites
    { sku: 'swirl-lollipop', name: 'Caramel Swirl Lollipop', price: '200.00', stock: 50, category: 'Lollipop', description: 'Giant caramel swirl—crunchy, creamy, and freeze–dried to perfection. 280Gm' },
    { sku: 'choco-bar-crisp', name: 'Crispy Caramel Chocolate Bar', price: '200.00', stock: 50, category: 'Chocolate', description: 'Crispy outside, gooey inside — caramel, nougat & chocolate reimagined! 280Gm' },
    { sku: 'fruity-best-seller', name: 'Fruity Best Sellers', price: '300.00', stock: 50, category: 'Candy', description: 'Fruity, crunchy, and totally addictive — our best sellers! 1 Large' },
    { sku: 'straw-van-choco', name: 'Strawberry Vanilla Chocolate Cups', price: '150.00', stock: 50, category: 'Candy', description: 'Strawberry, Vanilla, Chocolate – crisp, light, and magical! 200Gm' },

    // Candies
    { sku: 'fd-skittles', name: 'Freeze-Dried Skittles', price: '150.00', stock: 100, category: 'Candies', description: 'Taste the rainbow—crispy style! Each crunch pops with fruity magic. 250gm' },
    { sku: 'fd-banana-mm', name: 'Freeze-Dried Marshmallows', price: '200.00', stock: 100, category: 'Marshmallow', description: 'Puffy, crunchy, and dreamy! Like a bite of a sweet pastel cloud. 200gm' },
    { sku: 'fd-twirl-mm', name: 'Freeze-Dried Marshmallows Twirl', price: '200.00', stock: 100, category: 'Marshmallow', description: 'Sweet cloud swirls with extra joy. 200gm' },
    { sku: 'fd-sour-worms', name: 'Freeze-Dried Sour Worms', price: '200.00', stock: 100, category: 'Candies', description: 'A wriggly zing in every crunch! Sweet, sour, and totally addictive. 200gm' },
    { sku: 'fd-gummies', name: 'Freeze-Dried Gummies', price: '200.00', stock: 100, category: 'Candies', description: 'Crispy cuties bursting with flavor! From chewy to crackly joy. 280gm' },
    { sku: 'fd-rainbow-drops', name: 'Freeze-Dried Rainbow Drops', price: '150.00', stock: 100, category: 'Candies', description: 'Colorful crunchers that melt like magic. 250gm' },
    { sku: 'fd-fruit-rolls', name: 'Freeze-Dried Fruit Roll-Ups', price: '300.00', stock: 100, category: 'Candies', description: 'Swirls of fruity fun turned crisp! A rainbow crunch in every ribbon. 200gm' },
    { sku: 'fd-cotton-taffy', name: 'Freeze-Dried Cotton Candy Taffy', price: '150.00', stock: 100, category: 'Candies', description: 'Like fairytales in a crunch! Swirly colors and melt-in-your-mouth sparkle. 200gm' },

    // Chocolate
    { sku: 'mars', name: 'Mars', price: '150.00', stock: 80, category: 'Chocolate', description: 'Bold and chewy with a heart of caramel — Mars will launch your taste buds into orbit. 250gm' },
    { sku: 'eclair-caramel', name: 'Eclair Caramel', price: '200.00', stock: 80, category: 'Chocolate', description: 'Golden caramel and silky smooth chocolate — a classy delight that melts with magic. 200gm' },
    { sku: 'lion-chocolate', name: 'Lion Chocolate', price: '200.00', stock: 80, category: 'Chocolate', description: 'Crunchy, chewy, and chocolatey! Lion is a wild roar of textures and tastes. 200gm' },
    { sku: 'milky-way', name: 'Milky Way', price: '200.00', stock: 80, category: 'Chocolate', description: 'Light, fluffy, and out-of-this-world sweet — a galaxy of softness and joy. 200gm' },
    { sku: 'snickers', name: 'Snickers', price: '150.00', stock: 80, category: 'Chocolate', description: 'Peanuts, caramel, nougat, and chocolate — a hug for your hunger. 250gm' },

    // Lollipop
    { sku: 'caramel-giant-lollipop', name: 'Caramel Giant Lollipop', price: '300.00', stock: 40, category: 'Lollipop', description: 'A swirl of golden caramel dreams! Smooth, sweet, and totally irresistible. 1 Large' },
    { sku: 'choco-cream-lollipop', name: 'Choco Cream Giant Lollipop', price: '300.00', stock: 40, category: 'Lollipop', description: 'Rich chocolate meets creamy delight in this giant lollipop! 1 Large' },
    { sku: 'strawberry-giant-lollipop', name: 'Strawberry Giant Lollipop', price: '300.00', stock: 40, category: 'Lollipop', description: 'Juicy strawberry swirls bursting with fruity fun! 1 Large' },
    { sku: 'vanilla-giant-lollipop', name: 'Vanilla Giant Lollipop', price: '300.00', stock: 40, category: 'Lollipop', description: 'Soft vanilla clouds in a swirl of candy magic. 1 Large' },

    // Ice Cream
    { sku: 'ice-cream-cubes', name: 'Mixed Ice Cream Cubes', price: '400.00', stock: 40, category: 'Ice Cream', description: 'Freeze-dried ice cream cubes bursting with flavor — cool, crunchy, and totally fun! 200gm' },

    // Marshmallow
    { sku: 'mix-marshmallow-dip', name: 'Mix Marshmallow with Dipping Sauce', price: '500.00', stock: 40, category: 'Marshmallow', description: 'Fluffy marshmallows paired with a delicious dip — the perfect sweet combo! 200gm' },

    // Nuts
    { sku: 'vanilla-pecan-shell', name: 'Vanilla Sugar Pecan with Shell', price: '400.00', stock: 40, category: 'Nuts', description: 'Crunchy pecans coated in sweet vanilla sugar — a tasty treat! 300gm' },
];

async function main() {
    console.log('🌱 Seeding Freezy Bites database with ALL products...\n');

    // Create admin user with proper hashed password
    console.log('Creating admin user...');
    const passwordHash = await bcrypt.hash('FreezyAdmin2025!', 10);

    const userResult = await db.insert(users).values({
        email: 'admin@freezybites.com',
        passwordHash: passwordHash,
        fullName: 'Freezy Bites Admin',
        address: 'Cairo, Egypt'
    }).onConflictDoNothing().returning();

    if (userResult.length > 0) {
        console.log('✅ Admin user created: admin@freezybites.com / FreezyAdmin2025!');
    } else {
        console.log('ℹ️  Admin user already exists');
    }

    // Insert products
    console.log('\nInserting products...');
    let insertedCount = 0;
    let skippedCount = 0;

    for (const product of productData) {
        const result = await db.insert(products).values(product).onConflictDoNothing().returning();
        if (result.length > 0) {
            console.log(`  ✅ ${product.name} (${product.sku}) - ${product.price} EGP - Stock: ${product.stock}`);
            insertedCount++;
        } else {
            skippedCount++;
        }
    }

    console.log('\n🎉 Seeding complete!');
    console.log(`   - ${insertedCount} new products inserted`);
    console.log(`   - ${skippedCount} products already existed`);
    console.log(`   - Total products in seed: ${productData.length}`);
    console.log('   - Admin: admin@freezybites.com / FreezyAdmin2025!');
    process.exit(0);
}

main().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
});