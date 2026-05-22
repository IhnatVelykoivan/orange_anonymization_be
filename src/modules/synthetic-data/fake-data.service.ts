import { BadRequestException, Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import {
  AGE_RANGES,
  DOC_TYPES,
  QUALITY_LABELS,
  RECORD_ID_PAD_LENGTH,
  RECORD_ID_PREFIX,
} from '@/modules/synthetic-data/constants/synthetic-fields';

const SSN_GROUP_1_LENGTH = 3;
const SSN_GROUP_2_LENGTH = 2;
const SSN_GROUP_3_LENGTH = 4;
const LICENSE_LENGTH = 8;
const MRN_DIGITS = 7;
const DATE_ISO_DATE_LENGTH = 10;
const BIOMETRIC_ID_LENGTH = 16;
const DEVICE_ID_LENGTH = 12;
const BENEFICIARY_DIGITS = 9;
const OTHER_ID_LENGTH = 10;

const MRN_PREFIX = 'MRN-';
const BIOMETRIC_PREFIX = 'BIO-';
const DEVICE_PREFIX = 'DEV-';
const PERSON_SUFFIX = ' (Synthetic)';

@Injectable()
export class FakeDataService {
  // Keyed by output column name (see ENTITY_FIELDS).
  private readonly generators: Record<string, () => string> = {
    PERSON: () => `${faker.person.fullName()}${PERSON_SUFFIX}`,
    LOCATION: () => faker.location.city(),
    DATE: () => faker.date.past().toISOString().slice(0, DATE_ISO_DATE_LENGTH),
    PHONE: () => faker.phone.number(),
    FAX: () => faker.phone.number(),
    EMAIL: () => faker.internet.email(),
    SSN: () =>
      `${faker.string.numeric(SSN_GROUP_1_LENGTH)}-${faker.string.numeric(SSN_GROUP_2_LENGTH)}-${faker.string.numeric(SSN_GROUP_3_LENGTH)}`,
    MRN: () => `${MRN_PREFIX}${faker.string.numeric(MRN_DIGITS)}`,
    BENEFICIARY: () => faker.string.numeric(BENEFICIARY_DIGITS),
    ACCOUNT: () => faker.finance.iban(),
    LICENSE: () => faker.string.alphanumeric(LICENSE_LENGTH).toUpperCase(),
    VEHICLE: () => faker.vehicle.vin(),
    DEVICE: () => `${DEVICE_PREFIX}${faker.string.alphanumeric(DEVICE_ID_LENGTH).toUpperCase()}`,
    URL: () => faker.internet.url(),
    IP: () => faker.internet.ip(),
    BIOMETRIC: () =>
      `${BIOMETRIC_PREFIX}${faker.string.alphanumeric(BIOMETRIC_ID_LENGTH).toUpperCase()}`,
    PHOTO: () => faker.image.avatar(),
    OTHER: () => faker.string.alphanumeric(OTHER_ID_LENGTH),
  };

  generateFakeValue(fieldType: string): string {
    const generator = this.generators[fieldType];
    if (!generator) {
      throw new BadRequestException(`Unsupported field type: ${fieldType}`);
    }
    return generator();
  }

  generateRecordId(index: number): string {
    return `${RECORD_ID_PREFIX}${String(index).padStart(RECORD_ID_PAD_LENGTH, '0')}`;
  }

  generateDocType(datasetType?: string): string {
    if (datasetType?.trim()) {
      return datasetType.trim();
    }
    return faker.helpers.arrayElement(DOC_TYPES);
  }

  generateAgeRange(): string {
    return faker.helpers.arrayElement(AGE_RANGES);
  }

  generateDate(): string {
    return faker.date.past().toISOString().slice(0, DATE_ISO_DATE_LENGTH);
  }

  generateQuality(): string {
    return faker.helpers.arrayElement(QUALITY_LABELS);
  }
}
