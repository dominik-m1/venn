import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const parentImportRestriction = {
  regex: '(^|/)\\.\\.(/|$)',
  message: 'Use @/ aliases instead of parent-directory imports.',
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [parentImportRestriction] },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/onboarding/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            parentImportRestriction,
            {
              regex: '(^|/)features/onboarding/',
              message:
                'Use the public @/features/onboarding entry point. Internal modules belong to the feature.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
