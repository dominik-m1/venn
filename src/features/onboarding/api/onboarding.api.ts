import { z } from 'zod';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/config';
import type { ProfileDetails } from '@/features/onboarding/model/onboarding.schema';

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

type ApiErrorKind =
  'network' | 'timeout' | 'aborted' | 'http' | 'protocol' | 'validation';
export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      'protocol',
      'The service returned an unreadable response. Please try again.',
    );
  }
}

// The deadline includes reading the body, not only receiving response headers.
async function request<T>(
  path: string,
  init: RequestInit,
  signal: AbortSignal,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) {
    abort();
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
    return await read(response);
  } catch (error) {
    if (timedOut) {
      throw new ApiError('timeout', 'The request timed out.');
    }
    if (signal.aborted) {
      throw new ApiError('aborted', 'The request was cancelled.');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('network', 'The service could not be reached.');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

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
          'http',
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
          'protocol',
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
          'validation',
          message ??
            'The service rejected these details. Please review them and try again.',
          400,
        );
      }
      throw new ApiError(
        'http',
        'Submission could not be confirmed. Please try again later.',
        response.status,
      );
    },
  );
}
