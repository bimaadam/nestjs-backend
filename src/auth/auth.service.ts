import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
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
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        name: `${data.firstName} ${data.lastName}`.trim(),
      },
    });
  }
}