import { IsDateString, IsEnum, IsOptional } from 'class-validator';

import { DashboardFramework } from '@/modules/dashboard/dashboard.framework.type';

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['gdpr', 'uk-gdpr', 'swiss-fadp', 'hipaa'])
  framework?: DashboardFramework;
}
