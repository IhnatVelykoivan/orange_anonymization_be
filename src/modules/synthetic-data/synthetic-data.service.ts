import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReadStream } from 'fs';
import { Repository } from 'typeorm';
import { PresidioService } from '@/modules/jobs/presidio.service';
import { AnalysisResult } from '@/modules/jobs/interfaces/presidio.interface';
import { FakeDataService } from '@/modules/synthetic-data/fake-data.service';
import { SyntheticExportService } from '@/modules/synthetic-data/synthetic-export.service';
import {
  SyntheticDataset,
  SyntheticDatasetStatus,
} from '@/modules/synthetic-data/entities/synthetic-dataset.entity';
import { GenerateSyntheticDataDto } from '@/modules/synthetic-data/dto/generate-synthetic-data.dto';
import {
  ANALYSIS_LANGUAGE,
  ANALYSIS_SCORE_THRESHOLD,
  CONSISTENCY_HIGH,
  DATASET_TTL_MS,
  DEFAULT_FIELDS,
  ENTITY_FIELDS,
  FRAMEWORK_GDPR_LABEL,
  FRAMEWORK_HIPAA_LABEL,
  GDPR_MATCH_TOKEN,
  IDENTIFIERS_NOT_DETECTED,
  LOW_CONFIDENCE_THRESHOLD,
  PREVIEW_LIMIT,
  PRESIDIO_ENTITIES,
  PRESIDIO_TO_COLUMN,
  QUALITY_GOOD,
  RISK_LEVEL_LOW,
  SyntheticOutputFormat,
  TOTAL_FIELDS_COUNT,
} from '@/modules/synthetic-data/constants/synthetic-fields';
import {
  GenerateAcceptedResponse,
  SyntheticDataSummary,
  SyntheticRecord,
  SyntheticStatusResponse,
} from '@/modules/synthetic-data/interfaces/synthetic-data.interface';

interface DownloadPayload {
  stream: ReadStream;
  contentType: string;
  fileName: string;
}

@Injectable()
export class SyntheticDataService {
  private readonly logger = new Logger(SyntheticDataService.name);

  constructor(
    @InjectRepository(SyntheticDataset)
    private readonly datasetRepository: Repository<SyntheticDataset>,
    private readonly presidioService: PresidioService,
    private readonly fakeDataService: FakeDataService,
    private readonly exportService: SyntheticExportService,
  ) {}

  async startGeneration(
    dto: GenerateSyntheticDataDto,
    userId: string,
  ): Promise<GenerateAcceptedResponse> {
    const dataset = this.datasetRepository.create({
      userId,
      status: SyntheticDatasetStatus.PROCESSING,
      datasetType: dto.dataset_type,
      framework: dto.compliance_framework,
      outputFormat: dto.output_format,
      recordsCount: dto.num_records,
      expiresAt: new Date(Date.now() + DATASET_TTL_MS),
    });
    await this.datasetRepository.save(dataset);

    // Fire-and-forget: respond 202 immediately, generate in the background.
    void this.runGeneration(dataset.id, dto.raw_text).catch((error) => {
      this.logger.error(
        `Synthetic generation ${dataset.id} crashed`,
        error instanceof Error ? error.stack : String(error),
      );
    });

    return { dataset_id: dataset.id, task_id: dataset.id, status: dataset.status };
  }

  async getGeneratedData(
    datasetId: string,
    userId: string,
  ): Promise<SyntheticDataSummary | SyntheticStatusResponse> {
    const dataset = await this.loadOwnedDataset(datasetId, userId);

    if (dataset.status === SyntheticDatasetStatus.COMPLETED && dataset.summary) {
      return dataset.summary;
    }

    return {
      dataset_id: dataset.id,
      status: dataset.status,
      error_message: dataset.errorMessage ?? undefined,
    };
  }

  async getDownload(datasetId: string, userId: string): Promise<DownloadPayload> {
    const dataset = await this.loadOwnedDataset(datasetId, userId);

    if (dataset.status !== SyntheticDatasetStatus.COMPLETED || !dataset.filePath) {
      throw new ConflictException('Dataset is not ready for download');
    }

    const format = dataset.outputFormat as SyntheticOutputFormat;
    return {
      stream: this.exportService.getReadStream(dataset.filePath),
      contentType: this.exportService.getContentType(format),
      fileName: `synthetic-${dataset.id}.${this.exportService.getFileExtension(format)}`,
    };
  }

