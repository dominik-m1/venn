import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  submitProfileDetails,
} from '@/features/onboarding/api/onboarding.api';
import type { FormValues } from '@/features/onboarding/model/onboarding.types';
import { toProfileDetailsRequest } from '@/features/onboarding/model/validation';
import type { CorporationCheck } from './useCorporationVerification';

type SubmissionState =
  | { status: 'idle'; verificationFailed?: true }
  | { status: 'validating' | 'submitting' | 'success' }
  | { status: 'error'; message: string };

type SubmitStatus = SubmissionState['status'];
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
    if (canEdit()) {
      transition({ status: 'idle' });
    }
  }

  async function submit(values: FormValues): Promise<boolean> {
    if (!canSubmit()) {
      return false;
    }

    const payload = toProfileDetailsRequest(values);
    const controller = new AbortController();
    active.current = controller;
    const isCurrent = () => active.current === controller;
    transition({ status: 'validating' });

    try {
      const result = await verifyCorporation(payload.corporationNumber);
      if (!isCurrent()) {
        return false;
      }
      if (result?.status !== 'valid') {
        transition({ status: 'idle', verificationFailed: true });
        return false;
      }

      transition({ status: 'submitting' });
      await submitProfileDetails(payload, controller.signal);
      if (!isCurrent()) {
        return false;
      }
      transition({ status: 'success' });
      return true;
    } catch (error) {
      if (!isCurrent()) {
        return false;
      }
      transition({
        status: 'error',
        message:
          error instanceof ApiError && error.kind === 'validation'
            ? error.message
            : 'We could not confirm your submission. It may have been received. Check before submitting again.',
      });
      return false;
    } finally {
      if (isCurrent()) {
        active.current = null;
      }
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
