import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import {
  fieldNames,
  type FieldName,
  type FormValues,
  type FieldErrors,
  type ProfileDetailsRequest,
} from './onboarding.types';

const labels: Record<FieldName, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  phone: 'Phone number',
  corporationNumber: 'Corporation number',
};

export function validateField(
  field: FieldName,
  value: string,
): string | undefined {
  if (!value.trim()) return `${labels[field]} is required.`;
  if (field === 'firstName' || field === 'lastName') {
    return value.trim().length > 50
      ? `${labels[field]} must be 50 characters or fewer.`
      : undefined;
  }
  if (field === 'corporationNumber') {
    return value.length !== 9
      ? 'Corporation number must be exactly 9 characters.'
      : undefined;
  }
  if (!/^\+1[0-9]{10}$/.test(value)) {
    return 'Enter a Canadian number starting with +1, followed by 10 digits. Use no spaces or punctuation.';
  }
  const phone = parsePhoneNumberFromString(value);
  return phone?.isValid() && phone.country === 'CA'
    ? undefined
    : 'Enter a valid Canadian phone number.';
}

export function validateForm(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldNames) {
    const error = validateField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

export function toProfileDetailsRequest(
  values: FormValues,
): ProfileDetailsRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone,
    corporationNumber: values.corporationNumber,
  };
}
