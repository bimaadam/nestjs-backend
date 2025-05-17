import { Controller, Post, Body, Req, UseGuards, UnauthorizedException, Get, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth-guard';
import { Response } from 'express';
import * as cookie from 'cookie';
import { PrismaService } from 'src/prisma/prisma.service';
import { error } from 'console';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) { }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response, // ⬅️ pakai Response dari express
  ) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.authService.login(user);

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: false, // true kalo HTTPS
      sameSite: 'lax',
    });

    return {
      message: 'Login sukses',
      data: token
    };
  }


  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    try {
      const user = await this.authService.register(registerDto);
      const { password, ...result } = user;
      return result;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new UnauthorizedException('Email already exists');
      }
      throw error;
    }
  }

  @Post('logout')
  async logout(@Body() body: { sessionToken: string }, @Req() req: Request) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) throw new UnauthorizedException('Token tidak ditemukan');

    if (!body.sessionToken) throw new UnauthorizedException('Session token tidak ditemukan');

    return this.authService.logout(token, body.sessionToken);
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req) {
    // Ambil sessionToken dari cookie
    const sessionToken = req.cookies?.session_token;
    console.log('Cookies:', req.cookies);
console.log('sessionToken:', sessionToken);
console.log('JWT user:', req.user);


    if (!sessionToken) {
      throw new UnauthorizedException('Session token tidak ditemukan');
    }

    // Ambil userId dari JWT payload
    const userId = req.user?.userId; // ✔️ Sekarang bener
    if (!userId) {
      throw new UnauthorizedException('User ID tidak valid di JWT');
    }

    const expectedToken = await this.prisma.session.findFirst({
  where: {
    userId: userId,
    sessionToken: sessionToken,
  },
});


    if (!expectedToken) {
      throw new UnauthorizedException('Session token tidak valid');
    }

    // Cek expired kalau lo simpen expireAt di DB
    const now = new Date();
    if (expectedToken.expires && expectedToken.expires < now) {
      throw new UnauthorizedException('Session token sudah expired');
    }

    // Token valid, balikin data user dari JWT
    return {
      message: "You're logged in!",
      user: req.user,
    };
  }
}