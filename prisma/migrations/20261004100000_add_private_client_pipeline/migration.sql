-- CreateEnum
CREATE TYPE "PipelineLockStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "is_private_pipeline" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "van_qr_slug" TEXT;

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "deposit_amount" INTEGER,
ADD COLUMN     "deposit_received_at" TIMESTAMP(3),
ADD COLUMN     "deposit_requested_at" TIMESTAMP(3),
ADD COLUMN     "quote_line_items" JSONB;

-- CreateTable
CREATE TABLE "private_pipeline_sessions" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "homeowner_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "lock_status" "PipelineLockStatus" NOT NULL DEFAULT 'ACTIVE',
    "estimate_requested_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_pipeline_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "private_pipeline_sessions_project_id_key" ON "private_pipeline_sessions"("project_id");

-- CreateIndex
CREATE INDEX "private_pipeline_sessions_professional_id_lock_status_idx" ON "private_pipeline_sessions"("professional_id", "lock_status");

-- CreateIndex
CREATE INDEX "private_pipeline_sessions_homeowner_id_idx" ON "private_pipeline_sessions"("homeowner_id");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_referral_code_key" ON "professionals"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_van_qr_slug_key" ON "professionals"("van_qr_slug");

-- AddForeignKey
ALTER TABLE "private_pipeline_sessions" ADD CONSTRAINT "private_pipeline_sessions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_pipeline_sessions" ADD CONSTRAINT "private_pipeline_sessions_homeowner_id_fkey" FOREIGN KEY ("homeowner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_pipeline_sessions" ADD CONSTRAINT "private_pipeline_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row Level Security: deny-all to direct (anon/authenticated) access, same
-- as activity_log — only server-side Prisma code touches this table.
alter table public.private_pipeline_sessions enable row level security;
