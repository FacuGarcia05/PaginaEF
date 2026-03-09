import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedApiKey = process.env.ADMIN_API_KEY;

    if (!expectedApiKey) {
      throw new UnauthorizedException('admin key is not configured');
    }

    const providedApiKey = request.header('x-admin-key');

    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      throw new UnauthorizedException('invalid admin key');
    }

    return true;
  }
}
