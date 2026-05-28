import { ApiProperty } from '@nestjs/swagger';

export class DistributionDataDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  count: number;
}
