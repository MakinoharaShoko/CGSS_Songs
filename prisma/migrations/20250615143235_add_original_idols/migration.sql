-- CreateTable
CREATE TABLE "songs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "attributeType" TEXT NOT NULL,
    "originalIdols" TEXT NOT NULL,
    "howToObtain" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "idols" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "song_idols" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "songId" INTEGER NOT NULL,
    "idolId" INTEGER NOT NULL,
    CONSTRAINT "song_idols_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "song_idols_idolId_fkey" FOREIGN KEY ("idolId") REFERENCES "idols" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "songs_name_key" ON "songs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "idols_name_key" ON "idols"("name");

-- CreateIndex
CREATE UNIQUE INDEX "song_idols_songId_idolId_key" ON "song_idols"("songId", "idolId");
