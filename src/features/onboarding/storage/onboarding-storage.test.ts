import { testProfile } from '@/test/mocks/handlers';
import { emptyDraft } from '@/features/onboarding/model/onboarding-flow';
import {
  ONBOARDING_STORAGE_KEY,
  readOnboardingDraft,
  saveOnboardingDraft,
} from './onboarding-storage';

function store(value: unknown) {
  sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(value));
}

it('round trips edits, progress, and the submitted profile marker', () => {
  const draft = {
    values: {
      ...testProfile,
      firstName: ' Hello ',
      corporationNumber: '012345678',
    },
    stepId: 'step-3' as const,
    profileSubmitted: true,
  };
  saveOnboardingDraft(draft);
  expect(readOnboardingDraft()).toEqual(draft);
});

it.each([null, [], {}, { version: 999 }, { version: 1, values: [] }])(
  'ignores an unsupported draft: %j',
  (value) => {
    store(value);
    expect(readOnboardingDraft()).toEqual(emptyDraft);
  },
);

it('ignores corrupt JSON', () => {
  sessionStorage.setItem(ONBOARDING_STORAGE_KEY, '{invalid');
  expect(readOnboardingDraft()).toEqual(emptyDraft);
});

it('preserves string edits, defaults invalid types, and drops unknown fields', () => {
  store({
    version: 1,
    stepId: 'step-5',
    profileSubmitted: true,
    values: {
      firstName: 'Eva',
      lastName: null,
      phone: 123,
      unknown: 'ignored',
    },
  });
  expect(readOnboardingDraft()).toEqual({
    ...emptyDraft,
    values: { ...emptyDraft.values, firstName: 'Eva' },
  });
});

it.each([
  { firstName: ' '.repeat(51) },
  { lastName: '😀'.repeat(26) },
  { phone: '+12025550123' },
  { phone: testProfile.phone + '\n' },
  { corporationNumber: ' '.repeat(9) },
  { corporationNumber: '😀'.repeat(5) },
])(
  'rejects submitted progress with locally invalid values: %j',
  (overrides) => {
    const values = { ...testProfile, ...overrides };
    store({ version: 1, stepId: 'step-3', profileSubmitted: true, values });
    expect(readOnboardingDraft()).toEqual({ ...emptyDraft, values });
  },
);

it('restores submitted progress without normalizing accepted boundary values', () => {
  const draft = {
    values: {
      firstName: ` ${'😀'.repeat(25)} `,
      lastName: ' World ',
      phone: testProfile.phone,
      corporationNumber: '😀'.repeat(4) + 'a',
    },
    stepId: 'step-3' as const,
    profileSubmitted: true,
  };
  saveOnboardingDraft(draft);
  expect(readOnboardingDraft()).toEqual(draft);
});

it.each([
  { stepId: 'removed-step', profileSubmitted: true },
  { stepId: 4, profileSubmitted: true },
  { stepId: 'step-5', profileSubmitted: false },
  { stepId: 'step-5', profileSubmitted: 'true' },
])('restores a safe step for invalid progress: %j', (progress) => {
  store({ version: 1, values: testProfile, ...progress });
  expect(readOnboardingDraft().stepId).toBe('profile');
});

it('continues with empty in-memory state when storage access is blocked', () => {
  jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  expect(readOnboardingDraft()).toEqual(emptyDraft);
  expect(() => saveOnboardingDraft(emptyDraft)).not.toThrow();
});

it('does not throw when storage is full', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
  expect(() => saveOnboardingDraft(emptyDraft)).not.toThrow();
});
