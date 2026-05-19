import { Injectable } from '@nestjs/common';
import { FakeDataService } from '@/modules/synthetic-data/fake-data.service';

@Injectable()
export class SyntheticDataService {
  constructor(private readonly fakeDataService: FakeDataService) {}

  generate(fields: string[], count: number): Record<string, string>[] {
    const rows: Record<string, string>[] = [];
    for (let rowIndex = 0; rowIndex < count; rowIndex++) {
      const row: Record<string, string> = {};
      for (const field of fields) {
        row[field] = this.fakeDataService.generateFakeValue(field);
      }
      rows.push(row);
    }
    return rows;
  }
}
