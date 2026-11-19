import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });
const config: Config = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  clearMocks: true,
  coverageProvider: 'v8',
};

async function jestConfig() {
  const resolved = await createJestConfig(config)();
  // MSW 3 ships ESM. Keep Next's SWC transformer and transform its ESM dependencies.
  resolved.transformIgnorePatterns = [
    '/node_modules/(?!(msw|@msw|@mswjs|@open-draft|until-async|strict-event-emitter|outvariant|is-node-process|rettime|cookie)/)',
  ];
  const swcTransform = Object.values(resolved.transform ?? {})[0];
  resolved.transform = { '^.+\\.(js|jsx|ts|tsx|mjs)$': swcTransform };
  return resolved;
}
export default jestConfig;
