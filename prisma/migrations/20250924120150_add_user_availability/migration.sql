-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "currentLatitude" REAL,
    "currentLongitude" REAL,
    "lastLocationUpdate" DATETIME,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "currentLatitude", "currentLongitude", "dateOfBirth", "email", "emailVerified", "id", "lastLocationUpdate", "name", "nationality", "password", "profilePicture", "roleId") SELECT "createdAt", "currentLatitude", "currentLongitude", "dateOfBirth", "email", "emailVerified", "id", "lastLocationUpdate", "name", "nationality", "password", "profilePicture", "roleId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Job_technicianId_startTime_idx" ON "Job"("technicianId", "startTime");

-- CreateIndex
CREATE INDEX "Job_startTime_idx" ON "Job"("startTime");
