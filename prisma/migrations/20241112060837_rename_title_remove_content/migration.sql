/*
  Warnings:

  - Added the required column `cuisine` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dinner_time` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cuisine" TEXT NOT NULL,
ADD COLUMN     "dinner_time" TEXT NOT NULL;
