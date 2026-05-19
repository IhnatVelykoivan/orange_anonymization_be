import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { ResultsController } from './results.controller';
import { SyntheticDataController } from './synthetic-data.controller';
import { SyntheticDataService } from '@/modules/jobs/synthetic-data.service';
import { PresidioService } from './presidio.service';
import { Job } from './entities/job.entity';
import { User } from '@/modules/users/user.entity';
import { DashboardController } from '@/modules/dashboard/dashboard.controller';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, User]),
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtExpiresIn'),
        },
      }),
    }),
  ],
  controllers: [JobsController, ResultsController, DashboardController, SyntheticDataController],
  providers: [JobsService, PresidioService, SyntheticDataService],
  exports: [JobsService],
})
export class JobsModule {}
