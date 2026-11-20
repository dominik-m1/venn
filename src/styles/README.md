# Styling conventions

This is the authoritative guide for application styles. Read it before changing
SCSS, CSS Module classes, or shared design values. The
[verification report](../../docs/VERIFICATION.md) records checks and environment
limitations; conventions belong here only.

## Architecture and methodology

Use **CSS Modules with BEM naming**, backed by the existing Sass token and mixin
API. Modules provide isolation; BEM makes ownership and variants explicit.

Use the existing dependency order, inspired by ITCSS:

1. Settings: `_variables.scss`, which emits no CSS.
2. Tools: `_mixins.scss`, which emits CSS only when included.
3. Reset and base: `_reset.scss`, then `src/app/globals.scss`.
4. Components: colocated `*.module.scss` files in the Atomic Design directories.

This is a dependency model, not a new set of directories or CSS `@layer` rules.
Keep loading order and specificity stable. Do not depend on the relative loading
order of different component modules. The reset is loaded once by `globals.scss`;
only `src/app/layout.tsx` imports that global entry point.

BEM fits the existing component boundaries. Full ITCSS directories would add
little to this small application. SMACSS state/layout categories would duplicate
module ownership. OOCSS ideas already inform `control-base`; do not add global
object classes or component inheritance just to follow another methodology.

## Names and ownership

One module owns one block. Its block matches its kebab-case filename:

| Concern                                | Convention                                | Real example                                      |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Component                              | `block-name`                              | `.onboarding-form`, `.icon-button`                |
| Internal element                       | `block-name__element-name`                | `.form-field__control`                            |
| Variant/state without native semantics | `block-name--modifier-name`               | `.field-message--error`                           |
| Element variant, when needed           | `block-name__element-name--modifier-name` | No current use                                    |
| Layout owned by a component            | Same block/element rules                  | `.onboarding-template__card`                      |
| Native state                           | Pseudo-class or ARIA attribute            | `.input[aria-invalid='true']`, `.button:disabled` |

Use lowercase words separated by hyphens, one optional `__element`, and one
optional `--modifier`. Elements describe ownership, not DOM depth:
`onboarding-form__messages`, never `onboarding-form__feedback__messages`.
Apply a modifier alongside its base class; the modifier contains only differences.

Declare the block once per stylesheet and nest its elements and modifiers using
Sass `&` notation. Keep elements directly under the block rather than repeating
the namespace or mirroring DOM depth.

SCSS examples in this guide import `./index`, relative to this file, so each
example can be checked independently. Application styles use
`@use '@/styles' as design;`.

```scss
@use './index' as design;

.form-field {
  &__control {
    position: relative;
  }

  &__message {
    position: absolute;
  }
}

.field-message {
  &:empty {
    display: none;
  }

  &--error {
    color: design.$color-danger;
  }
}
```

These compile to independent BEM classes such as `.form-field__control`, with
no descendant selector or extra specificity. Do not write
`.form-field { .form-field__control { ... } }`, which changes the selector.

CSS Modules are the namespace. Do not add `c-`, `l-`, `is-`, or theme prefixes.
Do not create global utility classes; reuse tokens and mixins instead. There is
currently no utility or theme class system to extend. Keep layouts with their
owning template/component rather than adding a second global layout namespace.

Use module exports exactly as written, without camelCase aliases or dynamically
constructed keys:

```tsx
<div className={styles['form-field__control']}>
  <Input />
</div>
```

`FieldMessage` applies both `styles['field-message']` and, conditionally,
`styles['field-message--error']`. Single-word exports such as `styles.button`
remain valid.

Style classes are private implementation details. Use native DOM references,
IDs for label/ARIA relationships, and accessible queries in tests. If a DOM
integration needs a hook, use a dedicated `data-*` attribute, never generated
CSS Module names. Preserve any external selector contract before renaming it.

## Files and public Sass API

```text
src/styles/
  README.md        # conventions
  _variables.scss  # design values, no emitted CSS
  _mixins.scss     # reusable declaration groups and responsive rules
  _index.scss      # CSS-free public API via @forward
  _reset.scss      # intentional global reset
src/app/globals.scss
src/components/atoms/Input/
  index.tsx
  input.module.scss
```

Keep the existing atoms/molecules/organisms/templates/pages hierarchy. Add styles
beside the component, not to a global catch-all stylesheet. All consumers use
`@use '@/styles' as design;`, represented here by the guide-relative import:

```scss
@use './index' as design;

.input {
  @include design.control-base;
  background: design.$color-surface;
  color: design.$color-text;
  min-width: 0;
}
```

Only foundations import other foundation partials directly. Do not use Sass
`@import`, unnamespaced `@use ... as *`, `@extend`, or CSS Modules `:global`.
Do not forward the reset through `_index.scss`: that would make the shared API
emit global CSS for every consumer. Keep imports explicit and above rules.

## Tokens, mixins, and functions

`_variables.scss` owns colors, typography, spacing, radii, dimensions, focus,
disabled opacity, the breakpoint, and viewport height. Preserve existing token
names, including `$space-025`, and their values. A token name is not permission
to replace a different value with something approximately similar.

