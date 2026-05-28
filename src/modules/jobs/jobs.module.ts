import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from '@/modules/users/user.entity';
import { ConfigService } from '@nestjs/config';

import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { ResultsController } from './results.controller';
import { PresidioService } from './presidio.service';
import { Job } from './entities/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, User]),
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
  controllers: [JobsController, ResultsController],
  providers: [JobsService, PresidioService],
  exports: [JobsService, PresidioService],
})
export class JobsModule {}
