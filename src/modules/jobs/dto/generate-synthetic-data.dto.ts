import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateSyntheticDataDto {
  @ApiProperty({ example: 1000, minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  records: number;

  @ApiProperty({ example: 'hipaa' })
  @IsString()
  framework: string;

  @ApiProperty({ example: 'json' })
  @IsString()
  outputFormat: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Use the anonymized output from an existing job as the source text',
  })
  @IsOptional()
  @IsBoolean()
  useDeidentifiedSource?: boolean;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Existing job ID used to resolve de-identified source text',
  })
  @IsOptional()
  @IsString()
  sourceJobId?: string;

  @ApiPropertyOptional({
    example: 'Patient John Smith was admitted on 2026-05-15.',
    description: 'Manual source text when de-identified source is not enabled',
  })
  @IsOptional()
  @IsString()
  sourceText?: string;
}