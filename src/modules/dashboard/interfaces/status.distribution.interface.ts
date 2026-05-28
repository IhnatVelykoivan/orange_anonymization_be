import { JobStatus } from '@/modules/jobs/entities/job.entity';

export interface StatusDistribution {
  key: JobStatus;
  count: number;
}
