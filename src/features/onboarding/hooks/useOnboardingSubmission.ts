import { useEffect, useRef, useState } from 'react';
import { ApiError, submitProfileDetails } from '../api/onboarding.api';
import type {
  CorporationCheck,
  FormValues,
  SubmitStatus,
} from '../model/onboarding.types';
import { toProfileDetailsRequest } from '../model/validation';

type SubmissionState =
  | { status: 'idle'; verificationFailed?: true }
  | { status: 'validating' | 'submitting' | 'success' }
  | { status: 'error'; message: string };

type VerifyCorporation = (number: string) => Promise<CorporationCheck | null>;

function isBusy(status: SubmitStatus) {
  return status === 'validating' || status === 'submitting';
}

export function useOnboardingSubmission(verifyCorporation: VerifyCorporation) {
  const [state, setState] = useState<SubmissionState>({ status: 'idle' });
  const status = useRef<SubmitStatus>('idle');
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, []);

  function transition(next: SubmissionState) {
    // Event handlers need the latest status before React renders again.
    status.current = next.status;
    setState(next);
  }

  function canEdit() {
    return !isBusy(status.current);
  }

  function canSubmit() {
    return canEdit() && status.current !== 'success';
  }

  function reset() {
    if (canEdit()) transition({ status: 'idle' });
  }

  async function submit(values: FormValues) {
    if (!canSubmit()) return;

    const payload = toProfileDetailsRequest(values);
    const controller = new AbortController();
    active.current = controller;
    const isCurrent = () => active.current === controller;
    transition({ status: 'validating' });

    try {
      const result = await verifyCorporation(payload.corporationNumber);
      if (!isCurrent()) return;
      if (result?.status !== 'valid') {
        transition({ status: 'idle', verificationFailed: true });
        return;
      }

      transition({ status: 'submitting' });
      await submitProfileDetails(payload, controller.signal);
      if (isCurrent()) transition({ status: 'success' });
    } catch (error) {
      if (!isCurrent()) return;
      transition({
        status: 'error',
        message:
          error instanceof ApiError && error.kind === 'validation'
            ? error.message
            : 'We could not confirm your submission. It may have been received. Check before submitting again.',
      });
    } finally {
      if (isCurrent()) active.current = null;
    }
  }

  return {
    status: state.status,
    error: state.status === 'error' ? state.message : '',
    busy: isBusy(state.status),
    verificationFailed: state.status === 'idle' && !!state.verificationFailed,
    canEdit,
    canSubmit,
    reset,
    submit,
  };
}
