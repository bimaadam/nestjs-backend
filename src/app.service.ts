import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    throw new Error('Method not implemented.');
  }
  getHealthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: true,
        cache: true,
        thirdParty: true
      }
    };
  }
}