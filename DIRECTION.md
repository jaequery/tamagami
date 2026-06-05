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
- **Phase 2 — SHIPPED (living world):** day/night phase + three deterministic timed
  events (eclipse / 3am visitor / meteor shower) the pet can witness; witnessing stamps a
  permanent aura and fills an EVENTS page in the codex. Details below.
- **Phase 3 — SHIPPED (death legacy):** death now offers CONTINUE LINE (hatch an heir
  that inherits the bloodline's luck), a tombstone share card, and a family tree of every
  generation. Details below.
- **Phase 4 — SHIPPED (social graph):** rarity now travels over BLE; friends carry it,
  bonds level up with repeat meets, and each rare-or-better friend makes your next egg
  luckier. The four-engine vision is complete. Details below.

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

## Phase 2 — what's built (living world)

Code map (additive again; care engine, BLE, widget untouched; **no save-version bump** —
the `events` field is tolerant, so the v3 saves already on TestFlight stay valid):

- `src/game/world.ts` — `phaseOfDay` / `isNight` from the device clock (pure).
- `src/game/events.ts` — three timed events with deterministic windows + `activeEventAt`;
  the eclipse is calendar-seeded (`isEclipseDay`, ~1 day in 6) so it's the same for
  everyone on the same day — that's what makes "the eclipse is live right now" shareable.
- `src/game/eventCodex.ts` — lifetime witnessed-events set (permanent, save-independent).
- `PetState.events: string[]` — this pet's witnessed-event aura (tolerant in storage).
- `engine.witnessEvent` — idempotent reducer; `usePet` exposes `actions.witnessEvent`.
- `EventBanner` (in-LCD omen + tap-to-witness), `EventReveal` (cosmic apparition reveal),
  plus an EVENTS section in the codex and an aura row on the share card.

**Event windows (local time):** meteor 21:00–05:00 nightly · 3am visitor 03:00–03:59 ·
solar eclipse 12:00–12:59 on eclipse days (~1 in 6). To demo any of them without waiting,
set the device clock — e.g. 3am for the visitor (genre-authentic clock-chasing).

## Phase 3 — what's built (death legacy + lineage)

Code map (additive; **no save-version bump** — `generation` is tolerant like `events`):

- `src/game/lineage.ts` — the family-tree store (permanent graves, save-independent),
  `ancestorFrom`, and deterministic `epitaphFor`.
- `evolution.ts` — `rarityRank` / `rarer` / `rollHeirRarity`: an heir takes the rarer of
  two rolls and 25% of the time floors at the parent's rarity, so a line "remembers its
  luck" (a secret bloodline reaches secret far more than a fresh 1% roll).
- `engine.createHeir` — same species + family name, next generation, inherited rarity,
  fresh egg. `PetState.generation` (tolerant in storage).
- `usePet` — `actions.continueLine` archives the departed and hatches the heir in place;
  `reset` also archives before a fresh start, so the tree never forgets.
- Death overlay now offers **CONTINUE LINE / SHARE / NEW PET** with the epitaph; the
  share card has a tombstone variant (R.I.P., cause, epitaph, GEN); `GEN n` in the meta
  bar opens the **family tree** (`LineageModal`).

## Phase 4 — what's built (social graph)

Code map (additive; **no save-version bump** — rarity over BLE and on friends is tolerant):

- `nearby.ts` — the BLE payload now carries a 1-char rarity code; `decodePayload` accepts
  both the new 5-field form and legacy 4-field (pre-rarity → common), so a mixed-version
  room still meets. `PeerIdentity` gains `rarity`.
- `friends.ts` — `Friend` gains `rarity` (tolerant load: old friends → common), refreshed
  on each meet.
- `social.ts` — `bondLevel` (MET → FRIEND → BESTIE by meet count) and `charmFromFriends`
  (distinct rare+ friends, capped at `CHARM_CAP`).
- `evolution.rollRarityWithLuck` — `luck` extra rolls, best wins; `createInitialPet` /
  `createHeir` take `luck`, and `usePet` feeds in the charm at every hatch — so meeting
  rare pets measurably raises your next egg's odds (tested: lifts the average rarity).
- UI: friends list shows rarity + bond; the nearby-meet pop tints the peer by its rarity
  and flags `RARE PET! +LUCK` on a rare-or-better encounter.

### Tunables worth knowing

- `STAGE_THRESHOLDS` (`evolution.ts`): egg hatches at **45s** on purpose so the first
  gasp lands in the opening session. Later stages (1h / 8h / 1d / 5d) are the retention
  curve — tune to taste.
- `RARITY_WEIGHTS`: common 60 / uncommon 25 / rare 10 / epic 4 / **secret 1%** (the
  "show someone" pull).

## Viral loop — what's built (closes share → install → reward)

The engines create shareable moments; this arc makes them actually spread. Requires the
build with the new native dep (`react-native-view-shot`) to function — degrades to a
text-only share without it.

- **Image share.** `ShareCard.handleShare` captures the cartridge/tombstone view to a PNG
  (`captureRef`, `react-native-view-shot`) and shares **image + caption together** via RN
  `Share.share({ url, message })` — iOS attaches the picture AND the text with the install
  link. Falls back to text-only if capture is unavailable (Expo Go / web).
- **Deep links.** `App.useGiftLink` parses inbound `tamagami://hatch?type=&rarity=` (via
  `expo-linking`), and `game/gift.ts` records a one-time **luck gift** scaled by the shared
  pet's rarity, consumed at the recipient's next hatch (stacks with social charm). New
  players arrive to a luckier first egg + a "🎁 YOU WERE INVITED" welcome — the reward that
  closes the loop. (`expo-sharing` was evaluated and dropped: it can't attach the link.)

### Honest gaps (flagged not hidden)

- **iOS widget shows the grown pet, not the egg/rarity/events.** The Swift mirror
  (`targets/widget/Sprite.swift`, `Engine.swift`) hasn't been extended — additive, so
  nothing breaks, but the widget won't reflect the new state until mirrored.
- **Egg-first onboarding not adopted.** You still pick plant/cat/dog; the mystery is the
  rarity hidden in the egg. Full egg-first (hidden species) is a deliberate later call.
- **Image share needs a build.** `react-native-view-shot` is native — the image path only
  works in a build that includes it (not the current TestFlight build 10).
