import { z } from 'zod';
import { testProfile } from '@/test/mocks/handlers';
import { fieldNames, onboardingSchema } from './onboarding.schema';

describe('local validation', () => {
  it.each(['firstName', 'lastName'] as const)(
    'validates normalized %s without restricting names',
    (field) => {
      const schema = onboardingSchema.shape[field];
      for (const empty of ['', '   ']) {
        expect(schema.safeParse(empty).error?.issues[0]?.message).toMatch(
          /required/,
        );
      }
      expect(schema.safeParse('a'.repeat(50)).success).toBe(true);
      expect(
        schema.safeParse('a'.repeat(51)).error?.issues[0]?.message,
      ).toMatch(/50/);
      expect(schema.safeParse(`  ${'a'.repeat(50)}  `).success).toBe(true);
      expect(schema.safeParse('  Éva O’Neill-Smith  ').success).toBe(true);
    },
  );
  it('accepts the Canadian phone from the PDF', () =>
    expect(
      onboardingSchema.shape.phone.safeParse(testProfile.phone).success,
    ).toBe(true));
  it.each([
    '+12025550123',
    '+442079460123',
    '+18005551234',
    '13062776103',
    '++13062776103',
    '+1 3062776103',
    '+1(306)2776103',
    '+1-3062776103',
    '+13062776103x1',
    '+1306277610',
    '+130627761031',
    '+1３０６２７７６１０３',
    '+10000000000',
  ])('rejects phone %s', (phone) => {
    expect(onboardingSchema.shape.phone.safeParse(phone).success).toBe(false);
  });
  it.each(['', '        ', '12345678', '1234567890', '         '])(
    'rejects corporation %j locally',
    (value) => {
      expect(
        onboardingSchema.shape.corporationNumber.safeParse(value).success,
      ).toBe(false);
    },
  );
  it.each(['000000001', 'abcdefghi'])(
    'leaves corporation membership to the API: %s',
    (value) => {
      expect(
        onboardingSchema.shape.corporationNumber.safeParse(value).success,
      ).toBe(true);
    },
  );
  it('returns every missing field', () => {
    const result = onboardingSchema.safeParse({
      firstName: '',
      lastName: '',
      phone: '',
      corporationNumber: '',
    });
    expect(result.error?.issues.map(({ path }) => path[0])).toEqual(fieldNames);
  });
  it('builds exactly four normalized fields without modifying the input', () => {
    const values = {
      ...testProfile,
      firstName: ' Hello ',
      lastName: ' World ',
      extra: 'ignored',
    };
    expect(onboardingSchema.parse(values)).toEqual(testProfile);
    expect(values.firstName).toBe(' Hello ');
  });

  it.each(fieldNames)('preserves required messages for %s', (field) => {
    const messages = {
      firstName: 'First name is required.',
      lastName: 'Last name is required.',
      phone: 'Phone number is required.',
      corporationNumber: 'Corporation number is required.',
    };
    for (const value of ['', ' ', '\t\r\n', '\u00a0\uFEFF', ' '.repeat(51)]) {
      expect(
        onboardingSchema.shape[field].safeParse(value).error?.issues[0]
          ?.message,
      ).toBe(messages[field]);
    }
  });

  it.each(['firstName', 'lastName'] as const)(
    'measures %s in trimmed UTF-16 units and preserves its exact message',
    (field) => {
      const label = field === 'firstName' ? 'First name' : 'Last name';
      const schema = onboardingSchema.shape[field];
      expect(schema.safeParse(` \t${'😀'.repeat(25)}\u00a0`).success).toBe(
        true,
      );
      for (const value of ['a'.repeat(51), '😀'.repeat(26)]) {
        expect(schema.safeParse(value).error?.issues[0]?.message).toBe(
          `${label} must be 50 characters or fewer.`,
        );
      }
      expect(schema.safeParse('\u200b').success).toBe(true);
    },
  );

  it.each([
    ['12345678', 'Corporation number must be exactly 9 characters.'],
    ['1234567890', 'Corporation number must be exactly 9 characters.'],
    ['😀'.repeat(5), 'Corporation number must be exactly 9 characters.'],
    [' abcdefg ', undefined],
    ['a/b ?#%xy', undefined],
    ['😀'.repeat(4) + 'a', undefined],
    ['\u200b'.repeat(9), undefined],
  ])('preserves raw corporation length validation for %j', (value, error) => {
    expect(
      onboardingSchema.shape.corporationNumber.safeParse(value).error?.issues[0]
        ?.message,
    ).toBe(error);
  });

  it.each([
    [
      '+1 3062776103',
      'Enter a Canadian number starting with +1, followed by 10 digits. Use no spaces or punctuation.',
    ],
    [
      ' +13062776103',
      'Enter a Canadian number starting with +1, followed by 10 digits. Use no spaces or punctuation.',
    ],
    [
      '+1３０６２７７６１０３',
      'Enter a Canadian number starting with +1, followed by 10 digits. Use no spaces or punctuation.',
    ],
    ['+12025550123', 'Enter a valid Canadian phone number.'],
    ['+18005551234', 'Enter a valid Canadian phone number.'],
    ['+10000000000', 'Enter a valid Canadian phone number.'],
    [testProfile.phone, undefined],
    [
      testProfile.phone + '\n',
      'Enter a Canadian number starting with +1, followed by 10 digits. Use no spaces or punctuation.',
    ],
  ])('preserves phone message precedence for %j', (value, error) => {
    expect(
      onboardingSchema.shape.phone.safeParse(value).error?.issues[0]?.message,
    ).toBe(error);
  });

  it('returns exact errors in field order and does not mutate raw values', () => {
    const values = {
      firstName: ' '.repeat(51),
      lastName: '😀'.repeat(26),
      phone: '+12025550123',
      corporationNumber: '12345678',
    };
    const original = { ...values };
    const result = onboardingSchema.safeParse(values);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected invalid form values.');
    }
    expect(z.flattenError(result.error).fieldErrors).toEqual({
      firstName: ['First name is required.'],
      lastName: ['Last name must be 50 characters or fewer.'],
      phone: ['Enter a valid Canadian phone number.'],
      corporationNumber: ['Corporation number must be exactly 9 characters.'],
    });
    expect(Object.keys(z.flattenError(result.error).fieldErrors)).toEqual(
      fieldNames,
    );
    expect(values).toEqual(original);
    expect(onboardingSchema.safeParse(testProfile).success).toBe(true);
  });

  it('only trims names in the payload, preserving raw phone and corporation strings', () => {
    const values = {
      ...testProfile,
      firstName: '\t Hello \u00a0',
      lastName: ' World\n',
      corporationNumber: ' abcdefg ',
      extra: 'ignored',
    };
    const original = { ...values };
    expect(onboardingSchema.parse(values)).toEqual({
      ...testProfile,
      phone: values.phone,
      corporationNumber: values.corporationNumber,
    });
    expect(values).toEqual(original);
  });

  it('does not produce a submission payload for invalid input', () => {
    const result = onboardingSchema.safeParse({
      ...testProfile,
      phone: testProfile.phone + '\n',
    });
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
  });
});
