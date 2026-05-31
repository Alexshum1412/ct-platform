-- CreateTable
CREATE TABLE "daily_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "daily_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "subjectId" TEXT NOT NULL,
    "topicId" TEXT,
    "subtopicId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SINGLE_CHOICE',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "part" TEXT NOT NULL DEFAULT 'A',
    "section" TEXT,
    "content" TEXT NOT NULL,
    "options" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "solution" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "hints" TEXT,
    "videoUrl" TEXT,
    "videoDuration" INTEGER,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "year" INTEGER,
    "source" TEXT,
    "timesSolved" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "avgTimeSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "reviewedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "questions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "questions_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "subtopics" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_questions" ("avgTimeSeconds", "content", "correctAnswer", "createdAt", "createdBy", "difficulty", "explanation", "externalId", "hints", "id", "options", "reviewedBy", "solution", "source", "status", "subjectId", "subtopicId", "tags", "timesCorrect", "timesSolved", "topicId", "type", "updatedAt", "videoDuration", "videoUrl", "year") SELECT "avgTimeSeconds", "content", "correctAnswer", "createdAt", "createdBy", "difficulty", "explanation", "externalId", "hints", "id", "options", "reviewedBy", "solution", "source", "status", "subjectId", "subtopicId", "tags", "timesCorrect", "timesSolved", "topicId", "type", "updatedAt", "videoDuration", "videoUrl", "year" FROM "questions";
DROP TABLE "questions";
ALTER TABLE "new_questions" RENAME TO "questions";
CREATE UNIQUE INDEX "questions_externalId_key" ON "questions"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "daily_progress_userId_date_key" ON "daily_progress"("userId", "date");
