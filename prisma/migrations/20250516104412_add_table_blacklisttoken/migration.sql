-- AddForeignKey
ALTER TABLE "BlacklistToken" ADD CONSTRAINT "BlacklistToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
