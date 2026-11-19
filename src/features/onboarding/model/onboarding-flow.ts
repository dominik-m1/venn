import type { FieldName, FormValues } from './onboarding.types';

export const onboardingSteps = [
  { id: 'profile', label: 'Profile details' },
  { id: 'step-2', label: 'Step 2' },
  { id: 'step-3', label: 'Step 3' },
  { id: 'step-4', label: 'Step 4' },
  { id: 'step-5', label: 'Step 5' },
] as const;

export type OnboardingStepId = (typeof onboardingSteps)[number]['id'];

export const emptyValues: FormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  corporationNumber: '',
};

export type OnboardingDraft = {
  values: FormValues;
  stepId: OnboardingStepId;
  profileSubmitted: boolean;
};

export const emptyDraft: OnboardingDraft = {
  values: emptyValues,
  stepId: onboardingSteps[0].id,
  profileSubmitted: false,
};

export type DraftAction =
  | { type: 'restore'; draft: OnboardingDraft }
  | { type: 'change'; field: FieldName; value: string }
  | { type: 'profile-submitted' }
  | { type: 'next' | 'back' };

export function draftReducer(
  draft: OnboardingDraft,
  action: DraftAction,
): OnboardingDraft {
  switch (action.type) {
    case 'restore':
      return action.draft;
    case 'change':
      if (draft.values[action.field] === action.value) return draft;
      return {
        ...emptyDraft,
        values: { ...draft.values, [action.field]: action.value },
      };
    case 'profile-submitted':
      return {
        ...draft,
        profileSubmitted: true,
        stepId: onboardingSteps[1]?.id ?? onboardingSteps[0].id,
      };
    case 'next':
    case 'back': {
      if (action.type === 'next' && !draft.profileSubmitted) return draft;
      const index = onboardingSteps.findIndex(({ id }) => id === draft.stepId);
      const step = onboardingSteps[index + (action.type === 'next' ? 1 : -1)];
      return step ? { ...draft, stepId: step.id } : draft;
    }
  }
}
