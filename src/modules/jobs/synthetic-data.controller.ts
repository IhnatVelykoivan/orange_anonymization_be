import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { SyntheticDataService } from './synthetic-data.service';
import { GenerateSyntheticDataDto } from './dto/generate-synthetic-data.dto';
import { GenerateSyntheticRequest } from '@/modules/jobs/types/generate-synthetic-request';

interface RequestWithUser extends Request {
  user: {
    sub: string;
  };
}

@Controller('synthetic-data')
@ApiTags('Synthetic Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SyntheticDataController {
  constructor(private readonly syntheticDataService: SyntheticDataService) {}

  @Get('source/:jobId')
  @ApiOperation({ summary: 'Get de-identified source text for the current session' })
  @ApiResponse({ status: 200, description: 'Returns the anonymized text for the given job' })
  async getSourcePreview(
    @Param('jobId') jobId: string,
    @Req() req: RequestWithUser,
  ): Promise<{ jobId: string; sourceText: string }> {
    return this.syntheticDataService.getSourcePreview(jobId, req.user.sub);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate synthetic data from manual or de-identified source text' })
  @ApiResponse({ status: 200, description: 'Synthetic data payload generated successfully' })
  async generate(
    @Body() dto: GenerateSyntheticDataDto,
    @Req() req: RequestWithUser,
  ): Promise<unknown> {
    const payload: GenerateSyntheticRequest = {
      records: dto.records,
      framework: dto.framework,
      outputFormat: dto.outputFormat,
      useDeidentifiedSource: !!dto.useDeidentifiedSource,
      sourceJobId: dto.sourceJobId ?? null,
      sourceText: dto.sourceText?.trim() ?? null,
    };

    return this.syntheticDataService.generate(payload, req.user.sub);
  }
}