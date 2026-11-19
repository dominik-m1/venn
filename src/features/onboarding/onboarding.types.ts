export const fieldNames = ['firstName', 'lastName', 'phone', 'corporationNumber'] as const;
export type FieldName = (typeof fieldNames)[number];
export type FormValues = Record<FieldName, string>;
export type FieldErrors = Partial<Record<FieldName, string>>;
export type ProfileDetailsRequest = FormValues;
export type CorporationResult = { valid: true } | { valid: false; message: string };
export type CorporationCheck = {
  status: 'idle' | 'checking' | 'valid' | 'invalid' | 'unavailable';
  number: string;
  version: number;
  message?: string;
};
export type SubmitStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';
