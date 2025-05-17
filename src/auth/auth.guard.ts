import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      // gak ada token, tapi gak masalah, lanjut aja
      return true;
    }

    // cek blacklist dan verifikasi token
    try {
      const payload = this.jwtService.verify(token);
      const isBlacklisted = await this.authService.isTokenBlacklisted(token);
      if (isBlacklisted) throw new UnauthorizedException('Token sudah tidak valid');

      // simpen user di request buat dipakai controller
      request.user = payload;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Token gak valid');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return null;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
