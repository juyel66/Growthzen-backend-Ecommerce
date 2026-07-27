-- Preserve legacy product data while moving to the enterprise product model.
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

ALTER TABLE "Product"
  RENAME COLUMN "originalPrice" TO "costPrice";
ALTER TABLE "Product"
  RENAME COLUMN "resellerSellPrice" TO "resellerPrice";
ALTER TABLE "Product"
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "barcode" TEXT,
  ADD COLUMN "salePrice" DOUBLE PRECISION,
  ADD COLUMN "discountType" "DiscountType",
  ADD COLUMN "discountValue" DOUBLE PRECISION,
  ADD COLUMN "taxRate" DOUBLE PRECISION,
  ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "status_new" "ProductStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "Product"
SET
  "shortDescription" = LEFT("description", 300),
  "discountType" = CASE WHEN "couponDiscountPercentage" IS NOT NULL THEN 'PERCENTAGE'::"DiscountType" ELSE NULL END,
  "discountValue" = "couponDiscountPercentage",
  "attributes" = CASE
    WHEN "hasSize" = TRUE OR cardinality("sizes") > 0
      THEN jsonb_build_array(jsonb_build_object('name', 'Size', 'values', to_jsonb("sizes")))
    ELSE '[]'::jsonb
  END,
  "status_new" = CASE
    WHEN "status"::text = 'AVAILABLE' THEN 'ACTIVE'::"ProductStatus"
    ELSE 'DRAFT'::"ProductStatus"
  END;

ALTER TABLE "Product" ALTER COLUMN "shortDescription" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "status";
ALTER TABLE "Product" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Product"
  DROP COLUMN "couponDiscountPercentage",
  DROP COLUMN "hasSize",
  DROP COLUMN "sizes";
DROP TYPE "ProductStatus_old";

CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
