export const fieldNames = [
  'firstName',
  'lastName',
  'phone',
  'corporationNumber',
] as const;
export type FieldName = (typeof fieldNames)[number];
export type FormValues = Record<FieldName, string>;
export type FieldErrors = Partial<Record<FieldName, string>>;
export type ProfileDetailsRequest = FormValues;
export type CorporationResult =
  { valid: true } | { valid: false; message: string };
export type CorporationCheck =
  | { status: 'idle' | 'checking' | 'valid'; number: string }
  | {
      status: 'invalid' | 'unavailable';
      number: string;
      message: string;
    };
export type SubmitStatus =
  'idle' | 'validating' | 'submitting' | 'success' | 'error';
