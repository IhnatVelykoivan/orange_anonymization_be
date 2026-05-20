import { JobStatus } from '@/modules/jobs/entities/job.entity';

export interface DashboardData {
  metrics: Metrics;
  chartData: ChartData[];
  recentActivity: RecentActivity[];
  strategiesDistribution: DistributionData[];
  frameworksDistribution: DistributionData[];
  entitiesDistribution: DistributionData[];
  message?: string;
  emptyState?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface RecentActivity {
  id: string;
  framework: string;
  status: JobStatus;
  createdAt: string;
  fileName: string;
  entitiesCount: number;
}

export interface RecentActivityResponse {
  data: RecentActivity[];
  total: number;
  page: number;
  limit: number;
}

export interface Metrics {
  totalDocuments: number;
  entitiesDetected: number;
  anonymizationRate: number;
  syntheticRecords: number;
}

export interface ChartData {
  date: string;
  documents: number;
  entities: number;
}

export interface DistributionData {
  key: string;
  count: number;
}

export interface ParseDates {
  start: Date;
  end: Date;
}
