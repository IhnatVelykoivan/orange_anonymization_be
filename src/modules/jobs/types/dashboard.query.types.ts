import { JobStatus } from '@/modules/jobs/entities/job.entity';

export interface RecentActivityRaw {
  job_id: string;
  job_framework: string | null;
  job_status: JobStatus;
  job_createdAt: Date | string;
  fileName: string | null;
  entitiesCount: string;
}

export interface ChartDataRaw {
  date: string;
  documentsCount: string;
  entitiesCount: string;
}

export interface FrameworkDistributionRaw {
  key: string | null;
  count: string;
}

export interface EntityDistributionRaw {
  key: string;
  count: string;
}
