-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HOMEOWNER', 'PROFESSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'COLLECTING_INFORMATION', 'DESIGNING', 'DESIGN_READY', 'REQUESTING_QUOTES', 'QUOTES_RECEIVED', 'PROFESSIONAL_SELECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('BEFORE', 'INSPIRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DesignConceptStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('PENDING', 'VIEWED', 'DECLINED', 'QUOTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "postcode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "homeowner_id" UUID NOT NULL,
    "project_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "postcode" TEXT NOT NULL,
    "budget_min" INTEGER,
    "budget_max" INTEGER,
    "target_start_date" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_photos" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "photo_type" "PhotoType" NOT NULL DEFAULT 'BEFORE',
    "upload_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_requirements" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_concepts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "source_photo_id" UUID NOT NULL,
    "storage_path" TEXT,
    "generation_prompt" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL,
    "status" "DesignConceptStatus" NOT NULL DEFAULT 'PENDING',
    "selected_by_user" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "description" TEXT,
    "postcode" TEXT NOT NULL,
    "service_radius_km" INTEGER,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_services" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "project_type" TEXT NOT NULL,

    CONSTRAINT "professional_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "homeowner_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewed_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "quote_amount" INTEGER,
    "quote_timeline" TEXT,
    "quote_notes" TEXT,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actor_id" UUID,
    "project_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projects_homeowner_id_idx" ON "projects"("homeowner_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_project_type_idx" ON "projects"("project_type");

-- CreateIndex
CREATE INDEX "project_photos_project_id_idx" ON "project_photos"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_requirements_project_id_key" ON "project_requirements"("project_id");

-- CreateIndex
CREATE INDEX "design_concepts_project_id_idx" ON "design_concepts"("project_id");

-- CreateIndex
CREATE INDEX "design_concepts_source_photo_id_idx" ON "design_concepts"("source_photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "design_concepts_project_id_version_key" ON "design_concepts"("project_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_user_id_key" ON "professionals"("user_id");

-- CreateIndex
CREATE INDEX "professional_services_professional_id_idx" ON "professional_services"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_services_professional_id_project_type_key" ON "professional_services"("professional_id", "project_type");

-- CreateIndex
CREATE INDEX "quote_requests_project_id_idx" ON "quote_requests"("project_id");

-- CreateIndex
CREATE INDEX "quote_requests_professional_id_idx" ON "quote_requests"("professional_id");

-- CreateIndex
CREATE INDEX "quote_requests_homeowner_id_idx" ON "quote_requests"("homeowner_id");

-- CreateIndex
CREATE INDEX "activity_log_project_id_idx" ON "activity_log"("project_id");

-- CreateIndex
CREATE INDEX "activity_log_actor_id_idx" ON "activity_log"("actor_id");

-- CreateIndex
CREATE INDEX "activity_log_type_idx" ON "activity_log"("type");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_homeowner_id_fkey" FOREIGN KEY ("homeowner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_concepts" ADD CONSTRAINT "design_concepts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_concepts" ADD CONSTRAINT "design_concepts_source_photo_id_fkey" FOREIGN KEY ("source_photo_id") REFERENCES "project_photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_homeowner_id_fkey" FOREIGN KEY ("homeowner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
