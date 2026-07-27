-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productVideos" TEXT[] DEFAULT ARRAY[]::TEXT[];
