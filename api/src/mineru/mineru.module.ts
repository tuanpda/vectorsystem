import { Module } from '@nestjs/common';
import { MineruService } from './mineru.service';

@Module({
  providers: [MineruService],
  exports: [MineruService],
})
export class MineruModule {}
