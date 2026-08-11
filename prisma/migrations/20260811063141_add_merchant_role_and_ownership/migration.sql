-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MERCHANT';

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
