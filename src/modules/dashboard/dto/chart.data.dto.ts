import { ApiProperty } from '@nestjs/swagger';

export class ChartDataDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  documents: number;

  @ApiProperty()
  entities: number;
}
