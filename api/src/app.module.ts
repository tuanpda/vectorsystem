import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AdminUiModule } from './admin-ui/admin-ui.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { IndexModule } from './index/index.module';
import { ParseModule } from './parse/parse.module';
import { RagModule } from './rag/rag.module';
import { UsageModule } from './usage/usage.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    AppConfigModule,
    UsageModule,
    PrismaModule,
    StorageModule,
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (config: AppConfigService) => ({
        connection: { url: config.redisUrl },
      }),
      inject: [AppConfigService],
    }),
    AuthModule,
    ApiKeysModule,
    DashboardModule,
    UsersModule,
    HealthModule,
    DocumentsModule,
    ParseModule,
    IndexModule,
    RagModule,
    AdminUiModule,
  ],
})
export class AppModule {}
