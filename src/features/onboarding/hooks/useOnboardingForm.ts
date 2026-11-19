import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  fieldNames,
  type FieldName,
  type FieldErrors,
} from '@/features/onboarding/model/onboarding.types';
import { useCorporationVerification } from './useCorporationVerification';
import { useOnboardingSubmission } from './useOnboardingSubmission';
import {
  validateField,
  validateForm,
} from '@/features/onboarding/model/validation';
import { onboardingSteps } from '@/features/onboarding/model/onboarding-flow';
import { useOnboardingDraft } from './useOnboardingDraft';

export function useOnboardingForm() {
  const draft = useOnboardingDraft();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const inputs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>(
    {},
  );
  const corporation = useCorporationVerification();
  const submission = useOnboardingSubmission(corporation.verify);
  const { verificationFailed } = submission;
  const stepIndex = onboardingSteps.findIndex(
    ({ id }) => id === draft.draft.stepId,
  );

  // This runs after the rejected verification has re-enabled the input.
  useEffect(() => {
    if (verificationFailed) inputs.current.corporationNumber?.focus();
  }, [verificationFailed]);

  function change(field: FieldName, value: string) {
    if (!draft.ready || !submission.canEdit()) return;

    draft.update({ type: 'change', field, value });
    submission.reset();
    if (field === 'corporationNumber') corporation.reset(value);
  }

  function blur(field: FieldName) {
    if (
      !draft.ready ||
      draft.getCurrent().profileSubmitted ||
      !submission.canSubmit()
    )
      return;

    const values = draft.getCurrent().values;
    const error = validateField(field, values[field]);
    setFieldErrors((previous) => ({ ...previous, [field]: error }));
    if (field === 'corporationNumber' && !error)
      void corporation.verify(values.corporationNumber);
  }

  async function next() {
    if (!draft.ready || !submission.canEdit()) return;
    const current = draft.getCurrent();
    if (current.stepId !== onboardingSteps[0].id || current.profileSubmitted) {
      draft.update({ type: 'next' });
      return;
    }
    if (!submission.canSubmit()) return;

    const snapshot = { ...draft.getCurrent().values };
    const errors = validateForm(snapshot);
    setFieldErrors(errors);
    submission.reset();

    const firstInvalid = fieldNames.find((field) => errors[field]);
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus();
      return;
    }

    if (await submission.submit(snapshot)) {
      draft.update({ type: 'profile-submitted' });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return next();
  }

  function back() {
    if (draft.ready && submission.canEdit()) draft.update({ type: 'back' });
  }

  return {
    values: draft.draft.values,
    fieldErrors,
    corporationCheck: corporation.check,
    submitStatus: draft.draft.profileSubmitted ? 'success' : submission.status,
    formError: submission.error,
    busy: !draft.ready || submission.busy,
    ready: draft.ready,
    steps: onboardingSteps,
    step: onboardingSteps[stepIndex],
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === onboardingSteps.length - 1,
    next,
    back,
    change,
    blur,
    submit,
    inputs,
  };
}

export type OnboardingFormController = ReturnType<typeof useOnboardingForm>;
