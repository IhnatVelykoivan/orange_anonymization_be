import { Injectable } from '@nestjs/common';
import { createReadStream, promises as fsPromises, ReadStream } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import {
  ALL_FIELDS,
  SyntheticOutputFormat,
} from '@/modules/synthetic-data/constants/synthetic-fields';
import { SyntheticRecord } from '@/modules/synthetic-data/interfaces/synthetic-data.interface';

const STORAGE_DIR = path.join(os.tmpdir(), 'synthetic-datasets');
const JSON_INDENT = 2;
const WORKSHEET_NAME = 'Synthetic Data';

const CONTENT_TYPES: Record<SyntheticOutputFormat, string> = {
  [SyntheticOutputFormat.CSV]: 'text/csv',
  [SyntheticOutputFormat.JSON]: 'application/json',
  [SyntheticOutputFormat.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const FILE_EXTENSIONS: Record<SyntheticOutputFormat, string> = {
  [SyntheticOutputFormat.CSV]: 'csv',
  [SyntheticOutputFormat.JSON]: 'json',
  [SyntheticOutputFormat.XLSX]: 'xlsx',
};

@Injectable()
export class SyntheticExportService {
  async write(
    datasetId: string,
    format: SyntheticOutputFormat,
    rows: SyntheticRecord[],
  ): Promise<string> {
    await fsPromises.mkdir(STORAGE_DIR, { recursive: true });
    const filePath = path.join(STORAGE_DIR, `${datasetId}.${FILE_EXTENSIONS[format]}`);

    switch (format) {
      case SyntheticOutputFormat.JSON:
        await fsPromises.writeFile(filePath, JSON.stringify(rows, null, JSON_INDENT), 'utf8');
        break;
      case SyntheticOutputFormat.XLSX:
        await this.writeXlsx(filePath, rows);
        break;
      case SyntheticOutputFormat.CSV:
      default:
        await fsPromises.writeFile(filePath, this.toCsv(rows), 'utf8');
        break;
    }

    return filePath;
  }

  getContentType(format: SyntheticOutputFormat): string {
    return CONTENT_TYPES[format];
  }

  getFileExtension(format: SyntheticOutputFormat): string {
    return FILE_EXTENSIONS[format];
  }

  getReadStream(filePath: string): ReadStream {
    return createReadStream(filePath);
  }

  async remove(filePath: string): Promise<void> {
    await fsPromises.rm(filePath, { force: true });
  }

  private toCsv(rows: SyntheticRecord[]): string {
    const header = ALL_FIELDS.map((field) => this.escapeCsv(field)).join(',');
    const body = rows.map((row) =>
      ALL_FIELDS.map((field) => this.escapeCsv(row[field] ?? '')).join(','),
    );
    return [header, ...body].join('\n');
  }

  private escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async writeXlsx(filePath: string, rows: SyntheticRecord[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(WORKSHEET_NAME);
    worksheet.addRow(ALL_FIELDS);
    for (const row of rows) {
      worksheet.addRow(ALL_FIELDS.map((field) => row[field] ?? ''));
    }
    await workbook.xlsx.writeFile(filePath);
  }
}
