import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SyntheticDataset } from '@/modules/synthetic-data/entities/synthetic-dataset.entity';
import { SyntheticExportService } from '@/modules/synthetic-data/synthetic-export.service';

@Injectable()
export class SyntheticDataCleanupService {
  private readonly logger = new Logger(SyntheticDataCleanupService.name);

  constructor(
    @InjectRepository(SyntheticDataset)
    private readonly datasetRepository: Repository<SyntheticDataset>,
    private readonly exportService: SyntheticExportService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sweepExpired(): Promise<void> {
    try {
      const expired = await this.datasetRepository.find({
        where: { expiresAt: LessThan(new Date()) },
      });

      if (expired.length === 0) {
        return;
      }

      for (const dataset of expired) {
        if (dataset.filePath) {
          await this.exportService.remove(dataset.filePath);
        }
      }

      await this.datasetRepository.remove(expired);
      this.logger.log(`Swept ${expired.length} expired synthetic datasets`);
    } catch (error) {
      this.logger.error(
        'Failed to sweep expired synthetic datasets',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
