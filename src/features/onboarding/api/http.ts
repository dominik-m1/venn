import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/config';
import { ApiError, ApiErrorKind } from './api-error';

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      ApiErrorKind.Protocol,
      'The service returned an unreadable response. Please try again.',
    );
  }
}

// The deadline includes reading the body, not only receiving response headers.
export async function request<T>(
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
      throw new ApiError(ApiErrorKind.Timeout, 'The request timed out.');
    }
    if (signal.aborted) {
      throw new ApiError(ApiErrorKind.Aborted, 'The request was cancelled.');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      ApiErrorKind.Network,
      'The service could not be reached.',
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
