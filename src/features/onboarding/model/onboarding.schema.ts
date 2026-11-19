import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { z } from 'zod';

function requiredString(label: string) {
  return z.string().refine((value) => value.trim().length > 0, {
    message: `${label} is required.`,
    abort: true,
  });
}

function nameSchema(label: string) {
  // Validate trimmed UTF-16 length without changing the stored input.
  return requiredString(label).refine((value) => value.trim().length <= 50, {
    message: `${label} must be 50 characters or fewer.`,
  });
}

export const onboardingSchema = z.object({
  firstName: nameSchema('First name'),
  lastName: nameSchema('Last name'),
  phone: requiredString('Phone number')
    .refine((value) => /^\+1[0-9]{10}$/.test(value), {
      message:
        'Enter a Canadian number starting with +1, followed by 10 digits. Use no spaces or punctuation.',
      abort: true,
    })
    .refine(
      (value) => {
        const phone = parsePhoneNumberFromString(value);
        return phone?.isValid() && phone.country === 'CA';
      },
      { message: 'Enter a valid Canadian phone number.' },
    ),
  // Keep raw UTF-16 length; corporation membership is checked by the API.
  corporationNumber: requiredString('Corporation number').refine(
    (value) => value.length === 9,
    { message: 'Corporation number must be exactly 9 characters.' },
  ),
});
