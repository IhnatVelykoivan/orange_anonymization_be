import { BadRequestException, Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

const SSN_GROUP_1_LENGTH = 3;
const SSN_GROUP_2_LENGTH = 2;
const SSN_GROUP_3_LENGTH = 4;
const LICENSE_LENGTH = 8;
const MRN_DIGITS = 7;
const DATE_ISO_DATE_LENGTH = 10;
const BIOMETRIC_ID_LENGTH = 16;
const DEVICE_ID_LENGTH = 12;
const BENEFICIARY_DIGITS = 9;
const CERTIFICATE_ID_LENGTH = 10;
const HEALTH_PLAN_DIGITS = 10;

const MRN_PREFIX = 'MRN-';
const BIOMETRIC_PREFIX = 'BIO-';
const DEVICE_PREFIX = 'DEV-';
const CERTIFICATE_PREFIX = 'CERT-';

@Injectable()
export class FakeDataService {
  private readonly generators: Record<string, () => string> = {
    NAME: () => faker.person.fullName(),
    EMAIL: () => faker.internet.email(),
    PHONE: () => faker.phone.number(),
    FAX: () => faker.phone.number(),
    DATE: () => faker.date.past().toISOString().slice(0, DATE_ISO_DATE_LENGTH),
    SSN: () =>
      `${faker.string.numeric(SSN_GROUP_1_LENGTH)}-${faker.string.numeric(SSN_GROUP_2_LENGTH)}-${faker.string.numeric(SSN_GROUP_3_LENGTH)}`,
    ADDRESS: () => faker.location.streetAddress(),
    URL: () => faker.internet.url(),
    IP: () => faker.internet.ip(),
    LICENSE: () => faker.string.alphanumeric(LICENSE_LENGTH).toUpperCase(),
    VEHICLE: () => faker.vehicle.vin(),
    ACCOUNT: () => faker.finance.iban(),
    MRN: () => `${MRN_PREFIX}${faker.string.numeric(MRN_DIGITS)}`,
    ZIP: () => faker.location.zipCode(),
    BIOMETRIC: () =>
      `${BIOMETRIC_PREFIX}${faker.string.alphanumeric(BIOMETRIC_ID_LENGTH).toUpperCase()}`,
    PHOTO: () => faker.image.avatar(),
    DEVICE: () => `${DEVICE_PREFIX}${faker.string.alphanumeric(DEVICE_ID_LENGTH).toUpperCase()}`,
    BENEFICIARY: () => faker.string.numeric(BENEFICIARY_DIGITS),
    CERTIFICATE: () =>
      `${CERTIFICATE_PREFIX}${faker.string.alphanumeric(CERTIFICATE_ID_LENGTH).toUpperCase()}`,
    HEALTH_PLAN: () => faker.string.numeric(HEALTH_PLAN_DIGITS),
  };

  generateFakeValue(fieldType: string): string {
    const generator = this.generators[fieldType];
    if (!generator) {
      throw new BadRequestException(`Unsupported field type: ${fieldType}`);
    }
    return generator();
  }

  getSupportedFieldTypes(): string[] {
    return Object.keys(this.generators);
  }
}
