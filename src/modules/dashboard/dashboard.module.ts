import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { ConfigService } from '@nestjs/config';

import { AnalysesController, DashboardController } from './dashboard.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtExpiresIn'),
        },
      }),
    }),
    JobsModule,
  ],
  controllers: [DashboardController, AnalysesController],
})
export class DashboardModule {}
