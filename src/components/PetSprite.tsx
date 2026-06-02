/**
 * PetSprite — renders the pet as a 2D grid of colored <View> cells (real pixel art).
 *
 * Sprites are keyed by petType × mood. Each matrix is 14×14 cells, rendered at
 * CELL_SIZE pt each. The Swift widget (targets/widget/Sprite.swift) mirrors these
 * matrices verbatim — keep the two in sync.
 *
 * Palette indices:
 *   0 = transparent (LCD_BG)
 *   1 = darkest (LCD_DARK)
 *   2 = mid (LCD_SHADE2)
 *   3 = light (LCD_SHADE1)
 *   4 = white highlight (#FFFFFF)
 *   5 = warning / sick color (COLOR_WARNING orange)
 *   6 = shell accent (device teal highlight)
 *   7 = tear (COLOR_TEAR = LCD_SHADE2 dark-green, distinct from sick orange)
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, AccessibilityInfo, StyleSheet } from 'react-native';
import type { Mood, PetType } from '../game/types';
import {
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  LCD_SHADE1,
  COLOR_WARNING,
  COLOR_TEAR,
  SHELL_LIGHT,
  CELL_SIZE,
} from '../theme';

// ─── Palette ──────────────────────────────────────────────────────────────
const PALETTE: Record<number, string> = {
  0: 'transparent',
  1: LCD_DARK,
  2: LCD_SHADE2,
  3: LCD_SHADE1,
  4: '#FFFFFF',
  5: COLOR_WARNING,
  6: SHELL_LIGHT,
  7: COLOR_TEAR,
};

type SpriteMatrix = number[][];

// ─── PLANT — a potted sprout with a face on the pot ──────────────────────────
const SPRITE_PLANT_NEUTRAL: SpriteMatrix = [
  [0,0,0,0,0,0,2,2,0,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,2,2,0,2,2,2,2,0,2,2,0,0],
  [0,2,3,3,2,2,2,2,2,2,3,3,2,0],
  [0,2,3,3,3,2,2,2,2,3,3,3,2,0],
  [0,0,2,2,2,2,2,2,2,2,2,2,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,1,3,3,3,3,3,3,1,0,0,0],
  [0,0,0,1,3,1,3,3,1,3,1,0,0,0],
  [0,0,0,1,3,3,1,1,3,3,1,0,0,0],
  [0,0,0,0,1,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
];

const SPRITE_PLANT_HAPPY: SpriteMatrix = [
  [0,0,0,0,0,0,2,2,0,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,2,2,2,2,2,2,2,2,2,2,0,0],
  [0,2,3,3,3,2,2,2,2,3,3,3,2,0],
  [0,2,3,3,3,2,2,2,2,3,3,3,2,0],
  [0,0,2,2,2,2,2,2,2,2,2,2,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,1,3,3,3,3,3,3,1,0,0,0],
  [0,0,0,1,3,1,3,3,1,3,1,0,0,0],
  [0,0,0,1,3,1,3,3,1,3,1,0,0,0],
  [0,0,0,0,1,1,3,3,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
];

const SPRITE_PLANT_SAD: SpriteMatrix = [
  [0,0,0,0,0,0,2,2,0,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,2,2,0,0,2,2,2,2,0,0,2,2,0],
  [2,3,3,2,0,2,2,2,2,0,2,3,3,2],
  [0,2,2,2,0,2,2,2,2,0,2,2,2,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,1,3,3,3,3,3,3,1,0,0,0],
  [0,0,0,1,3,1,3,3,1,3,1,0,0,0],
  [0,0,0,1,3,3,1,1,3,3,1,0,0,0],
  [0,0,7,0,1,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
];

// ─── CAT — round head with pointed ears and whiskers ─────────────────────────
const SPRITE_CAT_NEUTRAL: SpriteMatrix = [
  [0,1,1,0,0,0,0,0,0,0,1,1,0,0],
  [1,2,2,1,0,0,0,0,0,1,2,2,1,0],
  [1,2,2,1,3,3,3,3,3,1,2,2,1,0],
  [0,1,1,3,2,2,2,2,2,3,1,1,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,1,2,2,1,2,2,3,0,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,2,1,2,1,2,2,3,0,0,0],
  [0,0,3,2,1,1,1,1,1,2,3,0,0,0],
  [0,0,0,3,2,2,2,2,2,3,0,0,0,0],
  [0,0,0,0,3,3,2,2,3,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0,3,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const SPRITE_CAT_HAPPY: SpriteMatrix = [
  [0,1,1,0,0,0,0,0,0,0,1,1,0,0],
  [1,2,2,1,0,0,0,0,0,1,2,2,1,0],
  [1,2,2,1,3,3,3,3,3,1,2,2,1,0],
  [0,1,1,3,2,2,2,2,2,3,1,1,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,1,1,2,1,1,2,3,0,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,1,2,2,2,1,2,3,0,0,0],
  [0,0,3,2,2,1,1,1,2,2,3,0,0,0],
  [0,0,0,3,2,2,2,2,2,3,0,0,0,0],
  [0,0,0,0,3,3,2,2,3,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0,3,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const SPRITE_CAT_SAD: SpriteMatrix = [
  [0,1,1,0,0,0,0,0,0,0,1,1,0,0],
  [1,2,2,1,0,0,0,0,0,1,2,2,1,0],
  [1,2,2,1,3,3,3,3,3,1,2,2,1,0],
  [0,1,1,3,2,2,2,2,2,3,1,1,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,1,2,2,1,2,2,3,0,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,1,2,2,2,1,2,3,0,0,0],
  [0,0,3,2,2,1,1,1,2,2,3,0,0,0],
  [0,0,0,3,2,2,2,2,2,3,0,0,0,0],
  [0,0,0,0,3,3,2,2,3,3,0,0,0,0],
  [0,0,0,7,3,0,0,0,0,3,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ─── DOG — broad head with floppy ears and a square snout ─────────────────────
const SPRITE_DOG_NEUTRAL: SpriteMatrix = [
  [0,0,1,1,0,0,0,0,0,0,1,1,0,0],
  [0,1,2,2,1,0,0,0,0,1,2,2,1,0],
  [0,1,2,2,1,1,1,1,1,1,2,2,1,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,1,2,2,2,2,1,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,2,2,1,1,2,2,2,1,0,0],
  [0,0,1,2,2,1,1,1,1,2,2,1,0,0],
  [0,0,1,2,2,2,1,1,2,2,2,1,0,0],
  [0,0,0,1,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,0,1,1,2,2,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const SPRITE_DOG_HAPPY: SpriteMatrix = [
  [0,0,1,1,0,0,0,0,0,0,1,1,0,0],
  [0,1,2,2,1,0,0,0,0,1,2,2,1,0],
  [0,1,2,2,1,1,1,1,1,1,2,2,1,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,1,1,2,2,1,1,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,2,2,1,1,2,2,2,1,0,0],
  [0,0,1,2,1,1,1,1,1,1,2,1,0,0],
  [0,0,1,2,2,1,3,3,1,2,2,1,0,0],
  [0,0,0,1,2,2,3,3,2,2,1,0,0,0],
  [0,0,0,0,1,1,2,2,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const SPRITE_DOG_SAD: SpriteMatrix = [
  [0,0,1,1,0,0,0,0,0,0,1,1,0,0],
  [0,1,2,2,1,0,0,0,0,1,2,2,1,0],
  [0,1,2,2,1,1,1,1,1,1,2,2,1,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,1,2,2,2,2,1,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,2,1,1,1,1,2,2,1,0,0],
  [0,0,1,2,2,1,1,1,1,2,2,1,0,0],
  [0,0,1,2,2,2,1,1,2,2,2,1,0,0],
  [0,0,7,1,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,0,1,1,2,2,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ─── DEAD — ghost with X eyes (shared across types) ──────────────────────────
const SPRITE_DEAD: SpriteMatrix = [
  [0,0,0,0,3,3,3,3,3,0,0,0,0,0],
  [0,0,0,3,2,2,2,2,2,3,0,0,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,1,2,2,1,2,2,3,0,0,0],
  [0,0,3,2,1,1,2,1,1,2,3,0,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,2,1,1,1,2,2,3,0,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
  [0,0,3,2,0,3,2,3,0,2,3,0,0,0],
  [0,0,3,0,3,2,0,2,3,0,3,0,0,0],
  [0,0,3,0,0,0,0,0,0,0,3,0,0,0],
  [0,0,0,3,3,3,0,3,3,3,0,0,0,0],
];

// ─── Sprite Lookup ──────────────────────────────────────────────────────────

const SPRITES: Record<PetType, Record<'happy' | 'neutral' | 'sad', SpriteMatrix>> = {
  plant: { happy: SPRITE_PLANT_HAPPY, neutral: SPRITE_PLANT_NEUTRAL, sad: SPRITE_PLANT_SAD },
  cat:   { happy: SPRITE_CAT_HAPPY,   neutral: SPRITE_CAT_NEUTRAL,   sad: SPRITE_CAT_SAD },
  dog:   { happy: SPRITE_DOG_HAPPY,   neutral: SPRITE_DOG_NEUTRAL,   sad: SPRITE_DOG_SAD },
};

function getSprite(petType: PetType, mood: Mood): SpriteMatrix {
  if (mood === 'dead') return SPRITE_DEAD;
  const byMood = SPRITES[petType];
  if (mood === 'happy') return byMood.happy;
  if (mood === 'sad') return byMood.sad;
  return byMood.neutral;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface PetSpriteProps {
  petType: PetType;
  mood: Mood;
  cellSize?: number; // pt per pixel cell; defaults to the theme CELL_SIZE
}

export function PetSprite({ petType, mood, cellSize = CELL_SIZE }: PetSpriteProps): React.ReactElement {
  const sprite = getSprite(petType, mood);
  const [translateY] = useState(() => new Animated.Value(0));
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const isDead = mood === 'dead';

  useEffect(() => {
    let reducedMotion = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { reducedMotion = enabled; })
      .catch(() => undefined)
      .finally(() => {
        // Dead stays frozen; reduced-motion respected for everything else.
        if (isDead || reducedMotion) {
          translateY.setValue(0);
          return;
        }

        animRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, { toValue: -4, duration: 600, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        );
        animRef.current.start();
      });

    return () => {
      animRef.current?.stop();
    };
  }, [isDead, translateY]);

  const accessLabel =
    mood === 'dead'
      ? 'Pet sprite: ghost'
      : `Pet sprite: ${mood} ${petType}`;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      accessible
      accessibilityLabel={accessLabel}
    >
      {sprite.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((cell, colIdx) => {
            const color = PALETTE[cell] ?? 'transparent';
            return (
              <View
                key={colIdx}
                style={[
                  { width: cellSize, height: cellSize },
                  { backgroundColor: color === 'transparent' ? LCD_BG : color },
                ]}
              />
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
