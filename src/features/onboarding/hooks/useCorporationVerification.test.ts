import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import {
  ApiError,
  checkCorporationNumber,
  type CorporationResult,
} from '@/features/onboarding/api/onboarding.api';
import {
  useCorporationVerification,
  type CorporationCheck,
} from './useCorporationVerification';

jest.mock('@/features/onboarding/api/onboarding.api', () => ({
  ...jest.requireActual('@/features/onboarding/api/onboarding.api'),
  checkCorporationNumber: jest.fn(),
}));

const checkNumber = jest.mocked(checkCorporationNumber);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

it.each(['success', 'failure'])(
  'ignores a cancelled %s after editing back to the same number',
  async (outcome) => {
    // Deliberately ignore AbortSignal to exercise stale-result protection.
    const oldRequest = deferred<CorporationResult>();
    const currentRequest = deferred<CorporationResult>();
    checkNumber
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(currentRequest.promise);
    const { result } = renderHook(() => useCorporationVerification(), {
      wrapper: StrictMode,
    });
    const number = '123456789';
    let oldCheck!: Promise<CorporationCheck | null>;
    let currentCheck!: Promise<CorporationCheck | null>;

    act(() => {
      oldCheck = result.current.verify(number);
      result.current.reset('987654321');
      result.current.reset(number);
      currentCheck = result.current.verify(number);
    });
    expect(checkNumber.mock.calls[0][1].aborted).toBe(true);
    expect(checkNumber.mock.calls[1][1].aborted).toBe(false);

    await act(async () => {
      if (outcome === 'success') oldRequest.resolve({ valid: true });
      else oldRequest.reject(new ApiError('network', 'Late failure'));
      expect(await oldCheck).toBeNull();
    });
    expect(result.current.check).toEqual({ status: 'checking', number });

    // A stale request's cleanup must leave the newer request shareable.
    expect(result.current.verify(number)).toBe(currentCheck);
    expect(checkNumber).toHaveBeenCalledTimes(2);

    await act(async () => {
      currentRequest.resolve({ valid: false, message: 'Current result' });
      await currentCheck;
    });
    expect(result.current.check).toEqual({
      status: 'invalid',
      number,
      message: 'Current result',
    });
  },
);

it('discards a response that arrives after unmount even if cancellation is ignored', async () => {
  const request = deferred<CorporationResult>();
  checkNumber.mockReturnValueOnce(request.promise);
  const { result, unmount } = renderHook(() => useCorporationVerification(), {
    wrapper: StrictMode,
  });
  let verification!: Promise<CorporationCheck | null>;
  act(() => {
    verification = result.current.verify('123456789');
  });

  unmount();
  expect(checkNumber.mock.calls[0][1].aborted).toBe(true);
  request.resolve({ valid: true });
  expect(await verification).toBeNull();
});
