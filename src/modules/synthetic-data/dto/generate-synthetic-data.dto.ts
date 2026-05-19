import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Max, Min } from 'class-validator';

const MIN_FIELDS = 1;
const MAX_FIELDS = 20;
const MIN_COUNT = 1;
const MAX_COUNT = 1000;

export class GenerateSyntheticDataDto {
  @ApiProperty({
    description: 'HIPAA field types to generate per row',
    example: ['NAME', 'EMAIL', 'PHONE'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(MIN_FIELDS)
  @ArrayMaxSize(MAX_FIELDS)
  @IsString({ each: true })
  fields: string[];

  @ApiProperty({
    description: 'Number of rows to generate',
    example: 10,
    minimum: MIN_COUNT,
    maximum: MAX_COUNT,
  })
  @IsInt()
  @Min(MIN_COUNT)
  @Max(MAX_COUNT)
  count: number;
}
