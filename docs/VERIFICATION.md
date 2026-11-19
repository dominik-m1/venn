# Implementation verification

Date: 2026-11-19. Environment: macOS arm64, Node.js 26.13.1 LTS, npm 11.20.0, Chromium 156.

## Automated checks

| Check                          | Result                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `npm ci`                       | Successful clean installation from the lockfile.           |
| `npm ls` and `npm ls --all`    | Valid dependency tree; no invalid peer dependencies.       |
| `npm run lint`                 | No errors or warnings, with `--max-warnings=0`.            |
| `npm run typecheck`            | Route type generation and strict TypeScript checks passed. |
| `npm run test:run`             | All 65 tests in 4 suites passed.                           |
| `npm run build`                | Production Turbopack build; SCSS and type checking worked. |
| `npm run start -- --port 3019` | Production server started and was checked in Chromium.     |

Installation, dependency-tree, lint, type, test, and build checks were repeated in a clean copy at `/private/tmp/venn-clean-7h8whd95`. Installation in that copy used only previously downloaded packages from the npm cache (`--offline`). All commands completed successfully.

The first build in the restricted sandbox stalled without further output. Only that process was stopped, and the build was retried outside the sandbox. It passed without configuration changes or disabled checks.

## Browser review

- Compared the 1280 × 900 desktop view with the mockup on page 4 of the PDF.
- Checked an actual 375 × 812 viewport; `innerWidth` and `scrollWidth` were both 375.
- Confirmed a single column for names on small screens.
- Checked Tab navigation and focus: a `solid` border, 3 px wide.
- Checked English labels, required fields, and error descriptions in the accessibility tree.
- Rejected the US number `+12025550123` on blur.
- Checked actual GET requests returning 404/invalid and 200/valid.
- Triggered Submit with Enter; after POST, success appeared and further submissions were blocked.
- Confirmed preflight 204 and CORS for origin `http://localhost:3019`.
- Simulated Offline mode: the message indicated that verification was unavailable, and fields remained editable.
- Checked the pending GET state and the ability to repeat verification.
- Temporarily changed `$radius-control`, built the application, and started it on port 3020. All four inputs and the button received 18 px instead of 12 px. The token was restored.
- Reviewed sources: no copies of colors or dimensions outside variables, no runtime fixtures, logs, or persistent data storage.

Concurrency tests use controlled promises and check request counts. Timeout tests control only the application's deadline. Tests use no arbitrary waits and do not depend on the QA API.

## Dependencies

The `latest` tag was checked for every direct dependency, the generator, and the additional Undici package before installation. `npm view` recorded versions, peer dependencies, and engines. Node.js LTS was selected from the official Node.js release index. ESLint and TypeScript exceptions are documented in the README.

The audit reported 18 moderate findings in development tooling. The underlying advisories concern:

- [glob: AbortSignal cancellation](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), range 9.0.0–14.0.1;
- [minimatch: globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249), range 7.0.0–11.0.0.

The remaining findings concern dependent packages in the Jest tree. Their declared version ranges were preserved. The registry proposed Jest 29 as an automatic fix. `npm audit fix --force` was not run.

`npm audit --omit=dev` confirmed **0 vulnerabilities** in runtime dependencies.

## Verification limits

Chromium was checked, without a full browser matrix or a formal WCAG audit. The PDF does not require these extensions. The live POST success response contained `OK`; empty success and POST 400 responses were tested with MSW. CORS for future hosting requires a separate check. Repository publication was left to the owner as requested.

## Update: Stepper and tab session draft

After adding controlled navigation and placeholders for steps 2–5, the following checks were repeated:

- Jest on Node.js 26.13.1: **97 tests in 9 suites**, all passing.
- ESLint with `--max-warnings=0`, TypeScript, and `format:check`: no errors.
- `next build --webpack` on Node.js 26.13.1: successful production build, SCSS compilation, and prerendering of `/`.

New tests cover step boundaries, preventing an unsubmitted profile from being skipped, placeholder navigation, heading focus, retention of edits and progress after remount, invalidation of success after editing, and no additional POST when returning to an unchanged profile. They also cover corrupt JSON, an unsupported draft version, invalid field types, an unknown step, blocked and full `sessionStorage`, Strict Mode, and hydration of server HTML with a different saved step. MSW supplies network responses in these tests; no new data was sent to the QA API. This update was verified automatically, without another Chromium review.

The default Turbopack build did not finish in the current environment: starting the SCSS worker required binding a local port, which returned `Operation not permitted`. An escalated attempt returned the same error. The Webpack build passed without changes to project configuration. The shell's default Node.js is 22.23.4; tests run with that runtime failed because of Undici compatibility. Successful tests and builds used the existing local `/private/tmp/node-v26.13.1-darwin-arm64/bin/node`.

## Update: code audit and cleanup