Use `design.$space-3`, `design.$radius-control`, and other existing tokens when
they express the intended role and have exactly the required value. Structural
values such as `0`, `100%`, `auto`, `inherit`, `transparent`, grid fractions, and
`repeat(2, minmax(0, 1fr))` belong in the component. Keep local calculations such
as `calc(100% + design.$space-025)` local.

Before adding a token, search `_variables.scss` and its usages. Add one there only
for a new design decision that needs a shared source; give it a semantic or
existing scale-based kebab-case name. Check all consumers before changing a token.
Do not create component-local Sass variables, a parallel TypeScript palette, or
a second CSS custom-property token source. New literal lengths and colors in
consumer styles require an explicit design-foundation decision, not a lint disable.

There are currently no shadows, z-index scale, transitions, animations, Sass
functions, placeholders, or themes. Do not invent these foundations speculatively.
If a feature needs one, define shared design values here and export genuinely
reusable tools through `_index.scss`. Do not add dark-mode behavior as cleanup.

Reuse `control-base` for input/button geometry and `focus-ring` for keyboard
focus. `control-base` already includes `focus-ring`; do not include both on the
same control. Include these at the block root because focus emits a nested
`:focus-visible` rule. A mixin should capture a coherent shared responsibility,
not a single trivial declaration. Preserve the existing three-pixel focus ring.

## Responsive styles, nesting, and cascade

Use the existing argumentless `design.respond-to` mixin. It is inclusive at
`max-width: 36rem`; do not change the boundary or replace it with a nearby value.
Keep responsive overrides after base declarations, as in `OnboardingTemplate`:

```scss
@use './index' as design;

.onboarding-template {
  &__card {
    padding: design.$space-4;
  }

  @include design.respond-to {
    &__card {
      padding: design.$space-3;
    }
  }
}
```

Prefer nested `&__element` and `&--modifier` source notation while keeping the
compiled BEM selectors flat. Allow at most two nesting levels: block → element
or modifier → pseudo-class, pseudo-element, attribute state, or the documented
direct child. A responsive mixin may wrap the block's `&__element` overrides at
the end of the block; do not move each override beside its base rule if that
changes emitted rule order. Nesting is not permission to add descendant chains.
Maximum specificity is `0,3,0`, needed by the existing `:hover:not(:disabled)`
selectors. No IDs,
`!important`, qualifying types (`input.input`), or chains of descendant selectors.
Allow at most one combinator and one type selector per component selector.

The intentional exception is `.onboarding-form__submission > button`: the form
owns the direct submit child's top margin. Keep its specificity `0,1,1` and native
child relationship; do not reach into the Button module. Likewise, the template
passes its spacing class through Stepper's `className` prop rather than styling
Stepper's private descendants. Do not expand these boundaries casually.

Preserve `:empty` visibility, ARIA error states, disabled cursors/opacity, focus,
and the feedback `::before` sizing mechanism. The latter reserves the space for
wrapped feedback and prevents layout shifts; it is not unused CSS.

```scss
@use './index' as design;

// Incorrect: leaks ownership, duplicates a token, and increases specificity.
.card .header .title {
  color: #111;
}

// Incorrect: alternate naming schemes for the existing form element.
.formHeading {
  margin-bottom: 0.5rem;
}
.form_heading {
  margin-bottom: 0.5rem;
}

// Correct: an owned element with an exact existing token.
.onboarding-form {
  &__heading {
    margin-bottom: design.$space-1;
  }
}
```

## Checks and change workflow

1. Read this guide, the component, its callers, and relevant token/mixin consumers.
2. Keep the existing UI contract. Rename classes per component with all TSX and
   runtime references. Do not construct module export keys at runtime or
   search-replace blindly.
3. Run `npm run lint` (ESLint plus Stylelint), `npm run format:check`,
   `npm run typecheck`, `npm run test:run`, and `npm run build`.
4. Check compiled CSS and module references. Compare before/after screenshots at
   identical sizes and states, especially both sides of the breakpoint. Include
   empty/error, hover/focus, pending/disabled, success, and restored steps.
5. Report browser/build limitations and unverified states explicitly.

`npm run lint:styles` runs Stylelint independently. It uses the recommended SCSS
correctness preset; Prettier remains the only formatter. Project rules enforce
BEM against each module's filename, including resolved Sass `&` selectors,
specificity/nesting limits, `&`-based nested selectors, no duplicate selectors,
module isolation, token-based
lengths/colors, namespaced Sass, and responsive mixin use. The SCSS-aware class
rule replaces the core CSS class rule because Sass concatenates selector names.
The preset's Sass handling is retained: descending-specificity diagnostics do
not understand that `:disabled` and `:hover:not(:disabled)` cannot overlap. Our
specificity budget and CSS/browser comparisons cover that concern without
reordering disjoint rules to satisfy a heuristic.

Lint cannot prove visual equivalence, detect all unused classes, or verify every
arbitrary CSS value. Tests mock SCSS imports. A passing lint/test run therefore
does not replace compiled-CSS and browser verification.
