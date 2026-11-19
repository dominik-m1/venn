import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  jest.restoreAllMocks();
});
afterAll(() => server.close());
