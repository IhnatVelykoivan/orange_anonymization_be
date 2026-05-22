import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { SyntheticDataset } from '@/modules/synthetic-data/entities/synthetic-dataset.entity';
import { FakeDataService } from '@/modules/synthetic-data/fake-data.service';
import { SyntheticDataCleanupService } from '@/modules/synthetic-data/synthetic-data-cleanup.service';
import { SyntheticDataController } from '@/modules/synthetic-data/synthetic-data.controller';
import { SyntheticDataService } from '@/modules/synthetic-data/synthetic-data.service';
import { SyntheticExportService } from '@/modules/synthetic-data/synthetic-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyntheticDataset]),
    ScheduleModule.forRoot(),
    JobsModule,
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
  controllers: [SyntheticDataController],
  providers: [
    SyntheticDataService,
    FakeDataService,
    SyntheticExportService,
    SyntheticDataCleanupService,
  ],
})
export class SyntheticDataModule {}
