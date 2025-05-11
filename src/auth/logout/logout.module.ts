import { Module } from '@nestjs/common';
import { LogoutService } from './logout.service';

@Module({
  providers: [LogoutService]
})
export class LogoutModule {}
