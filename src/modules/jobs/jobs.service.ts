import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { AnalysisMetadata, Job, JobStatus } from '@/modules/jobs/entities/job.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { PresidioService } from '@/modules/jobs/presidio.service';
import { Result } from '@/modules/jobs/interfaces/result.interface';
import {
  AnalysisResult,
  Framework,
  HipaaMethod,
  Strategy,
} from '@/modules/jobs/interfaces/presidio.interface';
import {
  DashboardData,
  DistributionData,
  RecentActivity,
  RecentActivityResponse,
  StatusDistribution,
} from '@/modules/dashboard/interfaces/dashboard.data.interface';

import { DashboardFramework } from '@/modules/dashboard/dashboard.framework.type';

import {
  ChartDataRaw,
  EntityDistributionRaw,
  FrameworkDistributionRaw,
  RecentActivityRaw,
} from './types/dashboard.query.types';

@Injectable()
export class JobsService {
  private readonly hipaaToPresidioMap: Record<string, string> = {
    NAME: 'PERSON',
    DATE: 'DATE_TIME',
    SSN: 'US_SSN',
    PHONE: 'PHONE_NUMBER',
    FAX: 'PHONE_NUMBER',
    EMAIL: 'EMAIL_ADDRESS',
    ADDRESS: 'LOCATION',
    URL: 'URL',
    IP: 'IP_ADDRESS',
    LICENSE: 'US_DRIVER_LICENSE',
    VEHICLE: 'VEHICLE',
    BIOMETRIC: 'BIOMETRIC',
    PHOTO: 'PHOTO',
    DEVICE: 'IP_ADDRESS',
    BENEFICIARY: 'PERSON',
    CERTIFICATE: 'US_SSN',
    ACCOUNT: 'IBAN_CODE',
    MRN: 'MEDICAL_RECORD_NUMBER',
    HEALTH_PLAN: 'HEALTH_PLAN',
    ZIP: 'LOCATION',
  };

  private readonly gdprToPresidioMap: Record<string, string> = {
    PERSON: 'PERSON',
    ORGANIZATION: 'ORGANIZATION',
    LOCATION: 'LOCATION',
    DATE: 'DATE_TIME',
    IP: 'IP_ADDRESS',
    GEOPOINT: 'LOCATION',
    NATIONAL_ID: 'US_SSN',
    ID_NUMBER: 'US_SSN',
    PASSPORT: 'US_PASSPORT',
    CREDIT_CARD: 'CREDIT_CARD',
    BANK_ACCOUNT: 'IBAN_CODE',
    EMAIL: 'EMAIL_ADDRESS',
    PHONE: 'PHONE_NUMBER',
    MEDICAL_RECORD_NUMBER: 'MEDICAL_RECORD_NUMBER',
    DEVICE_ID: 'IP_ADDRESS',
  };

  private readonly frameworkMap: Record<string, string[]> = {
    gdpr: ['eu-gdpr'],
    'uk-gdpr': ['uk-gdpr'],
    'swiss-fadp': ['swiss-fadp'],
    hipaa: ['hipaa'],
  };

  private applyFilters(
    query: SelectQueryBuilder<Job>,
    userId: string,
    startDate: Date,
    endDate: Date,
    framework?: DashboardFramework,
    status?: JobStatus,
  ) {
    query
      .where('job.userId = :userId', { userId })
      .andWhere('job.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (status) {
      query.andWhere('job.status = :status', { status });
    }

    if (framework) {
      const frameworks = this.frameworkMap[framework];
      if (frameworks?.length) {
        query.andWhere('job.framework IN (:...frameworks)', {
          frameworks,
        });
      }
    }

    return query;
  }

  private createFilteredJobsQuery(
    userId: string,
    startDate: Date,
    endDate: Date,
    framework?: DashboardFramework,
    status?: JobStatus,
  ) {
    const query = this.jobRepository.createQueryBuilder('job');

    return this.applyFilters(query, userId, startDate, endDate, framework, status);
  }

