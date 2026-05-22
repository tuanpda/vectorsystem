import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SCOPES_KEY } from './scopes.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeys: ApiKeysService,
    private readonly jwtGuard: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest();
    const plainKey = this.extractApiKey(req);

    if (plainKey) {
      if (!requiredScopes?.length) {
        throw new UnauthorizedException(
          'API key cannot access this endpoint. Use admin JWT.',
        );
      }
      const auth = await this.apiKeys.validatePlainKey(plainKey);
      if (!auth) {
        throw new UnauthorizedException('Invalid or revoked API key');
      }
      this.apiKeys.assertScopes(auth, requiredScopes);
      req.user = auth;
      return true;
    }

    return this.jwtGuard.canActivate(context) as Promise<boolean>;
  }

  private extractApiKey(req: {
    headers: Record<string, string | string[] | undefined>;
  }): string | null {
    const header = req.headers['x-api-key'];
    if (typeof header === 'string' && header.trim()) {
      return header.trim();
    }
    const auth = req.headers.authorization;
    if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
      return null;
    }
    const token = auth.slice(7).trim();
    if (token.startsWith('mk_live_')) {
      return token;
    }
    return null;
  }
}
