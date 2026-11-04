-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateTable
CREATE TABLE "professional_subscriptions" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "unit_amount_pence" INTEGER NOT NULL,
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professional_subscriptions_professional_id_key" ON "professional_subscriptions"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_subscriptions_stripe_subscription_id_key" ON "professional_subscriptions"("stripe_subscription_id");

-- AddForeignKey
ALTER TABLE "professional_subscriptions" ADD CONSTRAINT "professional_subscriptions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security: deny-all to direct (anon/authenticated) access, same
-- as the other tables — only server-side Prisma code touches this one.
alter table public.professional_subscriptions enable row level security;
