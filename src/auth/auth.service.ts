// auth.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

// auth.service.ts

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        isVerified: false,
        role: 'CLIENT',
      },
    });

    return this.signToken(user.id, user.email, user.role);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new ForbiddenException('User not found');

    const pwMatch = await bcrypt.compare(dto.password, user.password);
    if (!pwMatch) throw new ForbiddenException('Password salah');

    // update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return this.signToken(user.id, user.email, user.role);
  }

  private signToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const token = this.jwt.sign(payload, { expiresIn: '1h' });
    return { access_token: token };
  }
}

