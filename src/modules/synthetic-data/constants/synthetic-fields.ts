export enum SyntheticOutputFormat {
  CSV = 'CSV',
  JSON = 'JSON',
  XLSX = 'XLSX',
}

export const DEFAULT_FIELDS: string[] = ['record_id', 'doc_type', 'age_range', 'date', 'quality'];

export const ENTITY_FIELDS: string[] = [
  'PERSON',
  'LOCATION',
  'DATE',
  'PHONE',
  'FAX',
  'EMAIL',
  'SSN',
  'MRN',
  'BENEFICIARY',
  'ACCOUNT',
  'LICENSE',
  'VEHICLE',
  'DEVICE',
  'URL',
  'IP',
  'BIOMETRIC',
  'PHOTO',
  'OTHER',
];

export const ALL_FIELDS: string[] = [...DEFAULT_FIELDS, ...ENTITY_FIELDS];
export const TOTAL_FIELDS_COUNT = ALL_FIELDS.length;

export const PRESIDIO_TO_COLUMN: Record<string, string> = {
  PERSON: 'PERSON',
  LOCATION: 'LOCATION',
  DATE_TIME: 'DATE',
  PHONE_NUMBER: 'PHONE',
  EMAIL_ADDRESS: 'EMAIL',
  US_SSN: 'SSN',
  MEDICAL_RECORD_NUMBER: 'MRN',
  IBAN_CODE: 'ACCOUNT',
  CREDIT_CARD: 'ACCOUNT',
  US_BANK_NUMBER: 'ACCOUNT',
  US_DRIVER_LICENSE: 'LICENSE',
  VEHICLE: 'VEHICLE',
  URL: 'URL',
  IP_ADDRESS: 'IP',
  BIOMETRIC: 'BIOMETRIC',
  PHOTO: 'PHOTO',
};

export const PRESIDIO_ENTITIES: string[] = [...new Set(Object.keys(PRESIDIO_TO_COLUMN))];

export const AGE_RANGES: string[] = [
  '0-17',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65-74',
  '75+',
];

export const QUALITY_LABELS: string[] = ['Excellent', 'Good', 'Fair'];

export const DOC_TYPES: string[] = [
  'Discharge summary',
  'Clinical note',
  'Progress note',
  'Lab report',
  'Radiology report',
  'Consultation note',
];

export const RECORD_ID_PREFIX = 'SYN-';
export const RECORD_ID_PAD_LENGTH = 5;
export const PREVIEW_LIMIT = 5;

export const ANALYSIS_LANGUAGE = 'en';
export const ANALYSIS_SCORE_THRESHOLD = 0.5;
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export const RISK_LEVEL_LOW = 'Low';
export const IDENTIFIERS_NOT_DETECTED = 'Not detected';
export const QUALITY_GOOD = 'Good';
export const CONSISTENCY_HIGH = 'High';
export const FRAMEWORK_HIPAA_LABEL = 'HIPAA Safe Harbor';
export const FRAMEWORK_GDPR_LABEL = 'EU GDPR';
export const GDPR_MATCH_TOKEN = 'gdpr';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
export const DATASET_TTL_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
