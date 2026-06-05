# Design System — TAMAGAMI

The source of truth lives in code: `src/theme.ts` (tokens) and `src/game/palettes.ts`
(rarity palettes). This document explains the system and the rules around it. Read it
before any visual change.

## Product Context
- **What this is:** a retro pixel-art virtual pet. Pick a pet, keep it alive in real
  time (it decays even while the app is closed), watch it hatch and evolve, collect rare
  forms, share the ones you're proud of.
- **Who it's for:** people who loved Tamagotchi / Game Boy and want a tiny, charming
  daily ritual with a collection hook.
- **Project type:** native iOS app (Expo / React Native + TypeScript).
- **The one feeling:** the gasp when your pet becomes something you've never seen before.

## Aesthetic Direction
- **Direction:** authentic Game Boy DMG handheld. Hard pixel edges, no anti-aliasing,
  no rounded modern softness. The device *is* the brand.
- **Decoration level:** minimal. Typography, the LCD grid, and the sprites do the work.
- **Mood:** warm nostalgia with a collector's itch underneath.
- **Rule:** we add rarity and mystery *on top of* the DMG soul — we never repaint it. A
  common pet must look exactly like the app always has.

## Typography
- **Family:** `PressStart2P_400Regular` (bitmap) everywhere. No second face yet; a
  cryptic lore face is reserved for Phase 2 event text.
- **Scale (pt):** tiny 6 · sm 8 · md 10 · lg 14 · xl 18. (`FONT_TINY…FONT_XL`)
- **Always uppercase** for labels and names — it reads as "device firmware."

## Color — the rarity palette system
Base LCD ramp, lightest → darkest: `bg · shade1 · shade2 · dark · off`. Text drawn in a
palette's `dark` reads on that palette's `bg`, so any surface themes itself just by
picking a palette.

Rarity wears a different palette — the same trick real Game Boys used. Color = status =
mystery, and `secret` doubles as a night/dark mode.

| Rarity | Palette | `bg` | `dark` (ink) | Drop rate |
|---|---|---|---|---|
| common | DMG green (= live theme) | `#9BBC0F` | `#0F380F` | 60% |
| uncommon | Pocket grey | `#C5C7B0` | `#1B1C12` | 25% |
| rare | Light amber | `#E8D8A0` | `#3A2008` | 10% |
| epic | SGB indigo | `#BFC4EC` | `#1B1140` | 4% |
| secret | Lunar (inverted night) | `#0B1026` | `#CBD6FF` | 1% |

- **Semantic colors (palette-independent):** white highlight `#FFFFFF`, warning
  `#C44B00`, critical `#8B0000`, shell teal `#2B7A78`.
- **Rarity accent** (`rarityAccent`): one saturated swatch per rarity for tags/borders so
  rarity is legible against any ramp.
- **Egg rule:** the egg always renders in the **common** palette so its color can't leak
  the rarity hidden inside. Only a hatched pet wears its true colors.

## Sprites
- 14×14 cell matrices of `<View>`s at `CELL_SIZE` (10pt) — real pixel art, not images.
  Indices: 0 transparent · 1 dark · 2 mid · 3 light · 4 white · 5 warning · 6 shell · 7 tear.
- `PetSprite` takes an optional `palette` (rarity tint of 1/2/3) and `background` (what
  shows through index 0). On the green home screen, common pets keep `bg = LCD_BG`; rare
  pets render inside a palette-tinted framed "screen-within-a-screen" so tinted
  transparent cells never bleed onto the green.
- **The Swift widget mirrors these matrices verbatim** (`targets/widget/Sprite.swift`).
  Keep them in sync when you add sprites. (The egg sprite + rarity are not yet mirrored.)

## Spacing & Layout
- **Base unit:** `PIXEL = 2pt`. Everything snaps to multiples so edges stay crisp.
- **Scale:** `SPACE_1…SPACE_16` = 2,4,6,8,12,16,20,24,32.
- **Borders:** `BORDER_WIDTH` 2pt (hard pixel border) · `BORDER_HEAVY` 4pt (bezel/frame).
- **Layout:** single device frame, vertical stack: header → sprite + caption → stats →
  actions → share/codex bar → social bar. Modals (friends, codex, share, reveal) overlay.

## Motion — a reward currency
- **The pet is alive, not jittery:** a calm breathing idle bob is the baseline. On top
  of it the pet plays short, low-amplitude **activities** — walk / jump / dance / eat /
  sleep / cheer — fired two ways: a self-driven idle scheduler picks weighted ambient
  activities on a randomized timer, and player interaction fires a specific one
  (feed/buy → eat, play → jump or dance, water → eat, nearby meet → cheer). Sleep is
  night-only. See `game/animations.ts` (pure rules), `components/usePetAnimation.ts`
  (the Animated recipes + scheduler), and the floating glyph overlay (Zzz / ♪ / ♥ / •).
- **Keep activity motion small:** transforms only (translate/scale/rotate) over the
  pixel grid — never loud enough to compete with a reveal. The sprite matrices are
  untouched so the Swift widget stays in sync.
- **Spend big motion only on reveals:** `RevealOverlay` does a white blow-out flash →
  spring-in of the new form. A reveal should feel like an event because it's rare.
- **Respect reduce-motion:** every animation checks `AccessibilityInfo.isReduceMotionEnabled`
  and snaps to the end state when on. Dead pets freeze; eggs only ever do the gentle bob.
- **Haptics:** care tap = light; reveal = success notification. (Reserved: death = long
  descending, event = double pulse.)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-04 | Added rarity-palette system + egg/evolution + codex + share card | `/design-consultation`: make the app fun/new/mysterious/viral while staying local-only. Rarity reuses authentic Game Boy palettes so mystery sits on top of the soul, not over it. |
| 2026-06-04 | Egg renders in common palette | Color must not leak the hidden rarity before hatch. |
| 2026-06-04 | Reveal motion reserved for stage-ups only | Keep daily care calm so reveals land as events. |
| 2026-06-05 | Added a layered pet-activity system (idle bob + ambient walk/jump/dance/sleep + interaction-fired eat/cheer) | Static sprite felt lifeless; small transform-only activities raise engagement while reveals keep the big motion. Matrices unchanged → widget stays in sync. |
