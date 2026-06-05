// ColdOpen — the birth cinematic (GAME.md §1 cold open, §2 the hands, §3 first
// breath). Plays once per pet (and once per heir): the dark and the two
// heartbeats, the womb, the contraction, the birth flash, the dramatized journey
// to you, meeting your person, and the clock waking up on your real time.
//
// Auto-paced with tap-to-hurry; the birth flash fires on its beat and isn't
// skipped. Everything shown is this pet's true, already-dealt life — its origin,
// household, rarity, and birth time — so the cinematic is the same story the
// STORY modal and the life-summary card will tell later.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Animated,
  AccessibilityInfo,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { PetState } from '../game/types';
import { paletteForRarity } from '../game/palettes';
import { isOriginId, originById, HANDOFF_LINES } from '../game/origins';
import { householdFromId, contrastLine } from '../game/household';
import {
  EYES_OPEN_LINES,
  clockPromiseLines,
  wakeReaction,
  FIRST_FEED_BID,
  HOME_LINE,
} from '../game/firstBreath';
import { PetSprite } from './PetSprite';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import { LCD_BG, SPACE_4, SPACE_8, SPACE_12 } from '../theme';

const WOMB_BG = '#06120A'; // near-black, faint green — the dark before you

interface Beat {
  bg: 'dark' | 'reveal' | 'home';
  lines: string[];
  sub?: string;          // a quieter sub-line (e.g. the real birthday)
  heartbeat?: boolean;   // double-thump haptic + pulse
  flash?: boolean;       // the birth blow-out (never skipped)
  lurch?: boolean;       // the contraction shake
  sprite?: boolean;      // show the newborn in its rarity colors
  dur: number;           // ms before auto-advance
}

function birthdayLine(bornAt: number): string {
  const d = new Date(bornAt);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `born ${h}:${m} ${ampm}, ${days[d.getDay()]}`;
}

function buildBeats(pet: PetState): Beat[] {
  const origin = isOriginId(pet.origin) ? originById(pet.origin) : null;
  const household = householdFromId(pet.household);
  const wake = wakeReaction(pet.lastTick, pet.name);
  const beats: Beat[] = [];

  // ── §1 the womb ──
  beats.push({ bg: 'dark', lines: ['it\'s warm here.'], heartbeat: true, dur: 2800 });
  beats.push({
    bg: 'dark',
    lines: ['it\'s dark.', 'something huge and slow beats around you.', 'you haven\'t happened yet.'],
    heartbeat: true,
    dur: 4200,
  });
  beats.push({ bg: 'dark', lines: ['— and then the world tilts —'], lurch: true, dur: 1600 });

  // ── §1 the birth ──
  beats.push({
    bg: 'reveal',
    lines: ['…and then there was you.'],
    sub: birthdayLine(pet.bornAt),
    flash: true,
    sprite: true,
    dur: 3600,
  });

  // ── §1 the journey to you (her origin) ──
  if (origin !== null) {
    beats.push({ bg: 'reveal', lines: [origin.title], sprite: true, dur: 2200 });
    for (const beat of origin.beats) {
      beats.push({ bg: 'reveal', lines: [beat], sprite: true, dur: 3600 });
    }
  }
  beats.push({ bg: 'reveal', lines: [...HANDOFF_LINES], sprite: true, dur: 3200 });

  // ── §2 the hands that found you ──
  if (household !== null) {
    beats.push({ bg: 'home', lines: [household.homeLine], sprite: true, dur: 3400 });
    beats.push({ bg: 'home', lines: [household.personLine], sprite: true, dur: 3800 });
    if (origin !== null) {
      beats.push({ bg: 'home', lines: [contrastLine(origin.id, household)], sprite: true, dur: 3400 });
    }
  }

  // ── §3 the first breath: naming recap, the clock waking, the first need ──
  beats.push({ bg: 'home', lines: [...EYES_OPEN_LINES], sprite: true, dur: 3200 });
  beats.push({ bg: 'home', lines: [`and they called you ${pet.name}.`, 'she knows it now.'], sprite: true, dur: 3200 });
  beats.push({ bg: 'home', lines: [wake.line], sprite: true, dur: 3600 });
  beats.push({ bg: 'home', lines: clockPromiseLines(pet.name), sprite: true, dur: 4200 });
  beats.push({ bg: 'home', lines: [FIRST_FEED_BID], sprite: true, dur: 3200 });
  beats.push({ bg: 'home', lines: [HOME_LINE], sprite: true, dur: 2600 });

  return beats;
}

