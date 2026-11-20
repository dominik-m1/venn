import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { ApiError, ApiErrorKind } from '@/features/onboarding/api/api-error';
import {
  type CorporationResult,
  checkCorporationNumber,
} from '@/features/onboarding/api/onboarding.api';
import {
  type CorporationCheck,
  CorporationStatus,
} from '@/features/onboarding/model/onboarding-state';
import { useCorporationVerification } from './useCorporationVerification';

jest.mock('@/features/onboarding/api/onboarding.api', () => ({
  ...jest.requireActual('@/features/onboarding/api/onboarding.api'),
  checkCorporationNumber: jest.fn(),
}));

const checkNumber = jest.mocked(checkCorporationNumber);

it.each(['success', 'failure'])(
  'ignores a cancelled %s after editing back to the same number',
  async (outcome) => {
    // Deliberately ignore AbortSignal to exercise stale-result protection.
    const oldRequest = Promise.withResolvers<CorporationResult>();
    const currentRequest = Promise.withResolvers<CorporationResult>();
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
      if (outcome === 'success') {
        oldRequest.resolve({ valid: true });
      } else {
        oldRequest.reject(new ApiError(ApiErrorKind.Network, 'Late failure'));
      }
      expect(await oldCheck).toBeNull();
    });
    expect(result.current.check).toEqual({
      status: CorporationStatus.Checking,
      number,
    });

    // A stale request's cleanup must leave the newer request shareable.
    expect(result.current.verify(number)).toBe(currentCheck);
    expect(checkNumber).toHaveBeenCalledTimes(2);

    await act(async () => {
      currentRequest.resolve({ valid: false, message: 'Current result' });
      await currentCheck;
    });
    expect(result.current.check).toEqual({
      status: CorporationStatus.Invalid,
      number,
      message: 'Current result',
    });
  },
);

it('discards a response that arrives after unmount even if cancellation is ignored', async () => {
  const request = Promise.withResolvers<CorporationResult>();
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
