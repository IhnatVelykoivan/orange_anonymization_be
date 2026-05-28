import { ApiProperty } from '@nestjs/swagger';

export class MetricsDto {
  @ApiProperty()
  totalDocuments: number;

  @ApiProperty()
  entitiesDetected: number;

  @ApiProperty()
  anonymizationRate: number;

  @ApiProperty()
  syntheticRecords: number;
}
