import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Endpoint public yang bisa diakses tanpa login
  @Get()
  welcome() {
    return "Welcome to our API! Please login at /auth/login";
  }

  // Endpoint protected yang butuh login
  @UseGuards(AuthGuard('jwt')) // Proteksi dengan JWT
  @Get('profile')
  getProfile(@Request() req) {
    return {
      message: "You're logged in!",
      user: req.user // Data user dari JWT token
    };
  }
}