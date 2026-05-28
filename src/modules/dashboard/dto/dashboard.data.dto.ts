import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { MetricsDto } from './metrics.dto';
import { ChartDataDto } from './chart.data.dto';
import { RecentActivityDto } from './recent.activity.dto';
import { DistributionDataDto } from './distribution.data.dto';
import { StatusDistributionDto } from './status.distribution.dto';

export class DashboardDataDto {
  @ApiProperty({ type: MetricsDto })
  @Type(() => MetricsDto)
  metrics: MetricsDto;

  @ApiProperty({ type: [ChartDataDto] })
  @Type(() => ChartDataDto)
  chartData: ChartDataDto[];

  @ApiProperty({ type: [RecentActivityDto] })
  @Type(() => RecentActivityDto)
  recentActivity: RecentActivityDto[];

  @ApiProperty({ type: [DistributionDataDto] })
  @Type(() => DistributionDataDto)
  strategiesDistribution: DistributionDataDto[];

  @ApiProperty({ type: [DistributionDataDto] })
  @Type(() => DistributionDataDto)
  frameworksDistribution: DistributionDataDto[];

  @ApiProperty({ type: [DistributionDataDto] })
  @Type(() => DistributionDataDto)
  entitiesDistribution: DistributionDataDto[];

  @ApiProperty({ type: [StatusDistributionDto] })
  @Type(() => StatusDistributionDto)
  statusesDistribution: StatusDistributionDto[];

  @ApiProperty({ required: false, nullable: true })
  message?: string;

  @ApiProperty({ required: false })
  emptyState?: boolean;

  @ApiProperty({ required: false })
  startDate?: string;

  @ApiProperty({ required: false })
  endDate?: string;
}
