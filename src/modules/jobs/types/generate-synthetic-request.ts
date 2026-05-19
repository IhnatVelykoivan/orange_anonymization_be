export interface GenerateSyntheticRequest {
  records: number;
  framework: string;
  outputFormat: string;
  useDeidentifiedSource?: boolean;
  sourceJobId?: string | null;
  sourceText?: string | null;
}
