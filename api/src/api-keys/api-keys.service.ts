import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  API_KEY_PREFIX,
  API_KEY_PREFIX_DISPLAY_LEN,
} from './api-keys.constants';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

export type ApiKeyAuthUser = {
  authType: 'api_key';
  apiKeyId: string;
  tenantId: string;
  scopes: string[];
  name: string;
};

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  private hashKey(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }

  generatePlainKey(): string {
    return `${API_KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
  }

  async create(dto: CreateApiKeyDto, createdBy?: string) {
    const plain = this.generatePlainKey();
    const keyHash = this.hashKey(plain);
    const keyPrefix = plain.slice(0, API_KEY_PREFIX_DISPLAY_LEN);
    const tenantId = dto.tenantId?.trim() || 'default';

    const row = await this.prisma.apiKey.create({
      data: {
        name: dto.name.trim(),
        tenantId,
        keyHash,
        keyPrefix,
        scopes: ['rag:query'],
        createdBy: createdBy ?? null,
      },
      select: {
        id: true,
        name: true,
        tenantId: true,
        keyPrefix: true,
        scopes: true,
        createdAt: true,
      },
    });

    return {
      ...row,
      /** Chỉ trả một lần — lưu ngay, không xem lại được */
      secret: plain,
    };
  }

  async list() {
    return this.prisma.apiKey.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tenantId: true,
        keyPrefix: true,
        scopes: true,
        createdAt: true,
        creator: { select: { email: true, displayName: true } },
      },
    });
  }

  async revoke(id: string) {
    const row = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('API key not found');
    }
    if (row.revokedAt) {
      return { ok: true, alreadyRevoked: true };
    }
    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async validatePlainKey(plain: string): Promise<ApiKeyAuthUser | null> {
    if (!plain.startsWith(API_KEY_PREFIX) || plain.length < 20) {
      return null;
    }
    const prefix = plain.slice(0, API_KEY_PREFIX_DISPLAY_LEN);
    const hash = this.hashKey(plain);

    const row = await this.prisma.apiKey.findFirst({
      where: {
        keyPrefix: prefix,
        keyHash: hash,
        revokedAt: null,
      },
    });
    if (!row) {
      return null;
    }
    return {
      authType: 'api_key',
      apiKeyId: row.id,
      tenantId: row.tenantId,
      scopes: row.scopes,
      name: row.name,
    };
  }

  assertScopes(user: ApiKeyAuthUser, required: string[]) {
    const missing = required.filter((s) => !user.scopes.includes(s));
    if (missing.length > 0) {
      throw new UnauthorizedException(
        `API key missing scope(s): ${missing.join(', ')}`,
      );
    }
  }
}
