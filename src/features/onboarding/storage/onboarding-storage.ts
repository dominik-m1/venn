import {
  fieldNames,
  type FormValues,
} from '@/features/onboarding/model/onboarding.types';
import { validateForm } from '@/features/onboarding/model/validation';
import {
  emptyDraft,
  onboardingSteps,
  type OnboardingDraft,
} from '@/features/onboarding/model/onboarding-flow';

export const ONBOARDING_STORAGE_KEY = 'venn:onboarding';
const DRAFT_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readOnboardingDraft(): OnboardingDraft {
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return emptyDraft;
    const stored: unknown = JSON.parse(raw);
    if (
      !isRecord(stored) ||
      stored.version !== DRAFT_VERSION ||
      !isRecord(stored.values)
    )
      return emptyDraft;

    const savedValues = stored.values;
    // Pick known fields only. Invalid field types do not discard other edits.
    const values = Object.fromEntries(
      fieldNames.map((field) => [
        field,
        typeof savedValues[field] === 'string' ? savedValues[field] : '',
      ]),
    ) as FormValues;
    const profileSubmitted =
      stored.profileSubmitted === true &&
      Object.keys(validateForm(values)).length === 0;
    const savedStep = onboardingSteps.find(({ id }) => id === stored.stepId);
    return {
      values,
      profileSubmitted,
      stepId:
        profileSubmitted && savedStep ? savedStep.id : onboardingSteps[0].id,
    };
  } catch {
    // SSR, corrupt JSON, or blocked storage must not prevent onboarding.
    return emptyDraft;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  try {
    window.sessionStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ version: DRAFT_VERSION, ...draft }),
    );
  } catch {
    // Continue in memory when storage is blocked or its quota is exhausted.
  }
}
