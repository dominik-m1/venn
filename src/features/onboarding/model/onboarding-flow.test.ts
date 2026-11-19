import { testProfile } from '@/test/mocks/handlers';
import {
  type OnboardingDraft,
  draftReducer,
  emptyDraft,
} from './onboarding-flow';

it('prevents skipping an unsubmitted profile and going before the first step', () => {
  expect(draftReducer(emptyDraft, { type: 'next' })).toBe(emptyDraft);
  expect(draftReducer(emptyDraft, { type: 'back' })).toBe(emptyDraft);
});

it('stops repeated advancement at the final step', () => {
  let draft: OnboardingDraft = {
    values: testProfile,
    profileSubmitted: true,
    stepId: 'step-4',
  };
  for (let count = 0; count < 10; count++) {
    draft = draftReducer(draft, { type: 'next' });
  }
  expect(draft.stepId).toBe('step-5');
});

it('invalidates submitted progress only when a field actually changes', () => {
  const draft: OnboardingDraft = {
    values: testProfile,
    profileSubmitted: true,
    stepId: 'profile',
  };
  expect(
    draftReducer(draft, {
      type: 'change',
      field: 'firstName',
      value: testProfile.firstName,
    }),
  ).toBe(draft);
  expect(
    draftReducer(draft, { type: 'change', field: 'firstName', value: 'Eva' }),
  ).toEqual({
    values: { ...testProfile, firstName: 'Eva' },
    profileSubmitted: false,
    stepId: 'profile',
  });
});
