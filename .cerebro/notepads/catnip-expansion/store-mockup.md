# Store Screen UI Mockup

## Canvas dimensions
1000 × 700 px (same as gameplay canvas). All coordinates below are in logical CSS pixels.

---

## Visual language (matching existing game)

- Background: same `drawBackground()` starfield as menu/settings — dark `#0d0d0f` + animated stars
- Font: `'Segoe UI', system-ui, sans-serif`
- Panel glass: `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.10)` border, `borderRadius 10`
- Active/hover tint: `rgba(99,102,241,0.28)` fill, `#818cf8` border, `shadowBlur 18 shadowColor #6366f1`
- Primary accent: `#6366f1` (indigo)
- Gold accent: `#ffd700` (coin label)
- Error red: `#f87171`
- Success green: `#a3e635`
- Muted text: `#a0a0b0`

---

## Layout regions (all coordinates approximate)

```
┌─────────────────────────────────────────────────────── 1000 ──┐
│  TOP BAR (y 0–52)                                              │
│  [← Back]  STORE                       [coin icon] Coins: N   │
├───────────────────────────────────────────────────────────────┤
│  TAB STRIP (y 52–102)                                          │
│  [ Cats ]  [ Balls ]  [ Arenas ]  [ Artifacts ]               │
├───────────────────────────────────────────────────────────────┤
│  CARD GRID (y 102–580)                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │
│  │ PREVIEW │  │ PREVIEW │  │ PREVIEW │   row 1 (y 120–290)     │
│  │  name   │  │  name   │  │  name   │                        │
│  │  price  │  │ LOCK 🔒 │  │ LOCK 🔒 │                        │
│  └─────────┘  └─────────┘  └─────────┘                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │
│  │ PREVIEW │  │ PREVIEW │  │ PREVIEW │   row 2 (y 300–470)     │
│  │  name   │  │  name   │  │  name   │                        │
│  │  price  │  │  price  │  │ LOCK 🔒 │                        │
│  └─────────┘  └─────────┘  └─────────┘                        │
├───────────────────────────────────────────────────────────────┤
│  FOOTER ACTION BAR (y 580–648)                                 │
│  [  Buy — 25 coins  ]  or  [ Equip ]  or  [ Equipped ✓ ]      │
├───────────────────────────────────────────────────────────────┤
│  KEYBOARD HINT (y 655–680)                                     │
│  ← → ↑ ↓ navigate · Enter buy/equip · Esc back                │
└───────────────────────────────────────────────────────────────┘
```

Toast notification region: top-right, `x 720, y 60`, 260 × 48 px rounded rect.

---

## Region specifications

### Top bar (y 0–52)

| Element | Position | Details |
|---|---|---|
| Back button | `x 16, y 8, w 100, h 36` | `roundRect r 8`; same style as existing `drawBackButton`; "← Back" |
| Title "STORE" | `x W/2, y 26` | `bold 28px`, centered, `#e8e8e8`, `shadowBlur 10 #6366f1` |
| Coin icon | `x 870, y 26` | Small circle r 10, fill `#ffd700`, `shadowBlur 8 #ffd700` |
| Coin label | `x 888, y 26` | `"Coins: N"`, `bold 18px`, `#ffd700`, right-aligned to x 984 |
| Divider | `y 52` | Horizontal line `rgba(255,255,255,0.08)` full width |

### Tab strip (y 52–102)

Four equal-width tabs across `x 0–1000`, height 50 px.

- Tab width: 250 px each (`Cats | Balls | Arenas | Artifacts`)
- Inactive: `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.08)` bottom border 1 px
- Active tab: `rgba(99,102,241,0.22)` fill, `#6366f1` bottom border 3 px, text `#e0e7ff bold`
- Hover: `rgba(99,102,241,0.14)` fill
- Font: `18px`, inactive color `#a0a0b0`

### Card grid (y 102–580)

3 columns × 2 rows max (up to 6 cards per tab; scroll not needed — max catalog size is 4 per category so always ≤ 4 cards; center the grid).

Card layout for N cards:
- For N ≤ 3: single row, centered. For N = 4: 3+1 (row 1 has 3, row 2 has 1 centered).

Card dimensions: **280 × 160 px** with 20 px gap.
Grid x origin: `(W - (numCols * 280 + (numCols-1) * 20)) / 2`
Grid y origin: `120`

**Card anatomy (280 × 160):**

```
┌───────────────────────────────────────┐
│  PREVIEW AREA (280 × 90)              │  Canvas mini-render (cat/ball/arena chip)
│  dim overlay + lock icon if locked    │
├───────────────────────────────────────┤
│  Item name            16px #e8e8e8    │  y offset +100
│  [coin icon] Price    13px #ffd700    │  y offset +120  (or "Free" if price 0)
│  [MILESTONE text]     12px #a0a0b0    │  y offset +138  (only if has milestone)
└───────────────────────────────────────┘
```

Card states:

