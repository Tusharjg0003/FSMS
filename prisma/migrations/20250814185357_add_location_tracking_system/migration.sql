-- AlterTable
ALTER TABLE "User" ADD COLUMN "currentLatitude" REAL;
ALTER TABLE "User" ADD COLUMN "currentLongitude" REAL;
ALTER TABLE "User" ADD COLUMN "lastLocationUpdate" DATETIME;

-- CreateTable
CREATE TABLE "LocationHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accuracy" REAL,
    "speed" REAL,
    "heading" REAL,
    "jobId" INTEGER,
    CONSTRAINT "LocationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LocationHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
