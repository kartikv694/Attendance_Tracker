/*
  Warnings:

  - A unique constraint covering the columns `[classTeacherId]` on the table `sections` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "classTeacherId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sections_classTeacherId_key" ON "sections"("classTeacherId");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
