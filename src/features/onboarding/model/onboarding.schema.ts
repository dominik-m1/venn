import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { z } from 'zod';

const NAME_MAX_LENGTH = 50;
const CORPORATION_NUMBER_LENGTH = 9;

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
    .refine((value) => value.length <= NAME_MAX_LENGTH, {
      error: `${label} must be ${NAME_MAX_LENGTH} characters or fewer.`,
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
  corporationNumber: requiredString('Corporation number').refine(
    (value) => value.length === CORPORATION_NUMBER_LENGTH,
    {
      error: `Corporation number must be exactly ${CORPORATION_NUMBER_LENGTH} characters.`,
    },
  ),
});

export type FormValues = z.input<typeof onboardingSchema>;
export type ProfileDetails = z.output<typeof onboardingSchema>;
export type FieldName = keyof FormValues;
export const fieldNames = onboardingSchema.keyof().options;
