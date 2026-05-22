import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return Number(this.config.get<string>('API_PORT', '3000'));
  }

  /** 127.0.0.1 trên VPS (chỉ Nginx proxy); 0.0.0.0 nếu cần listen mọi interface */
  get host(): string {
    return this.config.get<string>('API_HOST', '0.0.0.0');
  }

  get corsOrigins(): string[] {
    const raw = this.config.get<string>('CORS_ORIGINS', '');
    if (raw.trim()) {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (this.nodeEnv === 'production') {
      return [];
    }
    return [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
    ];
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get redisUrl(): string {
    return this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6380');
  }

  get mineruApiUrl(): string {
    return this.config.get<string>('MINERU_API_URL', 'http://127.0.0.1:8000');
  }

  get mineruPollIntervalMs(): number {
    return Number(this.config.get<string>('MINERU_POLL_INTERVAL_MS', '2000'));
  }

  get mineruTaskTimeoutMs(): number {
    return Number(
      this.config.get<string>('MINERU_TASK_TIMEOUT_MS', '3600000'),
    );
  }

  get parseQueueConcurrency(): number {
    return Number(this.config.get<string>('PARSE_QUEUE_CONCURRENCY', '1'));
  }

  get minio() {
    return {
      endpoint: this.config.get<string>('MINIO_ENDPOINT', '127.0.0.1'),
      port: Number(this.config.get<string>('MINIO_PORT', '9000')),
      useSsl: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'mkminio'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'mkminio_secret'),
      bucket: this.config.get<string>('MINIO_BUCKET', 'knowledge'),
    };
  }

  get jwtSecret(): string {
    return this.config.get<string>('JWT_SECRET', 'dev-secret-change-me');
  }

  get jwtExpiresIn(): string {
    return this.config.get<string>('JWT_EXPIRES_IN', '7d');
  }

  get adminEmail(): string {
    return this.config.get<string>('ADMIN_EMAIL', 'admin@local.dev');
  }

  get adminPassword(): string {
    return this.config.get<string>('ADMIN_PASSWORD', 'admin123');
  }

  get adminDisplayName(): string {
    return this.config.get<string>('ADMIN_DISPLAY_NAME', 'Administrator');
  }

  get openaiApiKey(): string | undefined {
    return this.config.get<string>('OPENAI_API_KEY');
  }

  /** Admin key — optional, for OpenAI Costs API (billing thật) */
  get openaiAdminApiKey(): string | undefined {
    return this.config.get<string>('OPENAI_ADMIN_API_KEY');
  }

  /** USD per 1M tokens; override bảng giá mặc định */
  get embeddingPricePer1MUsd(): number | undefined {
    const v = this.config.get<string>('EMBEDDING_PRICE_PER_1M_USD');
    return v ? Number(v) : undefined;
  }

  /** openai | ollama */
  get embeddingProvider(): string {
    return this.config.get<string>('EMBEDDING_PROVIDER', 'openai').toLowerCase();
  }

  get ollamaBaseUrl(): string {
    return this.config.get<string>('OLLAMA_BASE_URL', 'http://127.0.0.1:11434');
  }

  get embeddingModel(): string {
    if (this.embeddingProvider === 'ollama') {
      return this.config.get<string>('OLLAMA_EMBED_MODEL', 'nomic-embed-text');
    }
    return this.config.get<string>(
      'EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
  }

  get embeddingDimensions(): number {
    return Number(this.config.get<string>('EMBEDDING_DIMENSIONS', '1536'));
  }

  get chunkMaxChars(): number {
    return Number(this.config.get<string>('CHUNK_MAX_CHARS', '4000'));
  }

  get chunkOverlapChars(): number {
    return Number(this.config.get<string>('CHUNK_OVERLAP_CHARS', '200'));
  }

  get embeddingBatchSize(): number {
    return Number(this.config.get<string>('EMBEDDING_BATCH_SIZE', '32'));
  }
}
