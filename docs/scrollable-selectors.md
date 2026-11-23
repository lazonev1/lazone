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

On 2026-11-23, the installed iPhone 15 Plus build loaded this branch against existing provider data. The booking-service modal opened, selected the published service, closed, and showed the selected label and matching price in the unsent request form. In the provider-registration form, the category modal displayed all ten options; the last option (Fitness) selected, remained checked on reopening, and the close button preserved the draft. No booking or provider profile was submitted.

These native checks do not prove long-list touch scrolling or VoiceOver/TalkBack behavior. The simulator gesture controller failed on scroll; the iPhone SE app loaded but its guest session could not reach the authenticated forms. Small-screen, landscape, large-text, long-list scroll, keyboard, and focus checks remain required; U03/U02 stay open. No Firebase/rules/schema/native dependency or EAS build change is required.
