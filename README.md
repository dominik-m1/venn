# Onboarding Form

The form specified in `task.pdf`, built with Next.js App Router, React, and strict TypeScript. It includes four required fields, validation on blur and submit, and direct integration with the QA API. The interface is in English, as shown in the mockup.

## Getting started

Required: Node.js **26.13.1 LTS** and npm **11.20.0** (bundled with this Node.js release).

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The application does not require an `.env` file. The optional `NEXT_PUBLIC_API_BASE_URL` setting is documented in [.env.example](.env.example). Changing a public environment variable requires a new build.

For production:

```sh
npm run build
npm run start
```

To use another port: `npm run start -- --port 3019`.

## Quality checks

```sh
npm ci
npm ls
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run start
```

`npm run lint` runs ESLint and SCSS linting with zero warnings allowed. Run `npm run lint:styles` for Stylelint alone. The [styling guide](src/styles/README.md) defines the enforced architecture and naming rules.

`npm run format` formats project files with Prettier. `npm run format:check` checks formatting without writing changes. Shared rules in `.prettierrc.json` specify two-space indentation, single quotes in TypeScript, semicolons, and a target line length of 80 characters. `.prettierignore` excludes generated files and artifacts.

`npm test` runs Jest, and `npm run test:watch` watches for changes. `typecheck` generates Next.js types first, so it works before the first build. ESLint runs independently of the build. Tests use `next/jest`, RTL, `user-event`, and MSW 3. They do not call the QA API.

TypeScript also checks `noUnusedLocals` and `noUnusedParameters`. ESLint requires type imports, prevents duplicate imports and cycles, and orders imports by source: Node.js modules, packages, project aliases, and local modules. Paths and named imports are sorted alphabetically. Imports containing only types use `import type`; types from a module also imported as a value use the `type` modifier in the same import. These rules come from the existing Next.js configuration; no formatting plugins were added.

The ESLint rule `curly: ['error', 'all']` requires braces for all conditionals and loops, including those with a single statement. Prettier places the bodies of these blocks on separate lines.

Tests cover validation boundaries, phone format and country, HTTP contracts, field accessibility, and the complete form. They check shared GET requests, GET/POST ordering, stale responses, duplicate submissions, empty success responses, failures, timeouts, and unmounting. Form tests render the actual atoms and molecules, including in React Strict Mode. Separate verification-hook tests check late responses when cancellation is ignored, including after returning to a previous number.

MSW 3 uses `msw/http` imports and the `onUnhandledFrame: 'error'` option. The Jest configuration transforms its ESM dependencies through SWC. `polyfills.ts` supplies Web APIs, Undici fetch, and native Node.js timers. Timeout tests control only the application's request deadline; they do not replace the MSW/Undici network clock.

Concurrency tests use native `Promise.withResolvers`, available in the specified Node.js runtime. Undici is loaded through `require` only after Web APIs are configured; an earlier value import would change the test environment's initialization order.

Jest mocks SCSS imports. The build verifies Sass compilation; appearance, focus, responsiveness, and CORS were checked in Chromium. See the [verification report](docs/VERIFICATION.md) for details and environment limitations.

## Architecture

| Layer                          | Responsibility                                                                |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `src/app`                      | Server route entry points, layout, and global styles.                         |
| `components/pages`             | Client composition of the onboarding screen and its steps.                    |
| `components/templates`         | Background, step indicator, card, and a slot for `children`.                  |
| `components/organisms`         | Client `OnboardingForm`, field composition, and state presentation.           |
| `components/molecules`         | `FormField`: label, input, description, and ARIA associations.                |
| `components/atoms`             | Native `Input`, `Label`, `FieldMessage`, and `Button`.                        |
| `features/onboarding/index.ts` | Public feature interface: hook, form controller, field type, and UI statuses. |
| `features/onboarding/model`    | Domain types, pure validation rules, and data normalization.                  |
| `features/onboarding/api`      | HTTP, deadlines, cancellation, response checks, and error categories.         |
| `features/onboarding/hooks`    | React state, form events, and verification/submission lifecycles.             |
| `features/onboarding/storage`  | Reading, validating, and saving a versioned `sessionStorage` draft.           |
| `src/test`                     | Test environment and fixtures, excluded from the application.                 |

