# Issues — catnip-expansion

## Resolved: >= vs > boundary condition in abilities.js (2026-05-25)

Cyclops flagged `ratio >= C.ABILITY_TIER_DASH` in `updateAbilities` as incorrect after BUG-4 fix. Cyclops expected `ability=null` (or shield only) at slow-mo cap speed; dash triggering was called FAIL.

**Resolution:** Confirmed `>` (strict). With slow-mo cap = exactly 2.5× = ABILITY_TIER_DASH, `ratio = 2.5` exactly at cap, and `2.5 > 2.5` is false — dash suppressed. `2.5 > 2.0` is true — shield triggers. Project linter enforced this as correct. README updated to reflect "only shield triggers" under slow-mo.

## Resolved: Wolverine context-loss (2026-05-25)

Wolverine entered a context-loss loop replaying TASK_RESULT for already-completed tasks (#9, #12, #19) in the final session. Cerebro applied the final abilities.js restoration directly. Root cause: long-running session with large context caused Wolverine to lose track of completed task state. Mitigation: for future plans, break ability logic into smaller tasks with explicit completion receipts.

## Known Deviations (accepted)

- Multiball spread: ±30° (plan: ±15°) — wider spread accepted for visual clarity
- Multiball children inherit parent bounces (plan: fresh 0) — accepted to prevent infinite chain at high bounce counts
- Multiball speed: 100% of parent (plan: 80%) — accepted
- No P-key pause state — Esc→MENU provides effective pause
