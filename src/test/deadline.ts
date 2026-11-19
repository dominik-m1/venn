import { REQUEST_TIMEOUT_MS } from '@/config';

// Control only the application's deadline. MSW 3 and Undici still need Node timers
// with unref(), which jsdom's simulated browser timers cannot provide.
export function captureDeadline() {
  const nativeTimeout = globalThis.setTimeout;
  let expire: (() => void) | undefined;
  const timer = jest.spyOn(globalThis, 'setTimeout').mockImplementation((handler, timeout, ...args) => {
    if (timeout === REQUEST_TIMEOUT_MS) expire = () => handler(...args);
    return nativeTimeout(handler, timeout, ...args);
  });
  return {
    expire() {
      if (!expire) throw new Error('No application deadline has been scheduled.');
      expire();
    },
    restore: () => timer.mockRestore(),
  };
}
