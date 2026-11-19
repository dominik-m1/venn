import { globSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const word = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
const bemSuffix = `(?:__${word})?(?:--${word})?`;
const consumerFiles = [
  'src/components/**/*.module.scss',
  'src/app/globals.scss',
];

const stylelintConfig = {
  // Correctness and architecture here; formatting belongs to Prettier.
  extends: ['stylelint-config-recommended-scss'],
  ignoreFiles: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
  ],
  rules: {
    // The SCSS rule resolves &__element and &--modifier before checking names.
    'selector-class-pattern': null,
    'scss/selector-class-pattern': [
      `^${word}${bemSuffix}$`,
      { resolveNestedSelectors: true },
    ],
    // Block -> BEM element/modifier -> native state or direct child.
    'max-nesting-depth': 2,
    'selector-nested-pattern': '^&(?:__|--|:|\\[|\\s*>|$)',
    'selector-max-specificity': '0,3,0',
    'selector-max-id': 0,
    'selector-max-combinators': 1,
    'declaration-no-important': true,
    'no-duplicate-selectors': true,
    'at-rule-disallowed-list': ['import', 'extend'],
    'scss/at-use-no-unnamespaced': true,
    'scss/no-duplicate-dollar-variables': true,
    'scss/dollar-variable-pattern': `^${word}$`,
    'scss/at-mixin-pattern': `^${word}$`,
    'scss/at-function-pattern': `^${word}$`,
    'scss/media-feature-value-dollar-variable': 'always',
  },
  overrides: [
    {
      files: consumerFiles,
      rules: {
        'color-no-hex': true,
        'color-named': 'never',
        'scss/no-dollar-variables': true,
        // Structural values (0, 100%, auto, fr, inherit) remain local.
        'declaration-property-value-disallowed-list': {
          '/.*/': [
            '/\\b[0-9.]+(?:px|rem|em|vh|svh|vw)\\b/',
            '/\\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\\(/',
          ],
        },
      },
    },
    {
      files: ['src/components/**/*.module.scss'],
      rules: {
        'at-rule-disallowed-list': ['import', 'extend', 'media'],
        'selector-disallowed-list': ['/:global/'],
        'selector-no-qualifying-type': true,
        'selector-max-type': 1,
      },
    },
    // A module owns exactly one block, named after its kebab-case filename.
    ...globSync('src/components/**/*.module.scss', { cwd: root }).map(
      (file) => ({
        files: [file],
        rules: {
          'scss/selector-class-pattern': [
            `^${basename(file, '.module.scss')}${bemSuffix}$`,
            { resolveNestedSelectors: true },
          ],
        },
      }),
    ),
  ],
};

export default stylelintConfig;
