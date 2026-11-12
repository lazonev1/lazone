# Truthful account email display — A02 slice

The account screen gets its sign-in email from Firebase Auth. The edit popup previously offered an email input but never included it in the save payload. A user could therefore see a success message even though their apparent email edit did nothing.

```text
Firebase Auth email → account screen → selectable read-only email in popup
Name/contact-phone edits → existing updateProfile → existing save/error handling
```

The popup now shows the actual passed Auth email as selectable text, with a read-only label and an English/French explanation that sign-in email changes require a separate verification flow. There is no email input or discarded email draft. Empty-email accounts remain supported. Name/contact-phone validation and writes are unchanged; this is not a new credential-change, phone-login, or account-linking flow.

`test:account-email` exercises the real component with native/auth doubles: no editable email field, selectable/current email and empty fallback, both translations, exact unchanged name/phone save keys, and retained drafts on failed saves. CI runs it. TypeScript passes; focused lint retains the pre-existing popup reset-effect dependency warning. Native UI verification remains pending while Simulator access is unavailable.

iOS and Android production JavaScript exports pass; those are compilation checks, not native UI sign-off.

Broader A02 verification/reauthentication/password/avatar work and A04 phone login remain open. No Firebase rules/config/deployment, migration, native dependency, or EAS rebuild is needed.
