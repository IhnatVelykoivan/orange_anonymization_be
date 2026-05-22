import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { GenerateSyntheticDataDto } from '@/modules/synthetic-data/dto/generate-synthetic-data.dto';
import { SyntheticDataService } from '@/modules/synthetic-data/synthetic-data.service';
import {
  GenerateAcceptedResponse,
  SyntheticDataSummary,
  SyntheticStatusResponse,
} from '@/modules/synthetic-data/interfaces/synthetic-data.interface';

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
  private readonly logger = new Logger(SyntheticDataController.name);

  constructor(private readonly syntheticDataService: SyntheticDataService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger asynchronous synthetic data generation' })
  @ApiResponse({ status: 202, description: 'Generation accepted; returns dataset_id and task_id' })
  @ApiResponse({ status: 400, description: 'Invalid payload or num_records out of bounds' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async generate(
    @Body() dto: GenerateSyntheticDataDto,
    @Req() req: RequestWithUser,
  ): Promise<GenerateAcceptedResponse> {
    return this.syntheticDataService.startGeneration(dto, req.user.sub);
  }

  @Get('generated-data/:datasetId')
  @ApiOperation({ summary: 'Fetch compliance metrics, validation and preview records' })
  @ApiResponse({ status: 200, description: 'Summary with 23-field preview rows' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Dataset not found or expired' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getGeneratedData(
    @Param('datasetId') datasetId: string,
    @Req() req: RequestWithUser,
  ): Promise<SyntheticDataSummary | SyntheticStatusResponse> {
    return this.syntheticDataService.getGeneratedData(datasetId, req.user.sub);
  }

  @Get('download/:datasetId')
  @ApiOperation({ summary: 'Stream the generated file (always all 23 fields)' })
  @ApiResponse({ status: 200, description: 'File stream (.csv, .json or .xlsx)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Dataset not found or expired' })
  @ApiResponse({ status: 409, description: 'Dataset is not ready for download' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async download(
    @Param('datasetId') datasetId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, contentType, fileName } = await this.syntheticDataService.getDownload(
      datasetId,
      req.user.sub,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    stream.on('error', (error) => {
      this.logger.error(`Failed to stream dataset ${datasetId}`, error.stack);
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      }
      res.end();
    });

    stream.pipe(res);
  }
}
