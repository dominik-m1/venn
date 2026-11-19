import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  checkCorporationNumber,
} from '@/features/onboarding/api/onboarding.api';
import type { CorporationCheck } from '@/features/onboarding/model/onboarding.types';

type PendingCheck = {
  number: string;
  controller: AbortController;
  promise: Promise<CorporationCheck | null>;
};

export function useCorporationVerification() {
  const [check, setCheck] = useState<CorporationCheck>({
    status: 'idle',
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
    setCheck({ status: 'idle', number });
  }

  function verify(number: string): Promise<CorporationCheck | null> {
    const active = pending.current;
    if (active?.number === number) return active.promise;

    cancelPending();
    const controller = new AbortController();
    setCheck({ status: 'checking', number });

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
          ? { status: 'valid', number }
          : { status: 'invalid', number, message: response.message };
      } catch (error) {
        if (
          !isCurrent() ||
          (error instanceof ApiError && error.kind === 'aborted')
        )
          return null;

        result = {
          status: 'unavailable',
          number,
          message:
            'We could not verify this corporation number. Please try again.',
        };
      }

      if (!isCurrent()) return null;
      setCheck(result);
      return result;
    })().finally(() => {
      if (isCurrent()) pending.current = null;
    });

    pending.current = { number, controller, promise };
    return promise;
  }

  return { check, reset, verify };
}
