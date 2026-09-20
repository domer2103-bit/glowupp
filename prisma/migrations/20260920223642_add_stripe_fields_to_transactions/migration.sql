-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "stripe_checkout_session_id" TEXT,
ADD COLUMN "stripe_payment_intent_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stripe_checkout_session_id_key" ON "transactions"("stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stripe_payment_intent_id_key" ON "transactions"("stripe_payment_intent_id");
