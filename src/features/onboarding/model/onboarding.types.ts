import type { z } from 'zod';
import type { onboardingSchema } from './onboarding.schema';

export const fieldNames = [
  'firstName',
  'lastName',
  'phone',
  'corporationNumber',
] as const satisfies readonly (keyof FormValues)[];
export type FieldName = (typeof fieldNames)[number];
export type FormValues = z.infer<typeof onboardingSchema>;
export type FieldErrors = Partial<Record<FieldName, string>>;
