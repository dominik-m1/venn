export const fieldNames = [
  'firstName',
  'lastName',
  'phone',
  'corporationNumber',
] as const;
export type FieldName = (typeof fieldNames)[number];
export type FormValues = Record<FieldName, string>;
export type FieldErrors = Partial<Record<FieldName, string>>;
