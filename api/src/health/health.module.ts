import { Module } from '@nestjs/common';
import { MineruModule } from '../mineru/mineru.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [MineruModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
