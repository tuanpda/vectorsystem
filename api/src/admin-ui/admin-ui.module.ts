import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';

const adminDist = join(__dirname, '..', '..', '..', 'admin-ui', 'dist');

@Module({
  imports: existsSync(adminDist)
    ? [
        ServeStaticModule.forRoot({
          rootPath: adminDist,
          serveRoot: '/admin',
          exclude: ['/api/v1*', '/docs*'],
        }),
      ]
    : [],
})
export class AdminUiModule {}
