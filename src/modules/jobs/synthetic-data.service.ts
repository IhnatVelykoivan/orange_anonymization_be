import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PresidioService } from './presidio.service';
import { JobsService } from './jobs.service';
import { GenerateSyntheticRequest } from './types/generate-synthetic-request';
import { AnalysisResult, Framework, Strategy } from './interfaces/presidio.interface';
import { JobStatus } from './entities/job.entity';

interface SyntheticDataGenerationResponse {
  outputFormat: string;
  source: {
    kind: 'deidentified-job' | 'manual';
    jobId?: string;
  };
  records: number;
  generatedAt: string;
  data: string[];
}

@Injectable()
export class SyntheticDataService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly presidioService: PresidioService,
  ) {}

  async getSourcePreview(
    jobId: string,
    userId: string,
  ): Promise<{ jobId: string; sourceText: string }> {
    const result = await this.jobsService.getJobResults(jobId, userId);

    if (!result.mainContent.anonymizedText?.trim()) {
      throw new NotFoundException('De-identified source data is not available for the provided jobId');
    }

    return {
      jobId,
      sourceText: result.mainContent.anonymizedText,
    };
  }

  async generate(
    dto: GenerateSyntheticRequest,
    userId: string,
  ): Promise<SyntheticDataGenerationResponse> {
    const sourceText = await this.resolveSourceText(dto, userId);
    const analysisResults = await this.analyzeSource(dto.framework, sourceText);
    const syntheticStrategies = this.buildSyntheticStrategies(analysisResults);

    const data: string[] = [];

    for (let index = 0; index < dto.records; index += 1) {
      const syntheticRecord = await this.presidioService.anonymizeText(
        sourceText,
        analysisResults,
        syntheticStrategies,
      );
      data.push(syntheticRecord);
    }

    return {
      outputFormat: dto.outputFormat,
      source: dto.useDeidentifiedSource
        ? { kind: 'deidentified-job', jobId: dto.sourceJobId! }
        : { kind: 'manual' },
      records: dto.records,
      generatedAt: new Date().toISOString(),
      data,
    };
  }

  private async resolveSourceText(dto: GenerateSyntheticRequest, userId: string): Promise<string> {
    if (dto.useDeidentifiedSource) {
      if (!dto.sourceJobId) {
        throw new BadRequestException('sourceJobId is required when using de-identified data');
      }

      const job = await this.jobsService.findOne(dto.sourceJobId);

      if (job.userId !== userId) {
        throw new ForbiddenException('You do not have access to the requested source job');
      }

      if (job.status !== JobStatus.SUCCEEDED || !job.anonymizedText?.trim()) {
        throw new NotFoundException('De-identified source data is not available for the provided jobId');
      }

      return job.anonymizedText;
    }

    if (!dto.sourceText?.trim()) {
      throw new BadRequestException('Source text is required when de-identified source is disabled');
    }

    return dto.sourceText.trim();
  }

  private async analyzeSource(framework: string, sourceText: string): Promise<AnalysisResult[]> {
    const entityMap = this.getEntityMap(framework);
    const entities = [...new Set(Object.values(entityMap))];

    return this.presidioService.analyzeText(sourceText, 'en', entities, 0.5);
  }

  private buildSyntheticStrategies(results: AnalysisResult[]): Record<string, string> {
    return results.reduce<Record<string, string>>((strategies, result) => {
      strategies[result.entity_type] = Strategy.Synthetic;
      return strategies;
    }, {});
  }

  private getEntityMap(framework: string): Record<string, string> {
    const jobsService = this.jobsService as unknown as {
      hipaaToPresidioMap: Record<string, string>;
      gdprToPresidioMap: Record<string, string>;
    };

    return framework.toLowerCase() === Framework.Hipaa
      ? jobsService.hipaaToPresidioMap
      : jobsService.gdprToPresidioMap;
  }
}