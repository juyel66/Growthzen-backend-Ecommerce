-- Add slug column for existing products and backfill from title.
ALTER TABLE "Product" ADD COLUMN "slug" TEXT;

WITH slug_source AS (
    SELECT
        "id",
        CASE
            WHEN lower(regexp_replace(regexp_replace(trim("title"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) = ''
                THEN 'product'
            ELSE lower(regexp_replace(regexp_replace(trim("title"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
        END AS base_slug,
        row_number() OVER (
            PARTITION BY lower(regexp_replace(regexp_replace(trim("title"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
            ORDER BY "createdAt", "id"
        ) AS slug_rank
    FROM "Product"
)
UPDATE "Product" AS product
SET "slug" = CASE
    WHEN slug_source.base_slug = 'product' THEN 'product-' || substr(product."id", 1, 8)
    WHEN slug_source.slug_rank = 1 THEN slug_source.base_slug
    ELSE slug_source.base_slug || '-' || slug_source.slug_rank
END
FROM slug_source
WHERE product."id" = slug_source."id";

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");