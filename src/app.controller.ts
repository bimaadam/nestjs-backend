import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor() {}

  // Endpoint public yang bisa diakses tanpa login
  @Get()
  welcome() {
    return "Welcome to our API! Please login at /auth/login";
  }

}