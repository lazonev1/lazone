# Accessible shared button defaults — U01/U02 slice

## Problem

The shared `@lazone/ui` button rendered white normal-size text on orange and light green surfaces, below the 4.5:1 normal-text contrast threshold. Small buttons had no minimum target, disabled state used opacity blending, and controls had no explicit accessible role/name/state. The button also requested an OpenSans font that the root app does not load.

## Change

`packages/ui/src/buttonTokens.ts` defines tested text/surface pairs. Primary blue is unchanged; secondary remains orange with dark text; success remains green with a darker surface and white text. Disabled controls use an opaque neutral pair instead of blending unpredictably into their parent surface.

| Default variant | Text contrast |
| --- | --- |
| Primary | 7.11:1 |
| Secondary | 8.05:1 |
| Success | 5.40:1 |
| Disabled | 6.15:1 |

`Button.tsx` applies 48-unit minimum targets, flexible wrapping text and the system font, accessible names/hints and disabled/busy state. An optional `loading` state shows a spinner and prevents activation. Existing labels, variants, handlers, and size props remain supported. Custom color/size overrides remain the caller's responsibility; this is not a claim that every screen passes accessibility review.

## Verification

`test:buttons` loads the actual tokens/component with mocked native primitives. It calculates WCAG relative luminance/contrast without rounding the pass threshold, tests all nine variant/size combinations, flexible label structure, disabled/loading handler protection, custom accessibility props, and inactive color precedence. CI runs the test. TypeScript and focused package lint pass.

iOS and Android production JavaScript exports also pass; these do not substitute for device layout/accessibility checks.

The contrast baseline is [WCAG normal-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The 48-unit target is the project's conservative cross-platform design choice, not a claim that WCAG's web minimum is 48; see [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Native large-text/layout/VoiceOver/TalkBack validation remains required while Simulator control is unavailable. U01's app-wide tokens/theme consistency and U02's journey-level accessibility remain open. No Firebase deployment, migration, native dependency, or EAS rebuild is required.