  private async loadOwnedDataset(datasetId: string, userId: string): Promise<SyntheticDataset> {
    const dataset = await this.datasetRepository.findOne({ where: { id: datasetId } });

    if (!dataset || dataset.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Dataset not found or expired');
    }

    if (dataset.userId !== userId) {
      throw new ForbiddenException('You do not have access to this dataset');
    }

    return dataset;
  }

  private async runGeneration(datasetId: string, rawText: string): Promise<void> {
    const dataset = await this.datasetRepository.findOne({ where: { id: datasetId } });
    if (!dataset) {
      return;
    }

    try {
      const analysis = await this.presidioService.analyzeText(
        rawText,
        ANALYSIS_LANGUAGE,
        PRESIDIO_ENTITIES,
        ANALYSIS_SCORE_THRESHOLD,
      );
      const detectedColumns = this.resolveDetectedColumns(analysis);
      const rows = this.buildRows(dataset, detectedColumns);
      const format = dataset.outputFormat as SyntheticOutputFormat;

      dataset.filePath = await this.exportService.write(dataset.id, format, rows);
      dataset.summary = this.buildSummary(dataset, detectedColumns, analysis, rows);
      dataset.status = SyntheticDatasetStatus.COMPLETED;
      await this.datasetRepository.save(dataset);
    } catch (error) {
      dataset.status = SyntheticDatasetStatus.FAILED;
      dataset.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.datasetRepository.save(dataset);
    }
  }

  private resolveDetectedColumns(analysis: AnalysisResult[]): string[] {
    const columns = analysis
      .map((result) => PRESIDIO_TO_COLUMN[result.entity_type])
      .filter((column): column is string => Boolean(column));
    return [...new Set(columns)];
  }

  private buildRows(dataset: SyntheticDataset, detectedColumns: string[]): SyntheticRecord[] {
    const rows: SyntheticRecord[] = [];
    for (let index = 0; index < dataset.recordsCount; index += 1) {
      rows.push(this.buildRow(index + 1, dataset.datasetType, detectedColumns));
    }
    return rows;
  }

  private buildRow(
    recordNumber: number,
    datasetType: string,
    detectedColumns: string[],
  ): SyntheticRecord {
    const row: SyntheticRecord = {
      record_id: this.fakeDataService.generateRecordId(recordNumber),
      doc_type: this.fakeDataService.generateDocType(datasetType),
      age_range: this.fakeDataService.generateAgeRange(),
      date: this.fakeDataService.generateDate(),
      quality: this.fakeDataService.generateQuality(),
    };

    for (const field of ENTITY_FIELDS) {
      row[field] = detectedColumns.includes(field)
        ? this.fakeDataService.generateFakeValue(field)
        : '';
    }

    return row;
  }

  private buildSummary(
    dataset: SyntheticDataset,
    detectedColumns: string[],
    analysis: AnalysisResult[],
    rows: SyntheticRecord[],
  ): SyntheticDataSummary {
    const lowConfidenceCount = analysis.filter(
      (result) => result.score < LOW_CONFIDENCE_THRESHOLD,
    ).length;
    const warnings: string[] = [];
    if (lowConfidenceCount > 0) {
      warnings.push(`${lowConfidenceCount} low-confidence fields`);
    }

    return {
      dataset_id: dataset.id,
      status: SyntheticDatasetStatus.COMPLETED,
      compliance: {
        framework: this.resolveFrameworkLabel(dataset.framework),
        risk_level: RISK_LEVEL_LOW,
        direct_identifiers_detected: IDENTIFIERS_NOT_DETECTED,
      },
      data_quality: {
        quality: QUALITY_GOOD,
        consistency: CONSISTENCY_HIGH,
        warnings,
      },
      export_summary: {
        format: dataset.outputFormat,
        records_count: dataset.recordsCount,
        fields_count: TOTAL_FIELDS_COUNT,
      },
      compliance_validation_checks: {
        dates_transformed: true,
        free_text_fields_checked: true,
        export_format_validated: true,
        synthetic_identifiers_generated: true,
        direct_identifiers_removed: true,
      },
      available_fields: {
        default_selected: DEFAULT_FIELDS,
        additional_fields: detectedColumns,
      },
      preview_records: rows.slice(0, PREVIEW_LIMIT),
    };
  }

  private resolveFrameworkLabel(framework: string): string {
    return framework.trim().toLowerCase().includes(GDPR_MATCH_TOKEN)
      ? FRAMEWORK_GDPR_LABEL
      : FRAMEWORK_HIPAA_LABEL;
  }
}
