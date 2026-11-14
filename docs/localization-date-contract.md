# Localization/date contract — U04 and E04 slice

## What changed

Message-list timestamps used the phone locale even when the app language differed. The date-divider helper also identified yesterday by subtracting 24 hours from local midnight, which is not a calendar-day comparison across daylight-saving changes. Typing and own-message previews were hardcoded in English.

```text
App language → shared pure date helpers → message-list timestamps / date dividers
             → translated Typing / You previews
EN + FR JSON → CI contract check → missing keys/placeholders fail the PR
```

`utils/dateFormatting.ts` separates locale selection and calendar-date arithmetic from native localization. Existing presentation adapters retain their public function signatures and resolve the current app language when called. Invalid dates return blank text rather than “Invalid Date”; prior-year dates include the year. Calendar labels use local calendar dates, including daylight-saving boundaries. User-entered message content is not translated.

`test:localization` validates every locale namespace/leaf, nonempty string values, matching interpolation variables, malformed placeholders, actual i18next rendering and plurals, English/French date behavior, invalid inputs, prior-year labels, and spring/fall DST cases. Synthetic broken-resource cases prove the gate catches defects. CI runs it without native modules or Firebase access.

## Evidence and scope

- 638 keys per language pass parity/interpolation/runtime checks.
- Actual date helper and presentation-adapter tests pass; TypeScript passes. The adapter retains one existing lazy-native-import lint warning.
- iOS and Android production JavaScript bundle exports pass; these are not native UX verification.
- This does not finish all U04/E04 work: app-start language initialization, remaining hardcoded UI/server copy, full locale formatting, and iOS/Android runtime language-switch checks remain open. Native verification is not claimed while Simulator control times out.
- No rules, schema, database migration, Firebase deployment, native dependency, or EAS rebuild changes are needed.
