-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "enrollmentKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_instructor" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_session" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderNumber" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_progress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "courseSessionId" TEXT NOT NULL,
    "isVisited" BOOLEAN NOT NULL DEFAULT false,
    "visitedAt" TIMESTAMP(3),
    "lastVisitedAt" TIMESTAMP(3),

    CONSTRAINT "enrollment_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" TEXT NOT NULL,
    "courseSessionId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_chunk" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseSessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_message" (
    "id" TEXT NOT NULL,
    "aiChatSessionId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audioUrl" TEXT,
    "ragSources" JSONB,
    "responseTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollmentKey_key" ON "course"("enrollmentKey");

-- CreateIndex
CREATE INDEX "course_enrollmentKey_idx" ON "course"("enrollmentKey");

-- CreateIndex
CREATE UNIQUE INDEX "course_instructor_courseId_userId_key" ON "course_instructor"("courseId", "userId");

-- CreateIndex
CREATE INDEX "enrollment_userId_idx" ON "enrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_courseId_userId_key" ON "enrollment"("courseId", "userId");

-- CreateIndex
CREATE INDEX "course_session_courseId_idx" ON "course_session"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_session_courseId_orderNumber_key" ON "course_session"("courseId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_progress_enrollmentId_courseSessionId_key" ON "enrollment_progress"("enrollmentId", "courseSessionId");

-- CreateIndex
CREATE INDEX "material_courseSessionId_idx" ON "material"("courseSessionId");

-- CreateIndex
CREATE INDEX "material_isProcessed_idx" ON "material"("isProcessed");

-- CreateIndex
CREATE INDEX "vector_chunk_materialId_idx" ON "vector_chunk"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "vector_chunk_materialId_chunkIndex_key" ON "vector_chunk"("materialId", "chunkIndex");

-- CreateIndex
CREATE INDEX "ai_chat_session_userId_courseSessionId_idx" ON "ai_chat_session"("userId", "courseSessionId");

-- CreateIndex
CREATE INDEX "ai_chat_session_userId_idx" ON "ai_chat_session"("userId");

-- CreateIndex
CREATE INDEX "ai_chat_message_aiChatSessionId_idx" ON "ai_chat_message"("aiChatSessionId");

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_instructor" ADD CONSTRAINT "course_instructor_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_instructor" ADD CONSTRAINT "course_instructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_session" ADD CONSTRAINT "course_session_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_session" ADD CONSTRAINT "course_session_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_progress" ADD CONSTRAINT "enrollment_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_progress" ADD CONSTRAINT "enrollment_progress_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "course_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "course_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_chunk" ADD CONSTRAINT "vector_chunk_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_session" ADD CONSTRAINT "ai_chat_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_session" ADD CONSTRAINT "ai_chat_session_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_session" ADD CONSTRAINT "ai_chat_session_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "course_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_message" ADD CONSTRAINT "ai_chat_message_aiChatSessionId_fkey" FOREIGN KEY ("aiChatSessionId") REFERENCES "ai_chat_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
