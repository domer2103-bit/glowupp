-- CreateTable
CREATE TABLE "professional_portfolio_photos" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "upload_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_portfolio_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "professional_portfolio_photos_professional_id_idx" ON "professional_portfolio_photos"("professional_id");

-- AddForeignKey
ALTER TABLE "professional_portfolio_photos" ADD CONSTRAINT "professional_portfolio_photos_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
