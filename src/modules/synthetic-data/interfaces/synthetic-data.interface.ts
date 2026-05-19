export interface SyntheticDataResponse {
  fields: string[];
  count: number;
  rows: Record<string, string>[];
}

export interface SupportedFieldsResponse {
  fields: string[];
}
