import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { SyntheticOutputFormat } from '@/modules/synthetic-data/constants/synthetic-fields';

const MIN_RECORDS = 1;
const MAX_RECORDS = 100000;

// Wire contract uses snake_case to match the frontend payload exactly.
export class GenerateSyntheticDataDto {
  @ApiProperty({
    description: 'Clinical text pasted by the user',
    example: 'Patient John Smith ...',
  })
  @IsString()
  @IsNotEmpty()
  raw_text: string;

  @ApiProperty({ description: 'Dataset label', example: 'Patient Records' })
  @IsString()
  @IsNotEmpty()
  dataset_type: string;

  @ApiProperty({ example: 1000, minimum: MIN_RECORDS, maximum: MAX_RECORDS })
  @Type(() => Number)
  @IsInt()
  @Min(MIN_RECORDS)
  @Max(MAX_RECORDS)
  num_records: number;

  @ApiProperty({ description: 'Compliance framework', example: 'HIPAA' })
  @IsString()
  @IsNotEmpty()
  compliance_framework: string;

  @ApiProperty({ enum: SyntheticOutputFormat, example: SyntheticOutputFormat.CSV })
  @IsEnum(SyntheticOutputFormat)
  output_format: SyntheticOutputFormat;
}
