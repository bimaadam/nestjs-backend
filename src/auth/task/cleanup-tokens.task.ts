// src/tasks/cleanup-tokens.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CleanupTokensTask {
  private readonly logger = new Logger(CleanupTokensTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM) // Atau pakai string '0 3 * * *'
  async handleExpiredTokens() {
    this.logger.log('Running expired tokens cleanup...');
    
    try {
      const result = await this.prisma.blacklistedToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date() // Hapus token yang expired
          }
        }
      });

      this.logger.log(`Deleted ${result.count} expired tokens`);
    } catch (error) {
      this.logger.error('Failed to cleanup tokens:', error);
    }
  }
}