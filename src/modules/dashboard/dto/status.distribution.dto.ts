import { ApiProperty } from '@nestjs/swagger';
import { JobStatus } from '@/modules/jobs/entities/job.entity';

export class StatusDistributionDto {
  @ApiProperty({
    enum: JobStatus,
    enumName: 'JobStatus',
  })
  key: JobStatus;

  @ApiProperty({
    example: 0,
    description: 'Number of jobs in this status',
  })
  count: number;
}
