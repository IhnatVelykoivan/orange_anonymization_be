import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { GenerateSyntheticDataDto } from '@/modules/synthetic-data/dto/generate-synthetic-data.dto';
import { FakeDataService } from '@/modules/synthetic-data/fake-data.service';
import {
  SupportedFieldsResponse,
  SyntheticDataResponse,
} from '@/modules/synthetic-data/interfaces/synthetic-data.interface';
import { SyntheticDataService } from '@/modules/synthetic-data/synthetic-data.service';

@Controller('synthetic-data')
@ApiTags('Synthetic Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SyntheticDataController {
  constructor(
    private readonly syntheticDataService: SyntheticDataService,
    private readonly fakeDataService: FakeDataService,
  ) {}

  @Get('supported-fields')
  @ApiOperation({ summary: 'List supported field types for generation' })
  @ApiResponse({ status: 200, description: 'List of supported HIPAA field types' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getSupportedFields(): SupportedFieldsResponse {
    return { fields: this.fakeDataService.getSupportedFieldTypes() };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate synthetic data rows' })
  @ApiResponse({ status: 201, description: 'Generated synthetic dataset' })
  @ApiResponse({ status: 400, description: 'Unsupported field type or invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  generate(@Body() dto: GenerateSyntheticDataDto): SyntheticDataResponse {
    const rows = this.syntheticDataService.generate(dto.fields, dto.count);
    return { fields: dto.fields, count: dto.count, rows };
  }
}