Each component in `atoms`, `molecules`, `organisms`, `templates`, and `pages` has its own PascalCase directory. Its implementation is in `index.tsx`, with its SCSS Module and existing tests alongside it, using kebab-case filenames:

```text
src/components/
  atoms/
    Input/
      index.tsx
      input.module.scss
  molecules/
    FormField/
      index.tsx
      form-field.module.scss
      form-field.test.tsx
```

The `index.tsx` file contains the component implementation and export. Custom component props use a named local `type Props`, following `FormField`. Imports outside the current directory use the `@/` alias, for example `@/components/atoms/Input`; local styles, tests, and modules in the same directory may use `./`. ESLint prohibits imports containing a `..` path segment.

Buttons containing only an icon use the `IconButton` atom. It accepts any icon as `children`, requires `aria-label`, hides the decorative icon from screen readers, and defaults to `type="button"`. It forwards native props and `ref`, combines `className` with shared styles, and defines hover, focus, and disabled states. `Stepper` uses it for arrows; labels, actions, and navigation boundaries remain in the molecule.

Atoms and molecules do not know business rules or the API. The template receives content as `children` and step configuration for the `Stepper` molecule. `src/app` contains route entry points, layout, and global styles. The page and layout remain synchronous Server Components. The client `components/pages/OnboardingPage` creates one controller and connects the template, form, and placeholders; its integration test is in the same directory. This `pages` layer belongs to the Atomic Design component structure. `OnboardingForm` receives the controller through props; it does not create a second copy of state.

The feature has one form controller, two hooks for independent browser lifecycles, and small modules for schemas, navigation, HTTP, and storage. Unit tests sit alongside the code they check; full-form tests remain with the organism.

```text
src/features/onboarding/
  index.ts
  api/
    api-error.ts
    http.ts
    onboarding.api.ts
    onboarding.api.test.ts
  model/
    onboarding.schema.ts
    onboarding.schema.test.ts
    onboarding-flow.ts
    onboarding-flow.test.ts
    onboarding-state.ts
  hooks/
    useOnboardingForm.ts
    useOnboardingDraft.ts
    useCorporationVerification.ts
    useCorporationVerification.test.ts
  storage/
    onboarding-storage.ts
    onboarding-storage.test.ts
```

Components import only the feature's public interface:

```ts
import { useOnboardingForm, type FieldName } from '@/features/onboarding';
```

`index.ts` exports only what consumers need. ESLint blocks imports of internal paths from outside the feature. Within the feature, import internal modules directly through `@/features/onboarding/...`, or `./` for the same directory; importing the feature's own `index.ts` would create a circular dependency. Changing how a path is written does not bypass the public interface boundary.

Start with the module that owns the behavior you want to change:

| Change                                                           | Module                                |
| ---------------------------------------------------------------- | ------------------------------------- |
| Field rules or payload normalization                             | `model/onboarding.schema.ts`          |
| Blur/submit timing, loading, focus, or submission errors         | `hooks/useOnboardingForm.ts`          |
| Corporation verification, cancellation, or in-flight GET sharing | `hooks/useCorporationVerification.ts` |
| Step order or progress transitions                               | `model/onboarding-flow.ts`            |
| Shared lifecycle statuses and state contracts                    | `model/onboarding-state.ts`           |
| Endpoint behavior or response schemas                            | `api/onboarding.api.ts`               |
| Request deadlines, cancellation wiring, or JSON decoding         | `api/http.ts`                         |
| API error categories and error contract                          | `api/api-error.ts`                    |
| Draft decoding or persistence                                    | `storage/onboarding-storage.ts`       |
| Hydration and saving edits before reload                         | `hooks/useOnboardingDraft.ts`         |

The data flow is:

```text
Raw React state → Zod safeParse → parsed payload → corporation GET → profile POST
```

`onboardingSchema` owns field validation and trims names in its output. `FormValues` uses `z.input` for raw editable values; `ProfileDetails` uses `z.output` for the submission payload. Types live beside the schema, and field names come from its keys. Blur validates only the relevant field; submit parses the complete form and sends `result.data`. React keeps the original input, including outer whitespace. The remaining custom refinements check Canadian phone validity and UTF-16 lengths: Zod 4.6 built-in string limits count Unicode code points, which differ from the specified units. Required and format checks use built-in Zod methods and preserve error precedence.

