import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/config';
import type { CorporationResult, ProfileDetailsRequest } from './onboarding.types';

export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'protocol' | 'validation';
export class ApiError extends Error {
  constructor(public readonly kind: ApiErrorKind, message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function getMessage(value: unknown): string | undefined {
  return isRecord(value) && typeof value.message === 'string' && value.message.trim()
    ? value.message : undefined;
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); }
  catch { throw new ApiError('protocol', 'The service returned an unreadable response. Please try again.'); }
}

// The deadline includes reading the body, not only receiving response headers.
async function request<T>(path: string, init: RequestInit, signal: AbortSignal, read: (response: Response) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init, signal: controller.signal, credentials: 'omit', cache: 'no-store',
    });
    return await read(response);
  } catch (error) {
    if (timedOut) throw new ApiError('timeout', 'The request timed out.');
    if (signal.aborted) throw new ApiError('aborted', 'The request was cancelled.');
    if (error instanceof ApiError) throw error;
    throw new ApiError('network', 'The service could not be reached.');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export function checkCorporationNumber(number: string, signal: AbortSignal): Promise<CorporationResult> {
  return request(`/corporation-number/${encodeURIComponent(number)}`, { method: 'GET' }, signal, async response => {
    // Live API returns 404 + valid:false for an unknown corporation (verified 2026-11-19).
    if (!response.ok && response.status !== 404) {
      throw new ApiError('http', 'Corporation verification is unavailable. Please try again.', response.status);
    }
    const body = await readJson(response);
    if (!isRecord(body) || typeof body.valid !== 'boolean' ||
      ('corporationNumber' in body && body.corporationNumber !== number) ||
      (response.status === 404 && body.valid)) {
      throw new ApiError('protocol', 'The verification service returned an unexpected response. Please try again.');
    }
    if (body.valid) return { valid: true };
    const message = getMessage(body);
    if (!message) throw new ApiError('protocol', 'The verification service returned an unexpected response. Please try again.');
    return { valid: false, message };
  });
}

export function submitProfileDetails(payload: ProfileDetailsRequest, signal: AbortSignal): Promise<void> {
  return request('/profile-details', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }, signal, async response => {
    if (response.status === 200) return;
    if (response.status === 400) {
      let message: string | undefined;
      try { message = getMessage(await response.json()); } catch { /* Use the safe fallback. */ }
      throw new ApiError('validation', message ?? 'The service rejected these details. Please review them and try again.', 400);
    }
    throw new ApiError('http', 'Submission could not be confirmed. Please try again later.', response.status);
  });
}
