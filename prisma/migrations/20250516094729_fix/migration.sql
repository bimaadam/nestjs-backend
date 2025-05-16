/*
  Warnings:

  - A unique constraint covering the columns `[access_token,expires_at]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Account_provider_providerAccountId_access_token_expires_at_key";

-- CreateIndex
CREATE UNIQUE INDEX "Account_access_token_expires_at_key" ON "Account"("access_token", "expires_at");
