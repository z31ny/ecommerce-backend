import { db } from './index';
import { offers } from './schema';
import { inArray, or, eq } from 'drizzle-orm';

async function main() {
  const dummySkus = ['snickers-pack', 'mango-250', 'banana-250', 'marshmallow-pack'];
  console.log('Deleting dummy offers by SKU:', dummySkus.join(', '));

  // productSku may be null now; only delete matching legacy dummy rows
  const res = await db
    .delete(offers)
    .where(inArray(offers.productSku, dummySkus))
    .returning();

  console.log('Deleted offers:', res.length);
  process.exit(0);
}

main().catch((e) => {
  console.error('Failed to clear dummy offers:', e);
  process.exit(1);
});

