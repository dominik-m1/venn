import { onboardingSchema } from './onboarding.schema';
import {
  fieldNames,
  type FieldName,
  type FormValues,
  type FieldErrors,
} from './onboarding.types';

export function validateField(
  field: FieldName,
  value: string,
): string | undefined {
  const result = onboardingSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

export function validateForm(values: FormValues): FieldErrors {
  const result = onboardingSchema.safeParse(values);
  const errors: FieldErrors = {};
  if (result.success) return errors;

  for (const field of fieldNames) {
    const issue = result.error.issues.find(({ path }) => path[0] === field);
    if (issue) errors[field] = issue.message;
  }
  return errors;
}

export function toProfileDetailsRequest(values: FormValues): FormValues {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone,
    corporationNumber: values.corporationNumber,
  };
}
