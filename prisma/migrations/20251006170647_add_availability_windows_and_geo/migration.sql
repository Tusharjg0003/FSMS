-- AlterTable
ALTER TABLE "Job" ADD COLUMN "jobLatitude" REAL;
ALTER TABLE "Job" ADD COLUMN "jobLongitude" REAL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredLatitude" REAL;
ALTER TABLE "User" ADD COLUMN "preferredLongitude" REAL;
ALTER TABLE "User" ADD COLUMN "preferredRadiusKm" REAL;
ALTER TABLE "User" ADD COLUMN "timezone" TEXT;

-- CreateTable
CREATE TABLE "TechnicianAvailabilityWindow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startUtc" DATETIME NOT NULL,
    "endUtc" DATETIME NOT NULL,
    CONSTRAINT "TechnicianAvailabilityWindow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TechnicianAvailabilityWindow_userId_startUtc_endUtc_idx" ON "TechnicianAvailabilityWindow"("userId", "startUtc", "endUtc");
