import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { UsageModule } from '../usage/usage.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [HealthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
