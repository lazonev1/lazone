# Enforced lint baseline — E04 slice

CI previously ran ESLint with warnings allowed but no warning budget. A PR could add warnings indefinitely and still pass.

```text
ESLint JSON report → reject every error/fatal diagnostic
                   → count warnings by file + rule
                   → compare with reviewed develop baseline
                   → fail any new/increased bucket; permit cleanup
```

`pnpm --filter ./apps/mobile lint:ci` first tests the comparator, then runs the real lint scan and compares it with `scripts/lint-baseline.json`. The baseline records the 52 existing warnings from develop at implementation time; it does not suppress them or claim they are acceptable for release. `pnpm ... lint` remains available for the full detailed warning list.

The gate is deliberately file/rule-count-based rather than line-based so ordinary code movement does not break it. A warning moved to a different file or a new rule is rejected. Replacing one warning with another of the same rule in the same file at the same count is not detected; code review and eventual warning cleanup remain necessary. Counts may shrink without failing. When cleaning up debt, lower the corresponding baseline entry or remove it; do not regenerate/increase the baseline just to make CI pass. Any intentional increase must be explicit in a reviewed PR with a reason and follow-up.

Tests cover retained/reduced counts, increases, new rules/files, errors/fatal diagnostics, malformed reports, outside-root paths, and invalid baselines. Actual lint-baseline and TypeScript checks pass. No native app code, dependencies, Firebase configuration, rules, schema, or deployment changes are involved, so native rebuilds and device tests are not applicable to this gate.

This completes only E04's enforced lint-baseline slice. Resolving the existing warnings and broader component/native/security/release journey coverage remain open.