`useOnboardingForm` owns the entire submit operation and its loading/error state. Its active-request ref blocks duplicate events before React renders and prevents late results from updating an unmounted form. Successful progress comes from the draft's `profileSubmitted` marker. Only confirmed success advances to step 2; returning to an unchanged profile does not POST again, and editing invalidates that progress.

`useCorporationVerification` handles blur checks independently. It shares only in-flight GET requests for the same number, so submit waits for an existing check or starts a fresh one after a completed check. Editing cancels the old request and clears its result. Request identity rejects late responses even after editing back to the same number or when the transport ignores cancellation. The hooks cancel their requests on unmount.

`model/onboarding-state.ts` owns the shared corporation/submission status objects and discriminated state types. Hooks implement their lifecycles; UI components receive the same status definitions through the feature entry point. The model imports neither React nor HTTP code. Required error messages and allowed statuses stay checked, and the returned `submitStatus` retains its literal union instead of widening to `string`. Reducer actions remain beside the navigation reducer. Hook-private types, such as an in-flight request record, stay with the hook.

The API modules separate three responsibilities. `api-error.ts` defines `ApiErrorKind` and `ApiError`, shared by transport, endpoints, and hooks. `http.ts` handles request deadlines, cancellation, JSON decoding, and transport failures. `onboarding.api.ts` owns endpoint requests, response schemas, and HTTP/business-result interpretation. Hooks import the error contract directly rather than obtaining it through an endpoint module. These are feature-local modules, without a global client registry or another service layer.

Name and corporation-number length limits are local schema constants shared by the checks and their messages. The fixed Canadian phone pattern stays readable in the schema. The request timeout remains in `src/config.ts`; the storage key and draft version remain beside persistence. Repeated title/feedback IDs are local to `OnboardingForm`, keeping their ARIA references paired.

API responses and saved drafts also use Zod. Response schemas live beside their endpoints; HTTP status handling, deadlines, and request/response correlation remain in the adapter. The draft schema uses per-field recovery to retain incomplete edits. No form library, global store, or generic validation framework is needed.

The `onboardingSteps` list in `model/onboarding-flow.ts` is the sole configuration for step order and count. A pure reducer bounds navigation and prevents advancement before profile submission. Steps 2–5 share a placeholder with Back/Continue; the final step offers only Back because the actual screens and process completion have not been defined. Changing steps moves focus to the heading, and `Stepper` exposes progress through ARIA.

`useOnboardingDraft` reads a versioned draft from `sessionStorage` after hydration and saves changes synchronously in event handlers. The draft contains raw field values, the step ID, and a confirmed profile-submission marker; it excludes errors and verification results. The marker tracks UI progress only and is not an authorization mechanism. Restoration checks the version, known field types, step, and local validity of a submitted profile. Corrupt JSON or an incompatible version produces an empty form; invalid progress returns to step 1; unavailable or full storage leaves a working in-memory state. Restoration never sends requests automatically. Tab session storage was chosen to survive refreshes without retaining personal data indefinitely or sharing it across all tabs through `localStorage`.

The external API is responsible for validating POST data at its own trust boundary. This repository contains no application backend or Server Action; client validation and the preliminary corporation GET cannot replace server validation.

## Design system

The authoritative [styling guide](src/styles/README.md) covers CSS Modules with BEM naming, the shared Sass API, token usage, responsive rules, and automatic enforcement. The [verification report](docs/VERIFICATION.md) records checks and environment limitations. Keep conventions in the styling guide instead of duplicating them here.

## Product rules and assumptions

