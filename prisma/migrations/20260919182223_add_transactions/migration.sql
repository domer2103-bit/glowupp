-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "quote_request_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "fee_amount" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_quote_request_id_key" ON "transactions"("quote_request_id");

-- CreateIndex
CREATE INDEX "transactions_professional_id_idx" ON "transactions"("professional_id");

-- CreateIndex
CREATE INDEX "transactions_project_id_idx" ON "transactions"("project_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

