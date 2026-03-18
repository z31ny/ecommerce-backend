-- Make offers standalone + support multiple images
-- Safe(ish) migration: uses IF EXISTS / IF NOT EXISTS to avoid hard failures.

ALTER TABLE IF EXISTS "offers"
  ADD COLUMN IF NOT EXISTS "images" text[];

ALTER TABLE IF EXISTS "offers"
  ADD COLUMN IF NOT EXISTS "link" text;

-- product_sku should be optional and not unique
ALTER TABLE IF EXISTS "offers"
  ALTER COLUMN "product_sku" DROP NOT NULL;

DO $$
BEGIN
  -- Drop existing unique constraint if it exists (name may vary)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'offers_product_sku_unique'
  ) THEN
    ALTER TABLE "offers" DROP CONSTRAINT "offers_product_sku_unique";
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- offers table doesn't exist yet; ignore
END $$;

