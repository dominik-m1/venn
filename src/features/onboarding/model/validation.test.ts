import { testProfile } from '@/test/mocks/handlers';
import { fieldNames } from './onboarding.types';
import {
  toProfileDetailsRequest,
  validateField,
  validateForm,
} from './validation';

describe('local validation', () => {
  it.each(['firstName', 'lastName'] as const)(
    'validates normalized %s without restricting names',
    (field) => {
      for (const empty of ['', '   ']) {
        expect(validateField(field, empty)).toMatch(/required/);
      }
      expect(validateField(field, 'a'.repeat(50))).toBeUndefined();
      expect(validateField(field, 'a'.repeat(51))).toMatch(/50/);
      expect(validateField(field, `  ${'a'.repeat(50)}  `)).toBeUndefined();
      expect(validateField(field, '  Éva O’Neill-Smith  ')).toBeUndefined();
    },
  );
  it('accepts the Canadian phone from the PDF', () =>
    expect(validateField('phone', testProfile.phone)).toBeUndefined());
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
    expect(validateField('phone', phone)).toBeDefined();
  });
  it.each(['', '        ', '12345678', '1234567890', '         '])(
    'rejects corporation %j locally',
    (value) => {
      expect(validateField('corporationNumber', value)).toBeDefined();
    },
  );
  it.each(['000000001', 'abcdefghi'])(
    'leaves corporation membership to the API: %s',
    (value) => {
      expect(validateField('corporationNumber', value)).toBeUndefined();
    },
  );
  it('returns every missing field', () =>
    expect(
      Object.keys(
        validateForm({
          firstName: '',
          lastName: '',
          phone: '',
          corporationNumber: '',
        }),
      ),
    ).toHaveLength(4));
  it('builds exactly four normalized fields without modifying the input', () => {
    const values = {
      ...testProfile,
      firstName: ' Hello ',
      lastName: ' World ',
    };
    expect(toProfileDetailsRequest(values)).toEqual(testProfile);
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
      expect(validateField(field, value)).toBe(messages[field]);
    }
  });

  it.each(['firstName', 'lastName'] as const)(
    'measures %s in trimmed UTF-16 units and preserves its exact message',
    (field) => {
      const label = field === 'firstName' ? 'First name' : 'Last name';
      expect(
        validateField(field, ` \t${'😀'.repeat(25)}\u00a0`),
      ).toBeUndefined();
      for (const value of ['a'.repeat(51), '😀'.repeat(26)]) {
        expect(validateField(field, value)).toBe(
          `${label} must be 50 characters or fewer.`,
        );
      }
      expect(validateField(field, '\u200b')).toBeUndefined();
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
    expect(validateField('corporationNumber', value)).toBe(error);
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
    expect(validateField('phone', value)).toBe(error);
  });

  it('returns exact errors in field order and does not mutate raw values', () => {
    const values = {
      firstName: ' '.repeat(51),
      lastName: '😀'.repeat(26),
      phone: '+12025550123',
      corporationNumber: '12345678',
    };
    const original = { ...values };
    expect(validateForm(values)).toEqual({
      firstName: 'First name is required.',
      lastName: 'Last name must be 50 characters or fewer.',
      phone: 'Enter a valid Canadian phone number.',
      corporationNumber: 'Corporation number must be exactly 9 characters.',
    });
    expect(Object.keys(validateForm(values))).toEqual(fieldNames);
    expect(values).toEqual(original);
    expect(validateForm(testProfile)).toEqual({});
  });

  it('only trims names in the payload, preserving raw phone and corporation strings', () => {
    const values = {
      ...testProfile,
      firstName: '\t Hello \u00a0',
      lastName: ' World\n',
      phone: testProfile.phone + '\n',
      corporationNumber: ' abcdefg ',
      extra: 'ignored',
    };
    const original = { ...values };
    expect(toProfileDetailsRequest(values)).toEqual({
      ...testProfile,
      phone: values.phone,
      corporationNumber: values.corporationNumber,
    });
    expect(values).toEqual(original);
  });
});
