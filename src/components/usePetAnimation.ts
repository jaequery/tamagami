// usePetAnimation — turns the PURE activity contract (game/animations.ts) into
// running, Game-Boy-flavored transform animations for a single pet sprite.
//
// The pet is never truly still: it breathes with a gentle idle bob, fires a
// one-shot action when the player feeds/plays/etc. (a bumped `activity.nonce`),
// and — when `ambient` is on — wanders through weighted idle activities on a
// randomized timer so it feels alive on its own.
//
// Everything here is presentation: WHICH activity to play and WHEN the scheduler
// fires comes from animations.ts (activitySpec / overlayFor / pickAmbient /
// nextIdleDelayMs). This hook owns the Animated.Values, the recipes that drive
// them, and the floating-overlay opacity/drift. PetSprite renders the result.
//
// Motion respects accessibility: if Reduce Motion is on (or the pet is dead)
// everything freezes at neutral and no scheduler runs — mirroring the
// `.then/.catch/.finally` probe used elsewhere (see RevealOverlay).
//
// Constraints: no react-native-reanimated — only the built-in Animated API,
// useNativeDriver: true on every transform/opacity animation.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, AccessibilityInfo, type ViewStyle } from 'react-native';
import {
  activitySpec,
  overlayFor,
  pickAmbient,
  nextIdleDelayMs,
  type PetActivity,
  type OverlayGlyph,
} from '../game/animations';

// ─── Public shape ────────────────────────────────────────────────────────────

interface UsePetAnimationArgs {
  isEgg: boolean;
  isDead: boolean;
  /** Enable the periodic idle scheduler (the pet wanders on its own). */
  ambient?: boolean;
  /** Gates night-only ambient activities (sleep). */
  isNight?: boolean;
  /** Bump `nonce` to play `key` once (feed/play/etc.). */
  activity?: { key: PetActivity; nonce: number };
}

// The exact transform-array type an Animated.View's `style.transform` accepts:
// RN's transform members, but with each value allowed to be an Animated.Value
// or interpolation. Using RN's own helper keeps us assignable without `any`.
type AnimatedTransform = NonNullable<Animated.WithAnimatedValue<ViewStyle['transform']>>;

export interface PetAnimation {
  animatedStyle: { transform: AnimatedTransform };
  /** 'none' when nothing is floating above the sprite. */
  overlayGlyph: OverlayGlyph;
  overlayStyle: {
    opacity: Animated.Value;
    transform: { translateY: Animated.Value }[];
  };
}

// ─── Tunables ────────────────────────────────────────────────────────────────
// Resting "breathing" bob — preserves the app's long-standing idle look.
const IDLE_BOB_MS = 600;
const IDLE_BOB_Y = -4;

// Overlay glyph drifts up as it fades in, then fades out in place.
const OVERLAY_RISE = -14;
const OVERLAY_FADE_IN_MS = 220;
const OVERLAY_FADE_OUT_MS = 260;

const SLEEP_CYCLES = 3; // how many breaths a sleep ambient takes before yielding

