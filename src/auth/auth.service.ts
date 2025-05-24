import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Cek apakah token sudah di-blacklist
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const found = await this.prisma.blacklistToken.findFirst({
      where: { access_token: token },
    });
    return !!found;
  }

  // Validasi user pakai email dan password
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Email tidak ditemukan');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Password salah');

    const { password: _, ...result } = user;
    return result;
  }

  // LOGIN hanya dengan accessToken
  async login(user: any, res: Response) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

    // Buat JWT access token dengan expiry 7 hari
    const payload = { email: user.email, sub: user.id, role: user.role, name: user.name };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Simpan access token di account (upsert)
    await this.prisma.account.updateMany({
      where: { userId: user.id },
      data: {
        access_token: accessToken,
        expires_at: expires,
      },
    });

    // Kalau tidak ada record, buat baru
    const existAccount = await this.prisma.account.findFirst({ where: { userId: user.id } });
    if (!existAccount) {
      await this.prisma.account.create({
        data: {
          userId: user.id,
          access_token: accessToken,
          expires_at: expires,
          provider: 'custom',
          providerAccountId: user.id.toString(),
        },
      });
    }

    // Simpan ke cookie
    res.cookie('token', accessToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      partitioned: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Login sukses',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // REGISTER user baru
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

  // LOGOUT: blacklist token
  async logout(accessToken: string) {
    // Verifikasi JWT dulu
    let decoded: any;
    try {
      decoded = this.jwtService.verify(accessToken);
    } catch {
      throw new UnauthorizedException('Token tidak valid');
    }

    // Cek blacklist token
    const isBlacklisted = await this.isTokenBlacklisted(accessToken);
    if (isBlacklisted) return { message: 'Token sudah di-blacklist' };

    // Masukkan token ke blacklist
    await this.prisma.blacklistToken.create({
      data: {
        userId: decoded.sub,
        access_token: accessToken,
        expires_at: new Date(decoded.exp * 1000),
      },
    });

    // Hapus access_token dari account
    await this.prisma.account.updateMany({
      where: { userId: decoded.sub, access_token: accessToken },
      data: { access_token: undefined, expires_at: undefined },
    });

    return { message: 'Logout berhasil' };
  }
}
