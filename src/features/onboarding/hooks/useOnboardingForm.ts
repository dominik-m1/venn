import { type SubmitEvent, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { ApiError, ApiErrorKind } from '@/features/onboarding/api/api-error';
import { submitProfileDetails } from '@/features/onboarding/api/onboarding.api';
import { onboardingSteps } from '@/features/onboarding/model/onboarding-flow';
import {
  CorporationStatus,
  type SubmissionState,
  SubmissionStatus,
} from '@/features/onboarding/model/onboarding-state';
import {
  type FieldName,
  fieldNames,
  onboardingSchema,
} from '@/features/onboarding/model/onboarding.schema';
import { useCorporationVerification } from './useCorporationVerification';
import { useOnboardingDraft } from './useOnboardingDraft';

type FieldErrors = Partial<Record<FieldName, string>>;

export function useOnboardingForm() {
  const {
    draft,
    getCurrent: getDraft,
    ready,
    update: updateDraft,
  } = useOnboardingDraft();
  const corporation = useCorporationVerification();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submission, setSubmission] = useState<SubmissionState>({
    status: SubmissionStatus.Idle,
  });
  const inputs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>(
    {},
  );
  // A ref blocks duplicate events immediately, before React renders busy state.
  const activeSubmission = useRef<AbortController | null>(null);
  const focusCorporation = useRef(false);
  const busy =
    submission.status === SubmissionStatus.Validating ||
    submission.status === SubmissionStatus.Submitting;
  const stepIndex = onboardingSteps.findIndex(({ id }) => id === draft.stepId);

  useEffect(() => {
    return () => {
      activeSubmission.current?.abort();
      activeSubmission.current = null;
    };
  }, []);

  useEffect(() => {
    // Wait until a rejected verification has re-enabled the input.
    if (
      submission.status === SubmissionStatus.Idle &&
      focusCorporation.current
    ) {
      focusCorporation.current = false;
      inputs.current.corporationNumber?.focus();
    }
  }, [submission]);

  function change(field: FieldName, value: string) {
    if (!ready || activeSubmission.current) {
      return;
    }

    updateDraft({ type: 'change', field, value });
    setSubmission({ status: SubmissionStatus.Idle });
    if (field === 'corporationNumber') {
      corporation.reset(value);
    }
  }

  function blur(field: FieldName) {
    if (!ready || getDraft().profileSubmitted || activeSubmission.current) {
      return;
    }

    const values = getDraft().values;
    const result = onboardingSchema.shape[field].safeParse(values[field]);
    const error = result.success ? undefined : result.error.issues[0]?.message;
    setFieldErrors((previous) => ({ ...previous, [field]: error }));
    if (field === 'corporationNumber' && !error) {
      void corporation.verify(values.corporationNumber);
    }
  }

  async function next() {
    if (!ready || activeSubmission.current) {
      return;
    }
    const current = getDraft();
    if (current.stepId !== onboardingSteps[0].id || current.profileSubmitted) {
      updateDraft({ type: 'next' });
      return;
    }
    const parsed = onboardingSchema.safeParse(current.values);
    if (!parsed.success) {
      setSubmission({ status: SubmissionStatus.Idle });
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
    setSubmission({ status: SubmissionStatus.Validating });

    try {
      const result = await corporation.verify(parsed.data.corporationNumber);
      if (!isCurrent()) {
        return;
      }
      if (result?.status !== CorporationStatus.Valid) {
        focusCorporation.current = true;
        setSubmission({ status: SubmissionStatus.Idle });
        return;
      }

      setSubmission({ status: SubmissionStatus.Submitting });
      await submitProfileDetails(parsed.data, controller.signal);
      if (!isCurrent()) {
        return;
      }
      updateDraft({ type: 'profile-submitted' });
      setSubmission({ status: SubmissionStatus.Idle });
    } catch (error) {
      if (!isCurrent()) {
        return;
      }
      setSubmission({
        status: SubmissionStatus.Error,
        message:
          error instanceof ApiError && error.kind === ApiErrorKind.Validation
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
    if (ready && !activeSubmission.current) {
      updateDraft({ type: 'back' });
    }
  }

  return {
    values: draft.values,
    fieldErrors,
    corporationCheck: corporation.check,
    submitStatus: draft.profileSubmitted
      ? SubmissionStatus.Success
      : submission.status,
    formError:
      submission.status === SubmissionStatus.Error ? submission.message : '',
    busy: !ready || busy,
    ready,
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
