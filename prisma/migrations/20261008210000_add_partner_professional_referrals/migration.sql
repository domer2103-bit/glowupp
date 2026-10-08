-- CreateEnum
CREATE TYPE "AffiliateSource" AS ENUM ('HOMEOWNER', 'PROFESSIONAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "affiliate_partner_id" UUID;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "affiliate_source" "AffiliateSource";

-- AlterTable
ALTER TABLE "affiliate_partners" ADD COLUMN     "notices_seen_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_affiliate_partner_id_idx" ON "users"("affiliate_partner_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_affiliate_partner_id_fkey" FOREIGN KEY ("affiliate_partner_id") REFERENCES "affiliate_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Everything attached to a project before this migration came from a
-- homeowner opening the partner's link.
UPDATE "projects" SET "affiliate_source" = 'HOMEOWNER' WHERE "affiliate_partner_id" IS NOT NULL;
