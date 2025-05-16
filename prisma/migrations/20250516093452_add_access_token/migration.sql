/*
  Warnings:

  - Made the column `expires_at` on table `Account` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "expires_at" SET NOT NULL;
