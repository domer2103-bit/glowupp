-- CreateEnum
CREATE TYPE "AffiliateCategory" AS ENUM ('CAFE', 'GYM', 'GARDEN_CENTER', 'SALON', 'TRADE_SUPPLIER', 'INFLUENCER', 'OTHER');

-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "affiliate_partner_id" UUID,
ADD COLUMN     "affiliate_payout_amount" INTEGER;

-- CreateTable
CREATE TABLE "affiliate_partners" (
    "id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "category" "AffiliateCategory" NOT NULL,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',
    "referral_code" TEXT NOT NULL,
    "qr_slug" TEXT NOT NULL,
    "revenue_share_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.5000,
    "total_earnings_pence" INTEGER NOT NULL DEFAULT 0,
    "paid_earnings_pence" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "self_registered" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_payouts" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "amount_pence" INTEGER NOT NULL,
    "note" TEXT,
    "paid_by_id" UUID,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_login_tokens" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_login_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_partners_email_key" ON "affiliate_partners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_partners_referral_code_key" ON "affiliate_partners"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_partners_qr_slug_key" ON "affiliate_partners"("qr_slug");

-- CreateIndex
CREATE INDEX "affiliate_partners_status_idx" ON "affiliate_partners"("status");

-- CreateIndex
CREATE INDEX "affiliate_payouts_partner_id_idx" ON "affiliate_payouts"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_login_tokens_token_hash_key" ON "affiliate_login_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "affiliate_login_tokens_partner_id_idx" ON "affiliate_login_tokens"("partner_id");

-- CreateIndex
CREATE INDEX "projects_affiliate_partner_id_idx" ON "projects"("affiliate_partner_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_affiliate_partner_id_fkey" FOREIGN KEY ("affiliate_partner_id") REFERENCES "affiliate_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_login_tokens" ADD CONSTRAINT "affiliate_login_tokens_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Row Level Security: deny-all to direct (anon/authenticated) access, same
-- as activity_log — only server-side Prisma code touches these tables.
alter table public.affiliate_partners enable row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.affiliate_login_tokens enable row level security;
