export type SyntheticRecord = Record<string, string>;

export interface SyntheticComplianceInfo {
  framework: string;
  risk_level: string;
  direct_identifiers_detected: string;
}

export interface SyntheticDataQuality {
  quality: string;
  consistency: string;
  warnings: string[];
}

export interface SyntheticExportSummary {
  format: string;
  records_count: number;
  fields_count: number;
}

export interface SyntheticComplianceChecks {
  dates_transformed: boolean;
  free_text_fields_checked: boolean;
  export_format_validated: boolean;
  synthetic_identifiers_generated: boolean;
  direct_identifiers_removed: boolean;
}

export interface SyntheticAvailableFields {
  default_selected: string[];
  additional_fields: string[];
}

export interface SyntheticDataSummary {
  dataset_id: string;
  status: string;
  compliance: SyntheticComplianceInfo;
  data_quality: SyntheticDataQuality;
  export_summary: SyntheticExportSummary;
  compliance_validation_checks: SyntheticComplianceChecks;
  available_fields: SyntheticAvailableFields;
  preview_records: SyntheticRecord[];
}

export interface GenerateAcceptedResponse {
  dataset_id: string;
  task_id: string;
  status: string;
}

export interface SyntheticStatusResponse {
  dataset_id: string;
  status: string;
  error_message?: string;
}