interface ColdOpenProps {
  pet: PetState;
  onDone: () => void;
}

export function ColdOpen({ pet, onDone }: ColdOpenProps): React.ReactElement {
  const palette = paletteForRarity(pet.rarity);
  const beats = useMemo(() => buildBeats(pet), [pet]);
  const [index, setIndex] = useState(0);

  const [fade] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(1));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => { reduceRef.current = r; })
      .catch(() => undefined);
  }, []);

  const finish = (): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    onDone();
  };

  const advance = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIndex((i) => {
      if (i >= beats.length - 1) { finish(); return i; }
      return i + 1;
    });
  };

  // Play each beat: fade the text in, fire its haptics/animation, auto-advance.
  useEffect(() => {
    const beat = beats[index];
    if (beat === undefined) return;
    const reduce = reduceRef.current;

    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : 520, useNativeDriver: true }).start();

    if (beat.heartbeat) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      const t = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }, 200);
      if (!reduce) {
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 160, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: true }),
        ]).start();
      }
      // (the inner heartbeat timeout is short-lived; no cleanup needed)
      void t;
    }

    if (beat.flash) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      if (reduce) {
        flash.setValue(0);
      } else {
        flash.setValue(1);
        Animated.timing(flash, { toValue: 0, duration: 640, useNativeDriver: true }).start();
      }
    }

    if (beat.lurch) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      if (!reduce) {
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
        ]).start();
      }
    }

    timerRef.current = setTimeout(advance, beat.dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const beat = beats[index];
  const bgColor = beat.bg === 'dark' ? WOMB_BG : palette.bg;
  const textColor = beat.bg === 'dark' ? LCD_BG : palette.dark;
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finish}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: bgColor }]}
        onPress={advance}
        accessibilityRole="button"
        accessibilityLabel="Tap to continue the story"
      >
        {/* Skip — always available, but the flash still fires on its own beat. */}
        <View style={styles.skip}>
          <PixelButton label="SKIP" onPress={finish} accessibilityLabel="Skip the intro" />
        </View>

        <Animated.View style={[styles.body, { opacity: fade, transform: [{ translateX: shakeX }] }]}>
          {beat.bg === 'dark' ? (
            <Animated.View style={[styles.heart, { transform: [{ scale: pulse }] }]} />
          ) : (
            beat.sprite && (
              <View style={styles.sprite}>
                <PetSprite petType={pet.petType} mood="happy" stage="baby" palette={palette} background={palette.bg} />
              </View>
            )
          )}

          {beat.lines.map((line, i) => (
            <PixelText key={i} variant="sm" color={textColor} style={styles.line}>{line}</PixelText>
          ))}
          {beat.sub !== undefined && (
            <PixelText variant="tiny" color={textColor} style={styles.sub}>{beat.sub}</PixelText>
          )}
        </Animated.View>

        {/* The birth blow-out — white, on top, fading away to expose the newborn. */}
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE_12,
  },
  skip: {
    position: 'absolute',
    top: SPACE_8,
    right: SPACE_8,
    opacity: 0.7,
  },
  body: {
    alignItems: 'center',
    maxWidth: 280,
  },
  heart: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: LCD_BG,
    marginBottom: SPACE_12,
    opacity: 0.85,
  },
  sprite: {
    marginBottom: SPACE_8,
  },
  line: {
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: SPACE_4,
  },
  sub: {
    textAlign: 'center',
    marginTop: SPACE_4,
    opacity: 0.8,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
});
