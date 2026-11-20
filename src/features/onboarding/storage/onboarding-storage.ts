import { z } from 'zod';
import {
  type OnboardingDraft,
  emptyDraft,
  onboardingSteps,
} from '@/features/onboarding/model/onboarding-flow';
import { onboardingSchema } from '@/features/onboarding/model/onboarding.schema';

export const ONBOARDING_STORAGE_KEY = 'venn:onboarding';
const DRAFT_VERSION = 1;

const storedDraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  // Keep incomplete edits and recover each field independently.
  values: z.object({
    firstName: z.string().catch(''),
    lastName: z.string().catch(''),
    phone: z.string().catch(''),
    corporationNumber: z.string().catch(''),
  }),
  profileSubmitted: z.boolean().catch(false),
  stepId: z
    .enum(onboardingSteps.map(({ id }) => id))
    .catch(onboardingSteps[0].id),
});

export function readOnboardingDraft(): OnboardingDraft {
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return emptyDraft;
    }
    const result = storedDraftSchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      return emptyDraft;
    }

    const { values, stepId } = result.data;
    // Check submitted progress without replacing the raw edits with parsed data.
    const profileSubmitted =
      result.data.profileSubmitted &&
      onboardingSchema.safeParse(values).success;
    return {
      values,
      profileSubmitted,
      stepId: profileSubmitted ? stepId : onboardingSteps[0].id,
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
