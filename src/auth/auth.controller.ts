// Import tipe express saja untuk Req dan Res
import { Request, Response } from 'express';
import { Controller, Post, Body, Req, Res, Get, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
// ... import lainnya

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
async register(
  @Body() body: RegisterDto,
  @Res({ passthrough: true }) res: Response,
) {
  // 1. Buat user baru
  const newUser = await this.authService.register(body);

  // 2. Otomatis login setelah register
  const loginData = await this.authService.login(newUser, res);

  // 3. Return responsenya
  return {
    message: 'Registrasi sukses',
    data: loginData,
  };
}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const data = await this.authService.login(user, res);

    // Return only data, no fetching or redirect logic for frontend
    return {
      message: 'Login sukses',
      data,
    };
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    const token = req.cookies['token'];
    const sessionToken = req.cookies['session_token'];

    if (!token || !sessionToken) {
      throw new UnauthorizedException('Token atau session tidak ditemukan');
    }

    return this.authService.logout(token, sessionToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Req() req: Request) {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      throw new UnauthorizedException('Session token tidak ditemukan');
    }

    const userId = (req.user as { id: string | number })?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID tidak valid di JWT');
    }

    const expectedToken = await this.prisma.session.findFirst({
      where: {
        userId: String(userId),
        sessionToken: sessionToken,
      },
    });

    if (!expectedToken) {
      throw new UnauthorizedException('Session token tidak valid');
    }

    if (expectedToken.expires && expectedToken.expires < new Date()) {
      throw new UnauthorizedException('Session token sudah expired');
    }

    // Return only user data, no fetching or redirect logic for frontend
    return {
      message: "You're logged in!",
      user: req.user,
    };
  }
}
