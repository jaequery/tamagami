# 🥚 Tamagami

A retro pixel-art virtual-pet iPhone app — feed it, play with it, clean up after
it, and keep it alive. Built with Expo (React Native + TypeScript). The pet's
needs decay in **real time, even while the app is closed**, and local
notifications nudge you when it needs care.

Aesthetic: classic Game Boy / Tamagotchi LCD — Game Boy-green screen, hard pixel
edges, the `Press Start 2P` bitmap font, segmented stat bars, and pet sprites
drawn cell-by-cell as real pixel art.

## Features

- **5 needs that decay over time:** hunger, happiness, energy, hygiene, health.
- **Care actions:** `FEED`, `PLAY`, `SLEEP`/`WAKE`, `CLEAN`, `HEAL` — each with
  haptic feedback.
- **Real-time offline simulation:** close the app for an hour and the pet ages an
  hour (capped at 7 days). Catch-up runs on every foreground.
- **Life stages:** egg → baby → child → teen → adult, each with its own sprite,
  plus distinct happy / sad / sick / sleeping / dead expressions.
- **Consequences:** neglect → poop piles up → sickness → death (with a cause).
  A death screen lets you hatch a fresh pet.
- **Local notifications:** schedules reminders for when a stat will cross its
  "needs care" threshold. Works fully even if you deny the permission.
- **Local-only persistence:** state lives on-device in AsyncStorage. No account,
  no backend, fully offline.

## Run it

Requires Node 20+ and the [Expo](https://docs.expo.dev/) toolchain.

```bash
npm install
npm run ios      # opens the iOS simulator (needs Xcode)
# or:
npm start        # then scan the QR code with Expo Go on a physical iPhone
```

> Local notifications and haptics behave best on a **physical device** / a
> development build. In Expo Go some notification features are limited.

## 📲 Home-screen & lock-screen widget

There's a native **WidgetKit** widget (Small + Medium home-screen, plus iOS-16+
lock-screen accessory) that shows the pet and its stats — and keeps the needs
**ticking down on a projected timeline even while the app is closed**, because
the decay simulation is ported to Swift (`targets/widget/Engine.swift`) and runs
inside the widget. The app mirrors pet state into a shared **App Group** on every
save (`src/game/widget.ts`), and the widget reads + projects it.

Because widgets are native, the app uses Expo's prebuild (Continuous Native
Generation). The generated `ios/` folder is **gitignored** — regenerate it any
time with:

```bash
npx expo prebuild --platform ios   # generates ios/ + the widget target + pods
npm run ios                         # build & run app + widget on the simulator
```

To build to a **physical device** (and for the App Group to work there), add your
Apple Team ID to `app.json` under `expo.ios.appleTeamId`, then open
`ios/tamagami.xcworkspace` in Xcode and run. The widget's Swift lives in
`targets/widget/` (it is the source of truth — `@bacons/apple-targets` wires it
into the Xcode project on every prebuild); the App Group is
`group.com.tamagotcha.app`.

## Quality checks

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint (eslint-config-expo)
npm test            # jest — 58 engine unit tests
```

All three pass, and `npx expo export -p ios` bundles cleanly.

## Project layout

```
src/
  game/
    types.ts          # PetState / PetStats / hook contract types
    constants.ts      # ★ all gameplay tunables (decay rates, thresholds, stage ages)
    engine.ts         # pure simulation: simulate() + action reducers (no RN imports)
    storage.ts        # versioned AsyncStorage load/save with strict validation
    notifications.ts  # expo-notifications wrapper (permission + projected reminders)
    engine.test.ts    # 58 unit tests
  hooks/
    usePet.ts         # loads state, foreground tick, AppState catch-up, persistence
  components/
    PixelText.tsx     # Press Start 2P text wrapper
    StatBar.tsx       # segmented pixel progress bar (warning + critical states)
    PixelButton.tsx   # chunky pixel action button + haptics
    PetSprite.tsx     # the pet, drawn as a grid of <View> cells per stage + mood
    DeviceFrame.tsx   # the handheld LCD device shell
  screens/
    HomeScreen.tsx    # the single game screen + death/restart overlay
  theme.ts            # the entire pixel palette + spacing scale (single source of color)
App.tsx               # font load → HomeScreen
```

## Tuning the game

The whole gameplay cadence lives in **`src/game/constants.ts`** — decay rates,
sickness/death thresholds, poop interval, life-stage durations, the offline
catch-up cap, and notification thresholds are all named constants with comments.
The simulation in `engine.ts` is pure and fully unit-tested, so you can adjust a
constant and re-run `npm test` to see the effect immediately.

By default the egg hatches in ~45s (for instant gratification) and the full
needs cycle plays out over a few hours per stat.
