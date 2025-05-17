import { Controller, Post, Body, Req, UseGuards, UnauthorizedException, Get, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth-guard';

@Controller('auth')
export class AuthController {
  prisma: any
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
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
    // Ambil sessionToken dari cookie, misal
    const sessionToken = req.cookies?.session_token;
    if (!sessionToken) {
      throw new UnauthorizedException('Session token tidak ditemukan');
    }

    // Cek di DB session token masih valid dan belum expired
    const session = await this.prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      throw new UnauthorizedException('Session token tidak valid');
    }

    // Kalau session valid, balikin profile user dari token JWT
    return {
      message: "You're logged in!",
      user: req.user,
    };
  }
}