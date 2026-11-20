import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, ApiErrorKind } from '@/features/onboarding/api/api-error';
import { checkCorporationNumber } from '@/features/onboarding/api/onboarding.api';
import {
  type CorporationCheck,
  CorporationStatus,
} from '@/features/onboarding/model/onboarding-state';

type PendingCheck = {
  number: string;
  controller: AbortController;
  promise: Promise<CorporationCheck | null>;
};

export function useCorporationVerification() {
  const [check, setCheck] = useState<CorporationCheck>({
    status: CorporationStatus.Idle,
    number: '',
  });
  const pending = useRef<PendingCheck | null>(null);

  const cancelPending = useCallback(() => {
    pending.current?.controller.abort();
    pending.current = null;
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  function reset(number: string) {
    cancelPending();
    setCheck({ status: CorporationStatus.Idle, number });
  }

  function verify(number: string): Promise<CorporationCheck | null> {
    const active = pending.current;
    if (active?.number === number) {
      return active.promise;
    }

    cancelPending();
    const controller = new AbortController();
    setCheck({ status: CorporationStatus.Checking, number });

    // Identity also rejects an old response when the user edits A → B → A.
    const isCurrent = () => pending.current?.controller === controller;
    const promise = (async (): Promise<CorporationCheck | null> => {
      let result: CorporationCheck;
      try {
        const response = await checkCorporationNumber(
          number,
          controller.signal,
        );
        result = response.valid
          ? { status: CorporationStatus.Valid, number }
          : {
              status: CorporationStatus.Invalid,
              number,
              message: response.message,
            };
      } catch (error) {
        if (
          !isCurrent() ||
          (error instanceof ApiError && error.kind === ApiErrorKind.Aborted)
        ) {
          return null;
        }

        result = {
          status: CorporationStatus.Unavailable,
          number,
          message:
            'We could not verify this corporation number. Please try again.',
        };
      }

      if (!isCurrent()) {
        return null;
      }
      setCheck(result);
      return result;
    })().finally(() => {
      if (isCurrent()) {
        pending.current = null;
      }
    });

    pending.current = { number, controller, promise };
    return promise;
  }

  return { check, reset, verify };
}
