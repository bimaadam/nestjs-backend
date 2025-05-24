import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

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

  // LOGIN dengan validasi session dulu
  async login(user: any, res: Response) {
    // Cek session aktif user (belum expired)
    const existingSession = await this.prisma.session.findFirst({
      where: {
        userId: user.id,
        expires: { gt: new Date() }, // belum expired
      },
    });

    let sessionToken: string;
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

    if (existingSession) {
      // Pakai session token lama kalau masih valid
      sessionToken = existingSession.sessionToken;
    } else {
      // Buat session baru
      sessionToken = randomBytes(32).toString('hex');

      // Hapus session lama kalau ada (expired)
      await this.prisma.session.deleteMany({
        where: {
          userId: user.id,
          expires: { lte: new Date() }, // expired session
        },
      });

      // Simpan session baru
      await this.prisma.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires,
        },
      });
    }

    // Buat JWT access token dengan expiry 7 hari
    const payload = { email: user.email, sub: user.id, role: user.role, name: user.name };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Simpan access token di account (upsert)
    // Hapus dulu account token lama user itu
await this.prisma.account.updateMany({
  where: { userId: user.id },
  data: {
    access_token: accessToken,
    expires_at: expires,
  },
});

// Kalau tidak ada record, buat baru (buat aman)
const existAccount = await this.prisma.account.findFirst({ where: { userId: user.id } });
if (!existAccount) {
  await this.prisma.account.create({
    data: {
      userId: user.id,
      access_token: accessToken,
      expires_at: expires,
      // Lengkapi field wajib lain kalau ada
      provider: 'custom',
      providerAccountId: sessionToken, // Contoh, sesuaikan
    },
  });
}


    // Set cookie accessToken ke client
    res.cookie('token', accessToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: process.env.NODE_ENV === 'production', // true kalo HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Optional juga set cookie session token kalau perlu
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      sessionToken, // optional kalau frontend mau simpan juga
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

  // LOGOUT: blacklist token dan hapus session
  async logout(accessToken: string, sessionToken: string) {
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

    // Hapus session yang cocok dengan sessionToken
    await this.prisma.session.deleteMany({
      where: {
        userId: decoded.sub,
        sessionToken,
      },
    });

    return { message: 'Logout berhasil' };
  }
}