  private buildAnalysesTableQuery(
    userId: string,
    startDate: Date,
    endDate: Date,
    framework?: DashboardFramework,
    status?: JobStatus,
  ) {
    const query = this.jobRepository.createQueryBuilder('job');

    this.applyFilters(query, userId, startDate, endDate, framework, status);

    return query
      .select(['job.id', 'job.framework', 'job.status', 'job.createdAt'])
      .addSelect(
        `JSON_UNQUOTE(
        JSON_EXTRACT(
          job.wizardState,
          '$.inputData.fileName'
        )
      )`,
        'fileName',
      )
      .addSelect(
        `COALESCE(
        JSON_LENGTH(
          JSON_EXTRACT(
            job.wizardState,
            '$.analysisMetadata'
          )
        ),
        0
      )`,
        'entitiesCount',
      );
  }

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private presidioService: PresidioService,
  ) {}

  @OnEvent('job.run')
  async handleJobRunEvent(payload: {
    jobId: string;
    userId: string;
    originalText: string;
  }): Promise<void> {
    await this.processJob(payload.jobId, payload.userId, payload.originalText);
  }

  async createDraft(userId: string): Promise<Job> {
    const jobData: DeepPartial<Job> = {
      userId,
      status: JobStatus.DRAFT,
      wizardState: {
        currentStep: 1,
        frameworkSelection: '',
        inputData: {},
        configSettings: {},
      },
    };
    const job = this.jobRepository.create(jobData);
    return this.jobRepository.save(job);
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job with ID ${id} not found`);
    return job;
  }

  async getLatestDraft(userId: string): Promise<Job | null> {
    return this.jobRepository.findOne({
      where: [
        { userId, status: JobStatus.DRAFT },
        { userId, status: JobStatus.CONFIGURED },
      ],
      order: { updatedAt: 'DESC' },
    });
  }

  async update(id: string, updateJobData: Partial<Job>, userId: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id, userId } });
    if (!job) throw new NotFoundException(`Job not found or access denied`);

    Object.assign(job, updateJobData);
    return this.jobRepository.save(job);
  }

  async processJob(jobId: string, userId: string, originalText: string): Promise<void> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId, userId },
    });
    if (!job) return;

    const timeout = setTimeout(
      async () => {
        const currentJob = await this.jobRepository.findOne({ where: { id: jobId } });
        if (currentJob?.status === JobStatus.PROCESSING) {
          currentJob.status = JobStatus.FAILED;
          currentJob.errorMessage = 'Processing is taking longer than expected';
          await this.jobRepository.save(currentJob);
        }
      },
      5 * 60 * 1000,
    );

    try {
      job.status = JobStatus.PROCESSING;
      await this.jobRepository.save(job);
      const startTime = Date.now();
      const { frameworkSelection, configSettings } = job.wizardState;
      const language = configSettings.language || 'en';
      const threshold = Number(configSettings.threshold) || 0.5;

      const entityMap =
        frameworkSelection === Framework.Hipaa ? this.hipaaToPresidioMap : this.gdprToPresidioMap;

      const entityKeys =
        frameworkSelection === Framework.Hipaa && configSettings.method === HipaaMethod.SafeHarbor
          ? [
              'NAME',
              'DATE',
              'SSN',
              'PHONE',
              'FAX',
              'EMAIL',
              'ADDRESS',
              'ACCOUNT',
              'LICENSE',
              'VEHICLE',
              'URL',
              'IP',
              'BIOMETRIC',
              'PHOTO',
              'DEVICE',
              'MRN',
              'BENEFICIARY',
              'CERTIFICATE',
            ]
          : configSettings.entities || [];

      const presidioEntities = [
        ...new Set(entityKeys.map((entity) => entityMap[entity] || entity)),
      ];

      const analysisResults: AnalysisResult[] = await this.presidioService.analyzeText(
        originalText,
        language,
        presidioEntities,
        threshold,
      );

      const analysisMetadata: AnalysisMetadata[] = analysisResults.map((res, index) => ({
        id: `ent-${index}-${Date.now()}`,
        ...res,
        isExcluded: false,
      }));

      job.wizardState.analysisMetadata = analysisMetadata;

      const userStrategies = (configSettings.strategies as Record<string, string>) || {};
      const presidioStrategies: Record<string, string> = {};

      entityKeys.forEach((entityKey) => {
        const presidioKey = entityMap[entityKey] || entityKey;
        const strategy = userStrategies[entityKey] || Strategy.Replace;
        presidioStrategies[presidioKey] = strategy;
      });

      const anonymizedText: string = await this.presidioService.anonymizeText(
        originalText,
        analysisResults,
        presidioStrategies,
      );

      job.anonymizedText = anonymizedText;
      job.processingTime = (Date.now() - startTime) / 1000;
      job.status = JobStatus.SUCCEEDED;
      job.errorMessage = null;

      await this.jobRepository.save(job);
      clearTimeout(timeout);
    } catch (error) {
      clearTimeout(timeout);
      job.status = JobStatus.FAILED;
      job.errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      await this.jobRepository.save(job);
    }
  }

  async getStats(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    framework?: DashboardFramework,
  ): Promise<DashboardData> {
    const finalStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const finalEndDate = endDate || new Date();

    const buildDashboardQuery = (status?: JobStatus) =>
      this.createFilteredJobsQuery(userId, finalStartDate, finalEndDate, framework, status);

    const metricsQuery = buildDashboardQuery(JobStatus.SUCCEEDED);
    const recentActivityQuery = buildDashboardQuery();
    const chartQuery = buildDashboardQuery(JobStatus.SUCCEEDED);

    const [
      metricsResult,
      recentActivityRaw,
      chartDataRaw,
      strategiesDistribution,
      frameworksDistribution,
      entitiesDistribution,
      statusesDistribution,
    ] = await Promise.all([
      metricsQuery
        .select('COUNT(job.id)', 'totalDocuments')
        .addSelect(
          `SUM(
          COALESCE(
            JSON_LENGTH(
              JSON_EXTRACT(job.wizardState, '$.analysisMetadata')
            ),
            0
          )
        )`,
          'totalEntities',
        )
        .addSelect(
          `SUM(
          COALESCE(
            (
              SELECT COUNT(*)
              FROM JSON_TABLE(
                job.wizardState,
                '$.analysisMetadata[*]'
                COLUMNS (
                  isExcluded BOOL PATH '$.isExcluded'
                )
              ) jt
              WHERE jt.isExcluded IS NOT TRUE
            ),
            0
          )
        )`,
          'anonymizedEntities',
        )
        .getRawOne(),

      recentActivityQuery
        .select(['job.id', 'job.framework', 'job.status', 'job.createdAt'])
        .addSelect(
          `JSON_UNQUOTE(
          JSON_EXTRACT(
            job.wizardState,
            '$.inputData.fileName'
          )
        )`,
          'fileName',
        )
        .addSelect(
          `COALESCE(
          JSON_LENGTH(
            JSON_EXTRACT(
              job.wizardState,
              '$.analysisMetadata'
            )
          ),
          0
        )`,
          'entitiesCount',
        )
        .orderBy('job.createdAt', 'DESC')
        .take(5)
        .getRawMany(),

      chartQuery
        .select("DATE_FORMAT(job.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(job.id)', 'documentsCount')
        .addSelect(
          `SUM(
          COALESCE(
            JSON_LENGTH(
              JSON_EXTRACT(
                job.wizardState,
                '$.analysisMetadata'
              )
            ),
            0
          )
        )`,
          'entitiesCount',
        )
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany(),

      this.getStrategiesDistribution(
        userId,
        finalStartDate,
        finalEndDate,
        framework,
        JobStatus.SUCCEEDED,
      ),
      this.getFrameworksDistribution(
        userId,
        finalStartDate,
        finalEndDate,
        framework,
        JobStatus.SUCCEEDED,
      ),
      this.getEntitiesDistribution(userId, finalStartDate, finalEndDate, framework),
      this.getStatusesDistribution(userId, finalStartDate, finalEndDate, framework),
    ]);

    const totalDocuments = parseInt(metricsResult?.totalDocuments, 10) || 0;
    const totalEntities = parseInt(metricsResult?.totalEntities, 10) || 0;
    const anonymizedEntities = parseInt(metricsResult?.anonymizedEntities, 10) || 0;

    const anonymizationRate =
      totalEntities > 0 ? Math.round((anonymizedEntities / totalEntities) * 100) : 0;

    const recentActivity = (recentActivityRaw as RecentActivityRaw[]).map((job) => ({
      id: job.job_id,
      framework: job.job_framework || 'Custom',
      status: job.job_status,
      createdAt: new Date(job.job_createdAt).toISOString(),
      fileName: job.fileName || 'Untitled Document',
      entitiesCount: parseInt(job.entitiesCount, 10) || 0,
    }));

    const chartData = (chartDataRaw as ChartDataRaw[]).map((item) => ({
      date: item.date,
      documents: parseInt(item.documentsCount, 10) || 0,
      entities: parseInt(item.entitiesCount, 10) || 0,
    }));

    const emptyState = totalDocuments === 0;

    return {
      metrics: {
        totalDocuments,
        entitiesDetected: totalEntities,
        anonymizationRate,
        syntheticRecords: 0,
      },
      chartData,
      recentActivity,
      strategiesDistribution,
      frameworksDistribution,
      entitiesDistribution,
      statusesDistribution,
      emptyState,
      message: emptyState ? 'No dashboard data available' : undefined,
      startDate: finalStartDate.toISOString(),
      endDate: finalEndDate.toISOString(),
    };
  }

  async getJobResults(id: string, userId: string): Promise<Result> {
    const job = await this.jobRepository.findOne({ where: { id, userId } });

    if (!job) throw new NotFoundException('Results not found');
    if (job.status !== JobStatus.SUCCEEDED) {
      throw new BadRequestException('Processing not yet complete');
    }

    const metadata = job.wizardState.analysisMetadata || [];

    return {
      mainContent: {
        anonymizedText: job.anonymizedText,
      },
      stats: {
        detected: metadata.length,
        processed: metadata.filter((e) => !e.isExcluded).length,
        avgConfidence:
          metadata.length > 0
            ? metadata.reduce((acc, curr) => acc + curr.score, 0) / metadata.length
            : 0,
      },
      entityTable: metadata,
      auditTrail: {
        jobId: job.id,
        framework: job.framework,
        timestamps: {
          started: job.createdAt,
          finished: job.updatedAt,
        },
        processingTime: job.processingTime,
      },
    };
  }

  async validateInput(text: string): Promise<void> {
    const trimmed = text.trim();
    if (trimmed.length < 50) {
      throw new BadRequestException('Text must be at least 50 characters');
    }
  }

  async toggleEntity(
    jobId: string,
    entityId: string,
    userId: string,
    originalText: string,
  ): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id: jobId, userId } });

    if (!job) {
      throw new NotFoundException('Job not found or access denied');
    }

    if (!originalText) {
      throw new BadRequestException('Original text is missing. Cannot re-process anonymization.');
    }

    const metadata = job.wizardState.analysisMetadata || [];
    const entityIndex = metadata.findIndex((e) => e.id === entityId);

    if (entityIndex === -1) {
      throw new NotFoundException(`Entity with ID ${entityId} not found in this job`);
    }

    metadata[entityIndex].isExcluded = !metadata[entityIndex].isExcluded;

    const activeEntities = metadata.filter((e) => !e.isExcluded);

    const userStrategies =
      (job.wizardState.configSettings.strategies as Record<string, string>) || {};
    const presidioStrategies: Record<string, string> = {};

    const entityMap =
      job.wizardState.frameworkSelection === Framework.Hipaa
        ? this.hipaaToPresidioMap
        : this.gdprToPresidioMap;

    Object.entries(userStrategies).forEach(([entityKey, strategy]) => {
      const presidioKey = entityMap[entityKey] || entityKey;
      presidioStrategies[presidioKey] = strategy;
    });

    try {
      const newAnonymizedText = await this.presidioService.anonymizeText(
        originalText,
        activeEntities,
        presidioStrategies,
      );

      job.anonymizedText = newAnonymizedText;
      job.wizardState.analysisMetadata = metadata;
      job.updatedAt = new Date();

      return await this.jobRepository.save(job);
    } catch (error) {
      throw new BadRequestException(
        `Failed to re-anonymize text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getRecentActivity(
    userId: string,
    page: number = 1,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
    framework?: DashboardFramework,
    search?: string,
    status?: JobStatus,
  ): Promise<RecentActivityResponse> {
    const skip = (page - 1) * limit;
    const finalStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const finalEndDate = endDate || new Date();

    const queryBuilder = this.buildAnalysesTableQuery(
      userId,
      finalStartDate,
      finalEndDate,
      framework,
      status,
    ).orderBy('job.createdAt', 'DESC');

    if (search?.trim()) {
      queryBuilder.andWhere(
        `LOWER(
      COALESCE(
        JSON_UNQUOTE(
          JSON_EXTRACT(
            job.wizardState,
            '$.inputData.fileName'
          )
        ),
        'Untitled Document'
      )
    ) LIKE LOWER(:search)`,
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    const total = await queryBuilder.clone().getCount();
    const rawData = await queryBuilder.offset(skip).limit(limit).getRawMany();

    const data = (rawData as RecentActivityRaw[]).map((job) => ({
      id: job.job_id,
      framework: job.job_framework || 'Custom',
      status: job.job_status,
      createdAt: new Date(job.job_createdAt).toISOString(),
      fileName: job.fileName || 'Untitled Document',
      entitiesCount: parseInt(job.entitiesCount, 10) || 0,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getStrategiesDistribution(
    userId: string,
    startDate: Date,
    endDate: Date,
    framework?: DashboardFramework,
    status?: JobStatus,
  ): Promise<DistributionData[]> {
    const jobs = await this.createFilteredJobsQuery(userId, startDate, endDate, framework, status)
      .select(['job.wizardState'])
      .getMany();

    const stats: Record<string, number> = {};

    jobs.forEach((job) => {
      const strategies =
        (job.wizardState?.configSettings?.strategies as Record<string, string>) || {};

      Object.values(strategies).forEach((strategy) => {
        stats[strategy] = (stats[strategy] || 0) + 1;
      });
    });

    return Object.entries(stats).map(([key, count]) => ({
      key,
      count,
    }));
  }

  async getFrameworksDistribution(
    userId: string,
    startDate: Date,
    endDate: Date,
    framework?: DashboardFramework,
    status?: JobStatus,
  ): Promise<DistributionData[]> {
    const result = await this.createFilteredJobsQuery(userId, startDate, endDate, framework, status)
      .select('job.framework', 'key')
      .addSelect('COUNT(job.id)', 'count')
      .groupBy('job.framework')
      .getRawMany();

    return (result as FrameworkDistributionRaw[]).map((r) => ({
      key: r.key || 'Custom',
      count: parseInt(r.count, 10),
    }));
  }

  async getEntitiesDistribution(
    userId: string,
    startDate: Date,
    endDate: Date,
    framework?: DashboardFramework,
  ): Promise<DistributionData[]> {
    const frameworks = framework ? this.frameworkMap[framework] : undefined;

    const frameworkCondition = frameworks?.length
      ? `AND job.framework IN (${frameworks.map(() => '?').join(', ')})`
      : '';

    const params = [userId, JobStatus.SUCCEEDED, startDate, endDate, ...(frameworks ?? [])];

    const result = (await this.jobRepository.query(
      `
    SELECT
      jt.entity_type AS \`key\`,
      COUNT(*) AS count
    FROM jobs job,
    JSON_TABLE(
      job.wizardState,
      '$.analysisMetadata[*]'
      COLUMNS (
        entity_type VARCHAR(255)
        PATH '$.entity_type'
      )
    ) AS jt
    WHERE job.userId = ?
      AND job.status = ?
      AND job.createdAt BETWEEN ? AND ?
      ${frameworkCondition}
    GROUP BY jt.entity_type
    `,
      params,
    )) as EntityDistributionRaw[];

    return result.map((r) => ({
      key: r.key,
      count: parseInt(r.count, 10),
    }));
  }

  async getStatusesDistribution(
    userId: string,
    startDate: Date,
    endDate: Date,
    framework?: DashboardFramework,
  ): Promise<StatusDistribution[]> {
    const raw = await this.createFilteredJobsQuery(userId, startDate, endDate, framework)
      .select('job.status', 'key')
      .addSelect('COUNT(job.id)', 'count')
      .groupBy('job.status')
      .getRawMany();

    const map = raw.reduce<Record<JobStatus, number>>(
      (acc, curr) => {
        acc[curr.key as JobStatus] = parseInt(curr.count, 10);
        return acc;
      },
      {} as Record<JobStatus, number>,
    );

    const allStatuses: JobStatus[] = [
      JobStatus.DRAFT,
      JobStatus.CONFIGURED,
      JobStatus.QUEUED,
      JobStatus.PROCESSING,
      JobStatus.SUCCEEDED,
      JobStatus.FAILED,
    ];

    return allStatuses.map(
      (status): StatusDistribution => ({
        key: status,
        count: map[status] || 0,
      }),
    );
  }

  async getAnalysesExport(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    framework?: DashboardFramework,
    search?: string,
    status?: JobStatus,
  ): Promise<RecentActivity[]> {
    const finalStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));

    const finalEndDate = endDate || new Date();

    const queryBuilder = this.buildAnalysesTableQuery(
      userId,
      finalStartDate,
      finalEndDate,
      framework,
      status,
    ).orderBy('job.createdAt', 'DESC');

    if (search?.trim()) {
      queryBuilder.andWhere(
        `LOWER(
        COALESCE(
          JSON_UNQUOTE(
            JSON_EXTRACT(
              job.wizardState,
              '$.inputData.fileName'
            )
          ),
          'Untitled Document'
        )
      ) LIKE LOWER(:search)`,
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    const rawData = await queryBuilder.getRawMany();

    return (rawData as RecentActivityRaw[]).map((job) => ({
      id: job.job_id,
      framework: job.job_framework || 'Custom',
      status: job.job_status,
      createdAt: new Date(job.job_createdAt).toISOString(),
      fileName: job.fileName || 'Untitled Document',
      entitiesCount: parseInt(job.entitiesCount, 10) || 0,
    }));
  }
}
