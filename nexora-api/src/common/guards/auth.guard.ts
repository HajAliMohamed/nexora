import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.access_token;

    if (!token) throw new UnauthorizedException();

    try {
      const payload = this.jwtService.verify(token);
      (request as any).user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
