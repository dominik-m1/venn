import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { z } from 'zod';

function requiredString(label: string) {
  return z.string().regex(/\S/, {
    error: `${label} is required.`,
    abort: true,
  });
}

function nameSchema(label: string) {
  // Zod 4.6 string limits count code points; the requirement uses UTF-16 units.
  return z
    .string()
    .trim()
    .min(1, { error: `${label} is required.`, abort: true })
    .refine((value) => value.length <= 50, {
      error: `${label} must be 50 characters or fewer.`,
    });
}

export const onboardingSchema = z.object({
  firstName: nameSchema('First name'),
  lastName: nameSchema('Last name'),
  phone: requiredString('Phone number')
    .regex(/^\+1[0-9]{10}$/, {
      error:
        'Enter a Canadian number starting with +1, followed by 10 digits. Use no spaces or punctuation.',
      abort: true,
    })
    .refine(
      (value) => {
        const phone = parsePhoneNumberFromString(value);
        return phone?.isValid() && phone.country === 'CA';
      },
      { error: 'Enter a valid Canadian phone number.' },
    ),
  // Keep raw UTF-16 length; corporation membership is checked by the API.
  corporationNumber: requiredString('Corporation number').refine(
    (value) => value.length === 9,
    { error: 'Corporation number must be exactly 9 characters.' },
  ),
});

export type FormValues = z.input<typeof onboardingSchema>;
export type ProfileDetails = z.output<typeof onboardingSchema>;
export type FieldName = keyof FormValues;
// Schema order matches the fields in the form and determines error focus order.
export const fieldNames = onboardingSchema.keyof().options;
