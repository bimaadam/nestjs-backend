import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
async isTokenBlacklisted(token: string): Promise<boolean> {
  const found = await this.prisma.blacklistToken.findFirst({
    where: { access_token: token },
  });
  return !!found;
}


  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new UnauthorizedException('Email tidak ditemukan');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password salah');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
  const payload = { email: user.email, sub: user.id, role: user.role, name: user.name };
  const accessToken = this.jwtService.sign(payload);

  // 1. Generate session token
  const sessionToken = randomBytes(32).toString('hex');

  // 2. Hitung expired date, misal 7 hari
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 3. Masukin ke Session table
  await this.prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  return {
    access_token: accessToken,
    session_token: sessionToken, // tambahin ini buat client simpen
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    isVerified?: boolean;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
        isVerified: true,
      },
    });
  }

  async logout(token: string) {
  try {
    const decoded = this.jwtService.verify(token);
    const user = decoded;

    // Cek jika token sudah di-blacklist
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return { message: 'Token sudah di-blacklist' };
    }

    // Masukkan token ke blacklist
    await this.prisma.blacklistToken.create({
      data: {
        userId: user.sub,
        access_token: token,
        expires_at: new Date(decoded.exp * 1000),
      },
    });

    return { message: 'Logout berhasil' };
  } catch (error) {
    console.log('Logout Error:', error.message);
    return { message: 'Logout berhasil' }; 
  }
}


  async blacklistedtoken( id: string): Promise<boolean> {
    const found = await this.prisma.blacklistToken.findUnique({
      where: { id },
    });
    return !!found;
  }
}
