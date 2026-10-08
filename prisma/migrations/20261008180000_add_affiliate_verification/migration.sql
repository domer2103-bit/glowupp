-- AlterTable
ALTER TABLE "affiliate_partners" ADD COLUMN     "terms_version" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3);


-- A partner an admin created by hand was vetted by definition; only
-- self-registered partners start unverified.
UPDATE "affiliate_partners" SET "verified_at" = "created_at" WHERE "self_registered" = false;
