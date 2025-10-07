-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobTypeId" INTEGER NOT NULL,
    "jobTypeName" TEXT,
    "status" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "location" TEXT NOT NULL,
    "technicianId" INTEGER,
    "needsReassignment" BOOLEAN NOT NULL DEFAULT false,
    "reassignmentNote" TEXT,
    CONSTRAINT "Job_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("endTime", "id", "jobTypeId", "jobTypeName", "location", "startTime", "status", "technicianId") SELECT "endTime", "id", "jobTypeId", "jobTypeName", "location", "startTime", "status", "technicianId" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE INDEX "Job_technicianId_startTime_idx" ON "Job"("technicianId", "startTime");
CREATE INDEX "Job_startTime_idx" ON "Job"("startTime");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Job_needsReassignment_idx" ON "Job"("needsReassignment");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerified" DATETIME,
    "profilePicture" TEXT,
    "nationality" TEXT,
    "dateOfBirth" DATETIME,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "preferredWorkingLocation" TEXT,
    "currentLatitude" REAL,
    "currentLongitude" REAL,
    "lastLocationUpdate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "currentLatitude", "currentLongitude", "dateOfBirth", "email", "emailVerified", "id", "isAvailable", "lastLocationUpdate", "name", "nationality", "password", "preferredWorkingLocation", "profilePicture", "roleId") SELECT "createdAt", "currentLatitude", "currentLongitude", "dateOfBirth", "email", "emailVerified", "id", "isAvailable", "lastLocationUpdate", "name", "nationality", "password", "preferredWorkingLocation", "profilePicture", "roleId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
