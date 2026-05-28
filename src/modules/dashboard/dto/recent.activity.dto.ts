import { ApiProperty } from '@nestjs/swagger';
import { JobStatus } from '@/modules/jobs/entities/job.entity';

export class RecentActivityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  framework: string;

  @ApiProperty({ enum: JobStatus })
  status: JobStatus;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  entitiesCount: number;
}
