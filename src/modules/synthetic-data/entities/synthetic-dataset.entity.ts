import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { SyntheticDataSummary } from '@/modules/synthetic-data/interfaces/synthetic-data.interface';

export enum SyntheticDatasetStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('synthetic_datasets')
export class SyntheticDataset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_synthetic_datasets_userId')
  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: SyntheticDatasetStatus,
    default: SyntheticDatasetStatus.PROCESSING,
  })
  status: SyntheticDatasetStatus;

  @Column()
  datasetType: string;

  @Column()
  framework: string;

  @Column()
  outputFormat: string;

  @Column({ type: 'int' })
  recordsCount: number;

  // Computed response payload (compliance, quality, preview, etc.). Small.
  @Column({ type: 'json', nullable: true })
  summary: SyntheticDataSummary | null;

  // Absolute path to the generated export file on disk (streamed on download).
  @Column({ type: 'varchar', length: 512, nullable: true })
  filePath: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Index('idx_synthetic_datasets_expiresAt')
  @Column({ type: 'datetime' })
  expiresAt: Date;
}
