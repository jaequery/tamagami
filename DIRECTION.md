# TAMAGAMI — Product Direction: fun · new · mysterious · viral

The north star: **the gasp when your pet becomes something you've never seen before.**
Every feature below serves that gasp. Constraint: **local-only, no backend, no account** —
the same offline soul the app ships with today. Virality comes from shareable artifacts
and curiosity, not servers.

## The core insight: four engines, one machine

All four hooks the team wants produce the same two things — a **secret** and a
**share card**. So we don't build four features; we build one reveal-and-share loop
fed by four content firehoses.

```
        EGG  (mystery from second 1)
          │  hidden hatch conditions
          ▼
   ┌──► LIFE-STAGE EVOLUTION ──┐   Engine 1 (the spine)
   │      every stage = reveal  │
   │                            ▼
 WORLD EVENTS ──branch──► RARE / SECRET FORMS ──► SHARE CARD ──► install
 (eclipse, 3am     Engine 2        │ Engine 4              ▲
  visitor, night)                  │ friends' rare pets    │
   │                               ▼ raise your odds       │
   └──────── DEATH ──► TOMBSTONE CARD + inherited EGG ──────┘
              Engine 3 (lineage)
```

You never see everything anymore. There's always a locked silhouette in the codex you
don't know how to unlock. That gap is the game.

## The four engines (all local, deterministic, no server)

1. **Evolution + secret pets (spine).** Pet begins as an egg; its rarity is rolled at
   birth but hidden until hatch. Hatches → baby → child → teen → adult → elder. Rarity
   picks the LCD palette and the collectible form. Every stage crossing is a reveal.
2. **Living world + lore.** Device clock drives day/night and seeded rare events
   (eclipse, meteor, a 3am stranger). Events branch evolution into secret forms.
   "Did you get the eclipse one?" is the share.
3. **Death legacy + lineage.** Death mints a tombstone card and leaves an egg; the next
   generation inherits a trait (tint, starting stat, better odds at the parent's rare
   form). A family tree. Loss becomes lineage.
4. **Social bonding graph.** BLE friends already persist. Meeting a *rare* pet raises
   your egg's secret-form odds; a sustained bond unlocks a co-evolution. Meeting a rare
   form spreads curiosity by contact.

## Sequencing

- **Phase 1 — SHIPPED IN THIS SLICE (the viral wedge):** egg → hatch → life stages,
  the rarity-palette system, the cartridge share-card, the codex with silhouettes,
  and the reveal animation. Delivers fun + new + mystery + a shareable object on its own.
- **Phase 2 — Living world:** day/night + 2–3 rare events that branch secret forms.
- **Phase 3 — Death legacy:** tombstone card, inherited egg, family tree. (Hook already
  exists: death has a cause.)
- **Phase 4 — Social graph:** rare-meet odds, co-evolution, bond web.

## Phase 1 — what's actually built

Code map (all additive; the care engine, BLE social, widget, and tests are untouched):

- `src/game/evolution.ts` — deterministic rarity roll (FNV-1a hash of birth identity →
  weighted bucket; no `Math.random`, fully testable), life-stage thresholds derived from
  `ageSeconds`, and the 15-form catalog (3 types × 5 rarities) the codex draws from.
- `src/game/palettes.ts` — five LCD palettes keyed by rarity. `common` reuses the live
  DMG-green tokens (a common pet looks exactly like before); `secret` is an inverted
  night palette that doubles as a future event/dark mode.
- `src/game/codex.ts` — permanent, separate-from-save collection of hatched forms
  (survives reset/death), mirroring the `friends.ts` cache pattern.
- `PetState.rarity` — rolled at birth, stored, validated (storage bumped v2 → v3).
- `src/components/RevealOverlay.tsx` — the white-flash hatch/evolution reveal + haptics.
- `src/components/ShareCard.tsx` — the Game Boy cartridge share-card (the viral atom).
- `src/components/CodexModal.tsx` — the silhouette collection grid.
- `HomeScreen` — derives stage + palette, runs the egg countdown, fires the reveal on
  stage-up, records discoveries, and exposes `[SHARE]` and `CODEX n/15`.

### Tunables worth knowing

- `STAGE_THRESHOLDS` (`evolution.ts`): egg hatches at **45s** on purpose so the first
  gasp lands in the opening session. Later stages (1h / 8h / 1d / 5d) are the retention
  curve — tune to taste.
- `RARITY_WEIGHTS`: common 60 / uncommon 25 / rare 10 / epic 4 / **secret 1%** (the
  "show someone" pull).

### Honest gaps (Phase-1.5 follow-ups, flagged not hidden)

- **Share is text + deep link, not an image yet.** The cartridge renders as a
  capturable view; add `react-native-view-shot` + `expo-sharing` (one native rebuild)
  to ship the PNG. That's the real viral upgrade.
- **iOS widget shows the grown pet, not the egg/rarity.** The Swift mirror
  (`targets/widget/Sprite.swift`, `Engine.swift`) wasn't extended this pass — additive,
  so nothing breaks, but the widget won't reflect rarity/egg until mirrored.
- **Egg-first onboarding not adopted.** You still pick plant/cat/dog; the mystery is the
  rarity hidden in the egg. Going full egg-first (hidden species) is a deliberate later
  call — it trades the "I chose a dog" agency for deeper mystery.
- **Deep-link handler.** `scheme: tamagami` is registered; nothing routes
  `tamagami://hatch?...` yet (no-op until Phase 2 wires it).
