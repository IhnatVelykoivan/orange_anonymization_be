/* eslint-disable no-restricted-syntax -- TypeORM CLI runs outside NestJS; ConfigService is unavailable here */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '@/modules/users/user.entity';
import { Job } from '@/modules/jobs/entities/job.entity';
import { SyntheticDataset } from '@/modules/synthetic-data/entities/synthetic-dataset.entity';

dotenv.config();

const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_PORT = '3306';
const DEFAULT_DB_USERNAME = 'root';
const DEFAULT_DB_NAME = 'clinical_studio';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? DEFAULT_DB_HOST,
  port: parseInt(process.env.DB_PORT ?? DEFAULT_DB_PORT, 10),
  username: process.env.DB_USERNAME ?? DEFAULT_DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? DEFAULT_DB_NAME,
  entities: [User, Job, SyntheticDataset],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
