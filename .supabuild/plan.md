<!-- supabuild:plan:start -->
## 🤖 Supabuild plan
**Status:** round 1/3 · branch `main` · target `none` (local build)
**Worktree:** repo root (greenfield — empty tree already isolated; no worktree)
**Base:** `40939bd`

### Goal
A retro pixel-art Tamagotchi virtual-pet iPhone app (Expo + React Native + TS): the pet's needs decay in real time (even while the app is closed), the user keeps it alive via care actions, and local notifications nudge them when it needs attention.

### Acceptance criteria
- [ ] App launches to a single LCD-style device screen showing the pet sprite, 5 stat bars (hunger, happiness, energy, hygiene, health), age/stage, and action buttons in the Press Start 2P pixel font.
- [ ] Hunger, happiness, energy, hygiene decay continuously; FEED / PLAY / SLEEP / CLEAN / HEAL each change the right stats with visible feedback + haptics.
- [ ] Closing & reopening the app advances the pet's state by the real elapsed time (offline catch-up), not from where it was paused.
- [ ] Sustained neglect causes sickness then death (with cause); a death screen lets the user hatch a new pet. State persists across app restarts via AsyncStorage.
- [ ] Pet ages through life stages (egg → baby → child → teen → adult) with distinct pixel sprites; sleeping/sick/dead have distinct sprites.
- [ ] Local notifications are scheduled for projected need-thresholds; first launch requests permission gracefully and the app works fully if denied.
- [ ] `npm run typecheck`, `npm run lint`, and `npm test` (engine unit tests) all pass.

### Out of scope
- Cloud sync / accounts / backend (local-only by decision).
- Android-specific polish & app-store submission assets.
- Multiple simultaneous pets, social features, in-app purchases.

### Architecture
**New files**
- `src/game/types.ts` — PetState, PetStats, LifeStage, CauseOfDeath, hook contract types.
- `src/game/constants.ts` — decay rates, thresholds, stage ages, notification config.
- `src/game/engine.ts` — pure sim: `simulate(state, now)`, `feed/play/sleep/clean/heal/restart` reducers, mood + death + evolution logic.
- `src/game/storage.ts` — versioned AsyncStorage load/save.
- `src/game/notifications.ts` — permission + schedule/cancel projected-threshold local notifications.
- `src/game/engine.test.ts` — unit tests (decay, offline catch-up, death, evolution, actions).
- `src/hooks/usePet.ts` — loads state, foreground tick, AppState catch-up, persistence, exposes actions + mood.
- `src/theme.ts` — Game Boy DMG-style pixel palette + sizes.
- `src/components/{PixelText,StatBar,PixelButton,PetSprite,DeviceFrame}.tsx` — pixel UI primitives; PetSprite renders grid-of-Views sprites per stage+mood.
- `src/screens/HomeScreen.tsx` — main game screen wiring usePet → UI; death/restart overlay.

**Modified files**
- `App.tsx` — load Press Start 2P font, init notifications, render HomeScreen.
- `app.json` — expo-notifications plugin + iOS config.

**Data** — no DB; AsyncStorage key `@tama/pet/v1`, versioned for migration.
**Surfaces** — Local notifications only. New deps already installed.

### Risks & mitigations
- Offline catch-up math drift / huge elapsed times → cap elapsed per simulate, pure & unit-tested.
- Parallel agents diverging on the `usePet`/types contract → contract pinned verbatim in both dispatches; integration typecheck gate.
- Notification permission denied or unavailable in Expo Go → all scheduling wrapped, app fully functional without it.
- jest-expo transform of RN/expo imports → engine kept import-pure (only types/constants) so tests run clean.

### Verification map
| # | Criterion | Proof |
|---|-----------|-------|
| 1 | Screen renders pet+bars+buttons | manual/run + component compiles |
| 2 | Actions change stats | engine unit tests |
| 3 | Offline catch-up | engine unit test (simulate with elapsed) |
| 4 | Neglect → sick → death → restart | engine unit tests |
| 5 | Evolution stages | engine unit test |
| 6 | Notifications graceful | code review of guarded calls |
| 7 | typecheck/lint/test green | CI commands |

### Rollback
- Local greenfield build; `git reset` is safe. No prod, no migration.

### Round log
- (filled as rounds run)
<!-- supabuild:plan:end -->
