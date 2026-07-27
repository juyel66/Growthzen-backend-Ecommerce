-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('AVAILABLE', 'COMING_SOON');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "customerSellPrice" DOUBLE PRECISION NOT NULL,
    "resellerSellPrice" DOUBLE PRECISION NOT NULL,
    "couponCode" TEXT,
    "couponDiscountPercentage" INTEGER,
    "status" "ProductStatus" NOT NULL DEFAULT 'AVAILABLE',
    "thumbnailImage" TEXT NOT NULL,
    "productImages" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
