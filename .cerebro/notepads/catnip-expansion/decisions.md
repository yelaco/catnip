# Catnip Expansion — Architecture Decisions

## Task #21: slow-mo artifact + dash ability interaction

**Decision: Option B — dash window exempt from slow-mo speed cap.**

`getEffectiveCatSpeedCap(state)` in `js/abilities.js`:
```js
function getEffectiveCatSpeedCap(state) {
  if (state.run.cat.activeAbility === 'dash') return C.CAT_MAX_SPEED; // uncapped during dash
  const artifact = state.persistent.equipped.artifactId;
  if (artifact === 'artifact-slow-mo') return C.CAT_INITIAL_SPEED * 2.5;
  return C.CAT_MAX_SPEED;
}
```

- Shield and teleport remain subject to slow-mo cap.
- Only the 0.5s dash window is exempted.
- Rationale: slow-mo is runaway-prevention, not ability suppressor; player seeing no dash effect reads as a bug.
- Decided by Cerebro, communicated via Cyclops.
