# Scrollable, accessible selectors — U03 slice

## Problem and change

Booking service selection and provider category selection share `SelectList`. It rendered every option directly inside a height-limited modal without a scroll container. Long lists could therefore put the last choices outside the reachable area.

```text
Before: open selector → bounded modal → unscrollable mapped rows → last options clipped
After:  open selector → safe-area-aware modal → bounded virtualized list
                                             → scroll → choose any option → close
```

The shared control now uses `FlatList`, reactive screen/theme sizing, bottom safe-area padding, flexible long labels, and 48-unit option/close targets. English/French placeholder, empty, close, and opening-hint copy is localized. The trigger exposes its current value and expanded/disabled states; options expose radio/checked states; errors are alerts. Modal show/dismiss focus callbacks, Android Back, and accessibility escape are wired.

## Verification

`pnpm --filter ./apps/mobile test:selectors` transpiles and tests the actual component with mocked native primitives. It verifies 200 options, last-item selection, viewport bounds, selected/disabled/error states, close/back/escape handlers, focus callbacks, and EN/FR copy. CI runs this test. TypeScript and focused ESLint pass.

This is handler/structure regression coverage, not proof of actual scrolling or VoiceOver/TalkBack behavior. Native small-screen, landscape, large-text, scroll, keyboard, and focus checks remain required; Simulator UI access currently times out. U03/U02 remain open. No Firebase/rules/schema/native dependency or EAS build change is required.
