import { validateField, validateForm, toProfileDetailsRequest } from './validation';
import { testProfile } from '@/test/mocks/handlers';

describe('local validation', () => {
  it.each(['firstName', 'lastName'] as const)('validates normalized %s without restricting names', field => {
    for (const empty of ['', '   ']) expect(validateField(field, empty)).toMatch(/required/);
    expect(validateField(field, 'a'.repeat(50))).toBeUndefined();
    expect(validateField(field, 'a'.repeat(51))).toMatch(/50/);
    expect(validateField(field, `  ${'a'.repeat(50)}  `)).toBeUndefined();
    expect(validateField(field, "  Éva O’Neill-Smith  ")).toBeUndefined();
  });
  it('accepts the Canadian phone from the PDF', () => expect(validateField('phone', testProfile.phone)).toBeUndefined());
  it.each(['+12025550123', '+442079460123', '+18005551234', '13062776103', '++13062776103', '+1 3062776103', '+1(306)2776103', '+1-3062776103', '+13062776103x1', '+1306277610', '+130627761031', '+1３０６２７７６１０３', '+10000000000'])('rejects phone %s', phone => {
    expect(validateField('phone', phone)).toBeDefined();
  });
  it.each(['', '        ', '12345678', '1234567890', '         '])('rejects corporation %j locally', value => {
    expect(validateField('corporationNumber', value)).toBeDefined();
  });
  it.each(['000000001', 'abcdefghi'])('leaves corporation membership to the API: %s', value => {
    expect(validateField('corporationNumber', value)).toBeUndefined();
  });
  it('returns every missing field', () => expect(Object.keys(validateForm({ firstName: '', lastName: '', phone: '', corporationNumber: '' }))).toHaveLength(4));
  it('builds exactly four normalized fields without modifying the input', () => {
    const values = { ...testProfile, firstName: ' Hello ', lastName: ' World ' };
    expect(toProfileDetailsRequest(values)).toEqual(testProfile);
    expect(values.firstName).toBe(' Hello ');
  });
});
