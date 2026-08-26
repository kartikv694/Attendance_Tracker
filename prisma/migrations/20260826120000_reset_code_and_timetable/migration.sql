-- AlterTable: forgot-password support on users
ALTER TABLE "users" ADD COLUMN     "resetCodeHash" TEXT,
ADD COLUMN     "resetCodeExpiresAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" TEXT NOT NULL,
    "subjectSectionId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timetable_slots_subjectSectionId_dayOfWeek_startTime_key" ON "timetable_slots"("subjectSectionId", "dayOfWeek", "startTime");

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subjectSectionId_fkey" FOREIGN KEY ("subjectSectionId") REFERENCES "subject_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