| State | Fill | Border | Shadow |
|---|---|---|---|
| Normal (unlocked, unequipped) | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.10)` | none |
| Hovered | `rgba(255,255,255,0.07)` | `rgba(255,255,255,0.20)` | `shadowBlur 8 #6366f1` |
| Focused (keyboard) | `rgba(99,102,241,0.20)` | `#818cf8` | `shadowBlur 18 #6366f1` |
| Equipped | `rgba(99,102,241,0.16)` | `#6366f1` 2px | `shadowBlur 12 #6366f1` |
| Locked (not purchased) | `rgba(0,0,0,0.25)` dim overlay on preview | `rgba(255,255,255,0.08)` | none |
| Milestone-locked | Same as locked + milestone text in amber `#fb923c` |

Lock icon (locked cards): centered on preview area, white padlock glyph, `globalAlpha 0.6`.

Preview renders:
- **Cat skin**: draw cat at canvas center of preview area, scale `r = 32`, apply skin palette
- **Ball skin**: draw ball trail arc in preview area using ball skin colors, r = 10
- **Arena**: draw a 280 × 90 miniature of the arena background + wall tint color swatch
- **Artifact**: draw the artifact icon (canvas primitive glyph matching artifact type)

### Footer action bar (y 580–648)

Single centered button, 280 × 52 px, `roundRect r 10`.

Button states based on selected card:

| Condition | Label | Fill | Border | Text color |
|---|---|---|---|---|
| Item already equipped | `"Equipped ✓"` | `rgba(99,102,241,0.12)` | `#6366f1` dashed | `#818cf8` |
| Unlocked, not equipped | `"Equip"` | `rgba(99,102,241,0.28)` | `#818cf8` | `#e0e7ff bold` |
| Not unlocked, can afford | `"Buy — N coins"` | `rgba(99,102,241,0.28)` | `#818cf8` | `#e0e7ff bold` |
| Not unlocked, cannot afford | `"Buy — N coins"` | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.08)` | `#606070` |
| Milestone-locked | `"Locked"` | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.08)` | `#606070` |
| No card selected | button hidden | — | — | — |

Coin deduction preview: when Buy is active (affordable), show `-N` in small `#f87171` text below the button: `"You have M coins → M-N remaining"`.

### Toast region (x 720, y 60, w 260, h 48)

Appears above tab strip at top-right. Auto-dismisses after 2 s (alpha fade last 0.5 s).

| Toast type | Fill | Border | Text |
|---|---|---|---|
| Success (purchased/equipped) | `rgba(34,197,94,0.22)` | `#4ade80` | `#a3e635` |
| Error (insufficient funds) | `rgba(239,68,68,0.22)` | `#f87171` | `#f87171` |
| Info (already equipped) | `rgba(148,163,184,0.18)` | `rgba(255,255,255,0.18)` | `#a0a0b0` |

Max 1 toast visible at a time; new toast replaces old.

### Keyboard hint (y 655–680)

```
← → ↑ ↓ navigate cards · Tab switch category · Enter buy/equip · Esc back
```

Centered, `13px`, `rgba(160,160,176,0.45)` — identical style to menu keyboard hint.

---

## Draw function signature

```js
function drawStore(ctx, state) { ... }
```

`state.ui.storeLayout` will carry: `focusedTab`, `hoveredItemId`, `focusedItemId`, `toast`.

---

## Interaction model (for reference, nav implemented by Wolverine)

- **Mouse click on tab** → change `focusedTab`, reset `focusedItemId` to first item
- **Mouse click on card** → set `focusedItemId`
- **Mouse click on Buy/Equip button** → call `Catnip.store.buy(id)` or `Catnip.store.equip(id)`
- **Arrow keys (Left/Right)** → move `focusedItemId` within row; wrap at edges
- **Arrow keys (Up/Down)** → move `focusedItemId` between rows
- **Tab key** → cycle `focusedTab` forward
- **Shift+Tab** → cycle `focusedTab` backward
- **Enter** → activate Buy or Equip on focused card
- **Esc** → return to MENU

---

## Z-draw order within drawStore

1. `drawBackground(now)` — starfield (reuse existing)
2. Divider line
3. Top bar (back button, title, coin display)
4. Tab strip
5. Card grid (panel → preview → text → lock overlay)
6. Footer action bar
7. Keyboard hint
8. Toast (top layer)

---

## Open questions for Cerebro

1. **Artifact icon glyphs**: should each artifact use a distinct canvas-drawn icon (paw, iron-claw fist, hourglass)? Or a colored circle with a letter abbreviation? Recommendation: distinct glyphs (low complexity, keeps store visually rich).
2. **Arena preview**: full miniature background render vs. just a color swatch with the arena name. Recommendation: color swatch + wall-color strip for simplicity; full render risks performance on every frame while store is open.
3. **Card row layout for 4 items**: 3+1 (first row 3, second row 1 centered) or 2+2? Recommendation: 2+2 symmetry looks cleaner for a store.