export function usePetAnimation({
  isEgg,
  isDead,
  ambient = false,
  isNight = false,
  activity,
}: UsePetAnimationArgs): PetAnimation {
  // Stable Animated.Values (one instance for the lifetime of the component).
  const [translateX] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));
  const [rotateDeg] = useState(() => new Animated.Value(0)); // degrees, interpolated below
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [overlayTranslateY] = useState(() => new Animated.Value(0));

  const [overlayGlyph, setOverlayGlyph] = useState<OverlayGlyph>('none');

  // Running handles so we can stop cleanly on every dep change / unmount.
  const idleAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const actionAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const overlayAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Last nonce we acted on — lets us tell a real one-shot bump from an effect
  // re-run caused by some other dependency (ambient/isNight/mount) changing.
  const lastNonceRef = useRef<number | undefined>(undefined);

  // Whether motion is allowed at all (resolved async, then frozen for this run).
  const motionFrozen = isDead;

  // ── degrees → '<deg>deg' so a single Value drives rotation ──
  // Wide range keeps interpolation linear for any wiggle/spin we throw at it.
  const rotate = rotateDeg.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  // The one-shot trigger and the scheduler both live in the same effect so they
  // share the stop/cleanup machinery and never run concurrently.
  const activityKey = activity?.key;
  const activityNonce = activity?.nonce;

  useEffect(() => {
    let cancelled = false;

    const stopAll = (): void => {
      idleAnimRef.current?.stop();
      actionAnimRef.current?.stop();
      overlayAnimRef.current?.stop();
      idleAnimRef.current = null;
      actionAnimRef.current = null;
      overlayAnimRef.current = null;
      if (idleTimerRef.current != null) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const resetTransforms = (): void => {
      translateX.setValue(0);
      translateY.setValue(0);
      scale.setValue(1);
      rotateDeg.setValue(0);
    };

    const freeze = (): void => {
      stopAll();
      resetTransforms();
      overlayOpacity.setValue(0);
      overlayTranslateY.setValue(0);
      if (!cancelled) setOverlayGlyph('none');
    };

    // ── Resting breathing bob — the app's current, calm idle look. ──
    const startIdleBob = (): void => {
      idleAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: IDLE_BOB_Y, duration: IDLE_BOB_MS, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: IDLE_BOB_MS, useNativeDriver: true }),
        ]),
      );
      idleAnimRef.current.start();
    };

    // ── Overlay glyph: drift up + fade in, hold, then fade out. ──
    const playOverlay = (glyph: OverlayGlyph, holdMs: number): void => {
      if (glyph === 'none') {
        setOverlayGlyph('none');
        overlayOpacity.setValue(0);
        return;
      }
      setOverlayGlyph(glyph);
      overlayOpacity.setValue(0);
      overlayTranslateY.setValue(0);
      const hold = Math.max(0, holdMs - OVERLAY_FADE_IN_MS - OVERLAY_FADE_OUT_MS);
      overlayAnimRef.current = Animated.sequence([
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 1, duration: OVERLAY_FADE_IN_MS, useNativeDriver: true }),
          Animated.timing(overlayTranslateY, { toValue: OVERLAY_RISE, duration: OVERLAY_FADE_IN_MS, useNativeDriver: true }),
        ]),
        Animated.delay(hold),
        Animated.timing(overlayOpacity, { toValue: 0, duration: OVERLAY_FADE_OUT_MS, useNativeDriver: true }),
      ]);
      overlayAnimRef.current.start();
    };

    // ── Per-activity transform recipe → a composite ready to start. ──
    const buildAction = (key: PetActivity): Animated.CompositeAnimation => {
      switch (key) {
        // Amble side to side with tiny hops.
        case 'walk':
          return Animated.parallel([
            Animated.sequence([
              Animated.timing(translateX, { toValue: -6, duration: 450, useNativeDriver: true }),
              Animated.timing(translateX, { toValue: 6, duration: 900, useNativeDriver: true }),
              Animated.timing(translateX, { toValue: 0, duration: 450, useNativeDriver: true }),
            ]),
            Animated.loop(
              Animated.sequence([
                Animated.timing(translateY, { toValue: -3, duration: 225, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 225, useNativeDriver: true }),
              ]),
              { iterations: 4 },
            ),
          ]);

        // Spring up and land with a little squash.
        case 'jump':
          return Animated.sequence([
            Animated.parallel([
              Animated.timing(translateY, { toValue: -18, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1.05, duration: 300, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              Animated.timing(scale, { toValue: 0.92, duration: 280, useNativeDriver: true }),
            ]),
            Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
          ]);

        // Wiggle left/right to the beat with a small bob.
        case 'dance':
          return Animated.parallel([
            Animated.sequence([
              Animated.timing(rotateDeg, { toValue: -8, duration: 200, useNativeDriver: true }),
              Animated.timing(rotateDeg, { toValue: 8, duration: 400, useNativeDriver: true }),
              Animated.timing(rotateDeg, { toValue: -8, duration: 400, useNativeDriver: true }),
              Animated.timing(rotateDeg, { toValue: 8, duration: 400, useNativeDriver: true }),
              Animated.timing(rotateDeg, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
            Animated.loop(
              Animated.sequence([
                Animated.timing(translateY, { toValue: -4, duration: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
              ]),
              { iterations: 4 },
            ),
          ]);

        // Three quick downward chomps with a scale pulse. Each chomp is a fresh
        // composite — Animated nodes are stateful and shouldn't be reused.
        case 'eat': {
          const chomp = (): Animated.CompositeAnimation =>
            Animated.sequence([
              Animated.parallel([
                Animated.timing(translateY, { toValue: 3, duration: 90, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1.04, duration: 90, useNativeDriver: true }),
              ]),
              Animated.parallel([
                Animated.timing(translateY, { toValue: 0, duration: 90, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
              ]),
              Animated.delay(120),
            ]);
          return Animated.sequence([chomp(), chomp(), chomp()]);
        }

        // Slow breathing while asleep — loops a few cycles then yields.
        case 'sleep':
          return Animated.loop(
            Animated.sequence([
              Animated.timing(scale, { toValue: 1.04, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
            { iterations: SLEEP_CYCLES },
          );

        // Excited squash + a full 360° spin.
        case 'cheer':
          return Animated.parallel([
            Animated.sequence([
              Animated.timing(scale, { toValue: 1.15, duration: 200, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
            ]),
            Animated.timing(rotateDeg, { toValue: 360, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          ]);

        // 'idle' (or anything unexpected) → no transform; idle bob carries it.
        default:
          return Animated.delay(activitySpec(key).durationMs);
      }
    };

    // Schedule the next ambient pick after a randomized rest beat.
    const scheduleNextAmbient = (): void => {
      if (!ambient) return;
      const delay = nextIdleDelayMs(Math.random);
      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = null;
        if (cancelled) return;
        play(pickAmbient(Math.random, { night: isNight }));
      }, delay);
    };

    // Play one activity: stop the idle loop, run the recipe + overlay, then on
    // finish reset transforms, resume the bob, and (if ambient) queue the next.
    function play(key: PetActivity): void {
      if (cancelled) return;
      idleAnimRef.current?.stop();
      idleAnimRef.current = null;
      actionAnimRef.current?.stop();

      resetTransforms();
      playOverlay(overlayFor(key), activitySpec(key).durationMs);

      const action = buildAction(key);
      actionAnimRef.current = action;
      action.start(() => {
        actionAnimRef.current = null;
        if (cancelled) return;
        resetTransforms();
        setOverlayGlyph('none');
        startIdleBob();
        scheduleNextAmbient();
      });
    }

    // ── Boot: probe Reduce Motion, then settle into the right resting state. ──
    let reducedMotion = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { reducedMotion = enabled; })
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;

        if (motionFrozen || reducedMotion) {
          lastNonceRef.current = activityNonce;
          freeze();
          return;
        }

        // A genuine one-shot bump? Play it once (eggs never react). Otherwise
        // settle into the resting bob and, if ambient, arm the scheduler.
        const bumped =
          activityNonce !== undefined && activityNonce !== lastNonceRef.current;
        lastNonceRef.current = activityNonce;

        if (bumped && !isEgg && activityKey !== undefined) {
          play(activityKey);
          return;
        }

        // Everyone breathes; only non-egg pets wander on their own.
        startIdleBob();
        overlayOpacity.setValue(0);
        overlayTranslateY.setValue(0);
        setOverlayGlyph('none');

        if (!isEgg && ambient) {
          scheduleNextAmbient();
        }
      });

    return () => {
      cancelled = true;
      stopAll();
    };
    // Eggs and frozen pets ignore one-shot activities; the nonce dep replays an
    // activity each time the caller bumps it. isNight/ambient re-arm the scheduler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEgg, motionFrozen, ambient, isNight, activityKey, activityNonce]);

  return {
    animatedStyle: {
      transform: [
        { translateX },
        { translateY },
        { scale },
        { rotate },
      ],
    },
    overlayGlyph,
    overlayStyle: {
      opacity: overlayOpacity,
      transform: [{ translateY: overlayTranslateY }],
    },
  };
}
