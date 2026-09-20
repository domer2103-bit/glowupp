-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "service_area_prefixes" TEXT[] DEFAULT ARRAY[]::TEXT[];
