import { type SubmitEvent, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  ApiError,
  submitProfileDetails,
} from '@/features/onboarding/api/onboarding.api';
import { onboardingSteps } from '@/features/onboarding/model/onboarding-flow';
import {
  type FieldName,
  fieldNames,
  onboardingSchema,
} from '@/features/onboarding/model/onboarding.schema';
import { useCorporationVerification } from './useCorporationVerification';
import { useOnboardingDraft } from './useOnboardingDraft';

type FieldErrors = Partial<Record<FieldName, string>>;
type SubmissionState =
  | { status: 'idle' | 'validating' | 'submitting' }
  | { status: 'error'; message: string };

export function useOnboardingForm() {
  const draft = useOnboardingDraft();
  const corporation = useCorporationVerification();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submission, setSubmission] = useState<SubmissionState>({
    status: 'idle',
  });
  const inputs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>(
    {},
  );
  // A ref blocks duplicate events immediately, before React renders busy state.
  const activeSubmission = useRef<AbortController | null>(null);
  const focusCorporation = useRef(false);
  const busy =
    submission.status === 'validating' || submission.status === 'submitting';
  const stepIndex = onboardingSteps.findIndex(
    ({ id }) => id === draft.draft.stepId,
  );

  useEffect(() => {
    return () => {
      activeSubmission.current?.abort();
      activeSubmission.current = null;
    };
  }, []);

  useEffect(() => {
    // Wait until a rejected verification has re-enabled the input.
    if (submission.status === 'idle' && focusCorporation.current) {
      focusCorporation.current = false;
      inputs.current.corporationNumber?.focus();
    }
  }, [submission]);

  function change(field: FieldName, value: string) {
    if (!draft.ready || activeSubmission.current) {
      return;
    }

    draft.update({ type: 'change', field, value });
    setSubmission({ status: 'idle' });
    if (field === 'corporationNumber') {
      corporation.reset(value);
    }
  }

  function blur(field: FieldName) {
    if (
      !draft.ready ||
      draft.getCurrent().profileSubmitted ||
      activeSubmission.current
    ) {
      return;
    }

    const values = draft.getCurrent().values;
    const result = onboardingSchema.shape[field].safeParse(values[field]);
    const error = result.success ? undefined : result.error.issues[0]?.message;
    setFieldErrors((previous) => ({ ...previous, [field]: error }));
    if (field === 'corporationNumber' && !error) {
      void corporation.verify(values.corporationNumber);
    }
  }

  async function next() {
    if (!draft.ready || activeSubmission.current) {
      return;
    }
    const current = draft.getCurrent();
    if (current.stepId !== onboardingSteps[0].id || current.profileSubmitted) {
      draft.update({ type: 'next' });
      return;
    }
    const parsed = onboardingSchema.safeParse(current.values);
    if (!parsed.success) {
      setSubmission({ status: 'idle' });
      const messages = z.flattenError(parsed.error).fieldErrors;
      const errors: FieldErrors = {};
      for (const field of fieldNames) {
        const message = messages[field]?.[0];
        if (message) {
          errors[field] = message;
        }
      }
      setFieldErrors(errors);
      const firstInvalid = fieldNames.find((field) => errors[field]);
      if (firstInvalid) {
        inputs.current[firstInvalid]?.focus();
      }
      return;
    }
    setFieldErrors({});

    const controller = new AbortController();
    activeSubmission.current = controller;
    const isCurrent = () => activeSubmission.current === controller;
    setSubmission({ status: 'validating' });

    try {
      const result = await corporation.verify(parsed.data.corporationNumber);
      if (!isCurrent()) {
        return;
      }
      if (result?.status !== 'valid') {
        focusCorporation.current = true;
        setSubmission({ status: 'idle' });
        return;
      }

      setSubmission({ status: 'submitting' });
      await submitProfileDetails(parsed.data, controller.signal);
      if (!isCurrent()) {
        return;
      }
      draft.update({ type: 'profile-submitted' });
      setSubmission({ status: 'idle' });
    } catch (error) {
      if (!isCurrent()) {
        return;
      }
      setSubmission({
        status: 'error',
        message:
          error instanceof ApiError && error.kind === 'validation'
            ? error.message
            : 'We could not confirm your submission. It may have been received. Check before submitting again.',
      });
    } finally {
      if (isCurrent()) {
        activeSubmission.current = null;
      }
    }
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    return next();
  }

  function back() {
    if (draft.ready && !activeSubmission.current) {
      draft.update({ type: 'back' });
    }
  }

  return {
    values: draft.draft.values,
    fieldErrors,
    corporationCheck: corporation.check,
    submitStatus: draft.draft.profileSubmitted ? 'success' : submission.status,
    formError: submission.status === 'error' ? submission.message : '',
    busy: !draft.ready || busy,
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