All application modules, tests, styles, configurations, the manifest, and the lockfile were reviewed before editing. TypeScript import analysis covered 39 source modules. It included App Router entry points, Jest configuration, setup, polyfills, tests, and Sass imports. No orphaned modules or cycles were found, including type imports. Project sources contain no dynamic imports or dependency-injection registry.

Every direct dependency has a consumer in sources, configuration, scripts, or tooling requirements. Retained packages include `ts-node`, used by Jest's TypeScript configuration loader, and `@testing-library/dom`, required by the testing libraries. Dependency metadata and the implementation plan remain historical documentation referenced by the README. No files or packages were removed, and dependency versions were unchanged.

Changes made:

- Replaced `Object.fromEntries(...) as FormValues` with explicit assignment of validated strings to typed draft values. Raw data, field order, defaults, and omission of unknown keys were preserved.
- Added a `satisfies` check so field names belong to the type derived from the Zod schema.
- Removed the redundant `ProfileDetailsRequest` alias and unused exports of internal `ApiErrorKind` and `OnboardingStepId` types. The types remain alongside their consumers; the feature's public interface is unchanged.
- Removed an unreachable step fallback after success: the constant tuple always contains step 2.
- Replaced two deferred-helper implementations and manual resolver capture in the page test with `Promise.withResolvers`. Test assertions were unchanged.
- Standardized imports, added checks for their order, duplicates, and cycles, and enabled `noUnusedLocals` and `noUnusedParameters`. Aliases, the feature boundary, component conventions, and the existing single Prettier ruleset were preserved.

Directories were not reorganized: the existing separation of model, HTTP, storage, hooks, and UI has clear responsibilities. Abort controllers and status refs were retained because they protect event ordering before the next render. Similar `isRecord` functions in HTTP and storage have different rules for accepting arrays; merging them would change behavior. Storage error handling and the POST 400 fallback message remain intentional and documented.

| Check                        | Result after changes                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`               | No errors or warnings, including the new import rules.                                                                     |
| `npm run format:check`       | All supported files conform to the single Prettier configuration.                                                          |
| `npm run typecheck`          | Next.js type generation and TypeScript checks passed.                                                                      |
| `npm run test:run`           | **135 tests in 9 suites**, all passing before and after changes.                                                           |
| `npm run build -- --webpack` | Production build, Sass, type checking, and prerendering passed before and after changes.                                   |
| `npm ls --all --offline`     | Exit 0; the local installation contains two extraneous optional Sharp/WASM packages, with no manifest or lockfile changes. |
| `git diff --check`           | No whitespace errors.                                                                                                      |

Commands used the local Node.js 26.13.1 runtime. A normal `npm run build` with Turbopack again stalled during compilation before editing and was interrupted. The final escalated attempt failed in the Sass worker: `binding to a port — Operation not permitted (os error 1)`. The successful build used Webpack; the default Turbopack build could not be verified in this environment. A working Webpack build was restored after that attempt.

The original code was built with the same Webpack setup in a separate copy of the baseline commit. The baseline and refactored production pages were started locally and compared in headless Brave/Chromium. Full-page screenshots are byte-for-byte identical at both viewports: **1280 × 900** and **375 × 812**. On the small screen, `innerWidth` and `scrollWidth` are both 375. Generated CSS rules, selectors, declarations, and media queries are the same; import sorting changed only the order of individual components' rules. Prerendered HTML is identical after excluding generated scripts and asset links.

An actual click on Submit with an empty form displayed the same four messages and moved focus to First Name. Existing MSW tests confirm GET/POST requests, navigation, hydration, draft persistence, errors, timeouts, late responses, and prevention of duplicate submissions. The QA API was not called again, and no data was sent to the backend. A full browser matrix and a new live CORS test were not performed.

The existing absence of `favicon.ico` was retained: both the baseline and resulting versions return 404, visible in the browser console. Functionality and UI assets were not changed to remove this warning. Historical dependency audit findings above were not rechecked against the registry or fixed during this refactoring.

## Update: English customer handoff

On 2026-11-19, reviewed tracked source files, tests, configuration, documentation, and the PDF text for Polish. The application interface, code comments, test descriptions, and source PDF were already in English. Translated the README, complete implementation plan, and verification report into English, including tables, checklists, diagram labels, and link text. Updated the architecture heading link and identified the plan as historical documentation.

Checked that requirement IDs, checklist states, non-diagram code blocks, and inline code were preserved during translation. The Canadian phone-number requirement remains consistent with the PDF; steps 2–5 remain placeholders.

The initial lint run found an unused ESLint directive inside generated coverage output. Added `coverage/**` to ESLint's global exclusions alongside other generated artifacts. Application source checks remain enabled.

Validation on Node.js 26.13.1: formatting, lint, type checks, all **135 tests in 9 suites**, and the production build with `npm run build -- --webpack` passed. The previously documented Turbopack environment limitation remains. No new live QA requests, dependency audit, browser review, publication, or deployment were performed for this documentation update.
