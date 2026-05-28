import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { RecentActivityDto } from './recent.activity.dto';

export class RecentActivityResponseDto {
  @ApiProperty({
    type: [RecentActivityDto],
  })
  @Type(() => RecentActivityDto)
  data: RecentActivityDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
