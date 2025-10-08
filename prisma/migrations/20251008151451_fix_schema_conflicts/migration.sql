-- AlterTable
ALTER TABLE "Job" ADD COLUMN "jobLatitude" REAL;
ALTER TABLE "Job" ADD COLUMN "jobLongitude" REAL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredLatitude" REAL;
ALTER TABLE "User" ADD COLUMN "preferredLongitude" REAL;
ALTER TABLE "User" ADD COLUMN "preferredRadiusKm" REAL;
ALTER TABLE "User" ADD COLUMN "timezone" TEXT;