- The specified form is implemented as step 1, with placeholders for steps 2–5. Labels and navigation come from the step configuration; the PDF does not describe subsequent screens.
- Names are required and limited to 50 UTF-16 code units after `trim()`. Diacritics, apostrophes, hyphens, and internal spaces are accepted. `maxLength` is not used, to avoid truncation and preserve the limit after normalization.
- Phone numbers require `+1` followed by ten ASCII digits, with no spaces or separators. `libphonenumber-js/max` must confirm validity and country `CA`; the `+1` prefix alone is insufficient. Numbers with an undetermined country are rejected. This Canadian-number rule comes from the supplied specification.
- Corporation numbers must contain exactly nine characters. There is no local digits-only requirement; the API determines validity. Leading zeros are preserved.
- Errors appear on blur or submit. Without a draft, the form starts empty and without errors. Refreshing restores fields and progress in the same tab. Submit remains available so users can trigger validation.
- HTTP 200 indicates POST success without parsing the body. Data is retained and onboarding advances to step 2. An HTTP 400 message is rendered as text at form level.
- The deadline is 10 seconds, including body reading. A missing POST confirmation does not prove that data was not saved. The application never retries POST automatically.
- Data is not written to logs or URLs. The draft is saved in the tab's `sessionStorage`, without `localStorage`. Requests use `credentials: 'omit'`. Runtime code imports neither fixtures nor a list of valid corporations.

## Live integration

Verified on **November 19, 2026**, using the production application in Chromium from origin `http://localhost:3019`:

| Operation                            | Result                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- |
| GET for a valid corporation from PDF | HTTP 200, `{corporationNumber, valid: true}`.                          |
| GET `000000000`                      | HTTP **404**, `{valid: false, message: 'Invalid corporation number'}`. |
| POST preflight                       | HTTP 204, allowing POST and the `content-type` header.                 |
| POST with test data from PDF         | HTTP 200, text `OK`; the form displayed success.                       |
| CORS                                 | `Access-Control-Allow-Origin: *`; GET and POST work in the browser.    |

**Deviation from A12:** an invalid corporation returns 404. The adapter treats this status as a business result only when the body contains a valid `valid: false` result and message. Other HTTP errors and incompatible structures indicate integration failures. No proxy or backend was added.

MSW tests confirm empty HTTP 200 success responses and POST 400 responses. The live POST returned `OK`; an empty body was not observed from the live server. CORS was confirmed for the stated origin; future hosting requires its own check.

## Versions and compatibility

Versions, `peerDependencies`, and `engines` were read using `npm view` on **2026-11-19**. The `latest` tags were checked for prereleases. All direct versions are exact; `package-lock.json` pins the complete tree. Recorded results: [dependencies.json](docs/dependencies.json), [compatibility.json](docs/compatibility.json).

| Package                           | Installed version                 |
| --------------------------------- | --------------------------------- |
| Next.js / eslint-config-next      | 16.4.6                            |
| React / React DOM                 | 19.3.1                            |
| TypeScript                        | **6.0.3**                         |
| Sass                              | 1.108.2                           |
| ESLint                            | **9.39.5**                        |
| Jest / jest-environment-jsdom     | 30.5.2                            |
| RTL / DOM / user-event / jest-dom | 16.3.3 / 10.4.2 / 14.6.13 / 8.0.0 |
| MSW                               | 3.0.7                             |
| libphonenumber-js                 | 1.13.17                           |
| Zod                               | 4.6.7                             |
| @types/node                       | 26.6.6                            |
| @types/react / @types/react-dom   | 19.3.0                            |
| @types/jest / ts-node / Undici    | 30.0.0 / 10.9.2 / 8.12.4          |

Exceptions reflect actual peer dependencies rather than an older configuration:

1. `typescript@latest` was 7.0.2, but the latest `typescript-eslint@8.73.0` supported `<6.1.0`. The latest compatible TypeScript, 6.0.3, was selected. Sources: the [official compatibility table](https://typescript-eslint.io/users/dependency-versions/) and npm metadata.
2. `eslint@latest` was 10.15.0. The import, jsx-a11y, and react plugins used by Next.js declared support only through ESLint 9. The latest compatible version, 9.39.5, was selected. The registry marked that release line as unsupported. Sources: the [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/package.json) and [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import/blob/main/package.json) manifests, npm metadata, and `npm ls --all`.

No `--force`, `--legacy-peer-deps`, overrides, or disabled quality checks were used.

The recorded `npm audit` reported 18 moderate findings in the Jest tooling tree (glob/minimatch and dependent packages). The registry suggested downgrading Jest to 29, contrary to the choice of the latest compatible release. The latest Jest was retained; no transitive package upgrades were forced. These findings do not affect the runtime tree. See the verification report for details.
