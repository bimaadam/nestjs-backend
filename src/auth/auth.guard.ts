import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma/prisma.service";
import { Request } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies['token'];

    if (!token) {
      throw new UnauthorizedException('Token tidak ditemukan');
    }

    try {
      const decoded = this.jwtService.verify(token);

      // Cek token blacklist
      const isBlacklisted = await this.prisma.blacklistToken.findFirst({
        where: { access_token: token },
      });
      if (isBlacklisted) {
        throw new UnauthorizedException('Token sudah tidak berlaku');
      }

      // Cek session valid di DB
      const session = await this.prisma.session.findFirst({
        where: {
          userId: decoded.sub,
          expires: { gt: new Date() },
        },
      });
      if (!session) {
        throw new UnauthorizedException('Session tidak valid');
      }

      req['user'] = decoded; // Simpan user di req buat controller
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token tidak valid atau expired');
    }
  }
}
