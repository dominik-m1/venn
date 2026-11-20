import { z } from 'zod';
import type { ProfileDetails } from '@/features/onboarding/model/onboarding.schema';
import { ApiError, ApiErrorKind } from './api-error';
import { readJson, request } from './http';

const messageSchema = z.string().regex(/\S/);
const errorResponseSchema = z.object({ message: messageSchema });
const corporationResponseSchema = z.discriminatedUnion('valid', [
  z.object({
    valid: z.literal(true),
    corporationNumber: z.string().optional(),
  }),
  z.object({
    valid: z.literal(false),
    message: messageSchema,
    corporationNumber: z.string().optional(),
  }),
]);

export type CorporationResult = z.infer<typeof corporationResponseSchema>;

export function checkCorporationNumber(
  number: string,
  signal: AbortSignal,
): Promise<CorporationResult> {
  return request(
    `/corporation-number/${encodeURIComponent(number)}`,
    { method: 'GET' },
    signal,
    async (response) => {
      // Live API returns 404 + valid:false for an unknown corporation (verified 2026-11-19).
      if (!response.ok && response.status !== 404) {
        throw new ApiError(
          ApiErrorKind.Http,
          'Corporation verification is unavailable. Please try again.',
          response.status,
        );
      }
      const result = corporationResponseSchema.safeParse(
        await readJson(response),
      );
      if (
        !result.success ||
        (result.data.corporationNumber !== undefined &&
          result.data.corporationNumber !== number) ||
        (response.status === 404 && result.data.valid)
      ) {
        throw new ApiError(
          ApiErrorKind.Protocol,
          'The verification service returned an unexpected response. Please try again.',
        );
      }
      return result.data.valid
        ? { valid: true }
        : { valid: false, message: result.data.message };
    },
  );
}

export function submitProfileDetails(
  payload: ProfileDetails,
  signal: AbortSignal,
): Promise<void> {
  return request(
    '/profile-details',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    signal,
    async (response) => {
      if (response.status === 200) {
        return;
      }
      if (response.status === 400) {
        let message: string | undefined;
        try {
          const result = errorResponseSchema.safeParse(
            await readJson(response),
          );
          if (result.success) {
            message = result.data.message;
          }
        } catch {
          /* Use the safe fallback. */
        }
        throw new ApiError(
          ApiErrorKind.Validation,
          message ??
            'The service rejected these details. Please review them and try again.',
          400,
        );
      }
      throw new ApiError(
        ApiErrorKind.Http,
        'Submission could not be confirmed. Please try again later.',
        response.status,
      );
    },
  );
}
