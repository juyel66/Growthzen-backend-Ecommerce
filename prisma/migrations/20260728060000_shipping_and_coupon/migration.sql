CREATE TYPE "ShippingMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED');
CREATE TYPE "CouponScope" AS ENUM ('ENTIRE_ORDER', 'SPECIFIC_PRODUCT', 'SPECIFIC_CATEGORY');

CREATE TABLE "ShippingMethod" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "charge" DOUBLE PRECISION NOT NULL,
  "estimatedDeliveryDays" INTEGER NOT NULL, "description" TEXT, "status" "ShippingMethodStatus" NOT NULL DEFAULT 'ACTIVE',
  "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "description" TEXT, "discountType" "DiscountType" NOT NULL,
  "discountValue" DOUBLE PRECISION NOT NULL, "scope" "CouponScope" NOT NULL DEFAULT 'ENTIRE_ORDER', "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "startsAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "maximumUsage" INTEGER, "perUserUsageLimit" INTEGER,
  "minimumOrderAmount" DOUBLE PRECISION, "maximumDiscount" DOUBLE PRECISION, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CouponProduct" ("couponId" TEXT NOT NULL, "productId" TEXT NOT NULL, CONSTRAINT "CouponProduct_pkey" PRIMARY KEY ("couponId", "productId"));
CREATE TABLE "CouponUsage" (
  "id" TEXT NOT NULL, "couponId" TEXT NOT NULL, "userId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "discountAmount" DOUBLE PRECISION NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Cart" ADD COLUMN "appliedCouponId" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingMethodId" TEXT, ADD COLUMN "shippingMethodName" TEXT,
  ADD COLUMN "estimatedDeliveryDate" TIMESTAMP(3), ADD COLUMN "trackingNumber" TEXT, ADD COLUMN "courierName" TEXT,
  ADD COLUMN "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING', ADD COLUMN "couponId" TEXT;

CREATE UNIQUE INDEX "ShippingMethod_name_key" ON "ShippingMethod"("name");
CREATE INDEX "ShippingMethod_status_deletedAt_idx" ON "ShippingMethod"("status", "deletedAt");
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_startsAt_expiresAt_deletedAt_idx" ON "Coupon"("isActive", "startsAt", "expiresAt", "deletedAt");
CREATE INDEX "CouponProduct_productId_idx" ON "CouponProduct"("productId");
CREATE UNIQUE INDEX "CouponUsage_orderId_key" ON "CouponUsage"("orderId");
CREATE INDEX "CouponUsage_couponId_userId_idx" ON "CouponUsage"("couponId", "userId");
CREATE INDEX "Cart_appliedCouponId_idx" ON "Cart"("appliedCouponId");
CREATE INDEX "Order_shippingMethodId_idx" ON "Order"("shippingMethodId");
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");
CREATE INDEX "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");

ALTER TABLE "Cart" ADD CONSTRAINT "Cart_appliedCouponId_fkey" FOREIGN KEY ("appliedCouponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CouponProduct" ADD CONSTRAINT "CouponProduct_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponProduct" ADD CONSTRAINT "CouponProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
