# Conventions — catnip-expansion

## abilities.js two-phase teleport

Teleport trigger sets `cat.activeAbility = 'teleport_fade'` (fade-out phase, 0.3 s). On expiry, `_repositionCatRandom` is called and state switches to `'teleport_appear'` (0.15 s). On expiry of appear phase, `cat.activeAbility = null`.

Any code that tests for active teleport must handle BOTH states:
- Render overlay: `abilityActive === 'teleport_fade' || abilityActive === 'teleport_appear'`
- Shield check in `checkCollisions`: only tests `=== 'shield'` — no change needed
- Pending ability queue: `cat.activeAbility` will be `'teleport_fade'` or `'teleport_appear'` during teleport — not `'teleport'`

## State field: cat.pendingAbility

`cat.pendingAbility` (string | null) queues the next ability to fire when the current one expires. Set when the cat reaches a higher speed tier while an ability is already active. Cleared when the current ability expires and the pending one activates. Lives on the cat object in `state.run.cat`, initialized to `null` in `resetRunState`.

## Explosive zone field names

Explosion zones use `radius` (not `r`) for the radius field: `{ x, y, radius, age, lifetime }`. All consumers — `updateExplosionZones` (cat hit test) and `drawExplosionZones` (render) — must use `zone.radius`.

## Multiball accepted deviations

- Spread: ±30° (MULTIBALL_SPREAD = Math.PI/6), not ±15° — wider for visual clarity
- Speed: 100% of parent speed, not 80% — accepted
- Child bounces: inherited from parent (not reset to 0) — accepted to prevent infinite chain
