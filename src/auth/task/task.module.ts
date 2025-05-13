// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { CleanupTokensTask } from './cleanup-tokens.task';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CleanupTokensTask]
})
export class TasksModule {}