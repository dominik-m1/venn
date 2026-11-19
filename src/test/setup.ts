import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  jest.restoreAllMocks();
});
afterAll(() => server.close());
