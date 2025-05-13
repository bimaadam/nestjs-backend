import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const token = this.extractToken(request);

  if (!token) {
    throw new UnauthorizedException('Token tidak ditemukan');
  }

  try {
    // Cek apakah token sudah di-blacklist
    const isBlacklisted = await this.authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token telah logout');
    }

    const payload = this.jwtService.verify(token);
    request.user = payload;
    return true;
  } catch (err) {
    console.log('Auth Guard Error:', err.message);
    throw new UnauthorizedException('Token tidak valid');
  }
}


  private extractToken(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
