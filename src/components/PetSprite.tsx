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
import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import type { LifeStage, Mood, PetType } from '../game/types';
import { paletteForRarity, type LcdPalette } from '../game/palettes';
import type { PetActivity, OverlayGlyph } from '../game/animations';
import { usePetAnimation } from './usePetAnimation';
import { PixelText } from './PixelText';
import {
  COLOR_WARNING,
  COLOR_TEAR,
  SHELL_LIGHT,
  CELL_SIZE,
  LCD_DARK,
  SPACE_2,
} from '../theme';

type SpriteMatrix = number[][];

// Default tint: classic DMG green — so a common pet renders byte-for-byte as the
// app always has. Rarity palettes (game/palettes.ts) override indices 1/2/3.
const COMMON_PALETTE = paletteForRarity('common');

/**
 * Resolve a sprite cell index to a concrete color for the given palette.
 *   0 → background (transparent cell; caller decides what shows through)
 *   1/2/3 → the rarity ramp (dark → light)
 *   4 white highlight, 5 warning, 6 shell accent, 7 tear — semantic, palette-independent
 */
function cellColor(cell: number, palette: LcdPalette, background: string): string {
  switch (cell) {
    case 1: return palette.dark;
    case 2: return palette.shade2;
    case 3: return palette.shade1;
    case 4: return '#FFFFFF';
    case 5: return COLOR_WARNING;
    case 6: return SHELL_LIGHT;
    case 7: return COLOR_TEAR;
    default: return background; // 0 / unknown
  }
}

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

// ─── EGG — pre-hatch mystery (shared across types; rarity hides inside) ───────
const SPRITE_EGG: SpriteMatrix = [
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,3,3,3,3,1,1,0,0,0],
  [0,0,1,3,3,3,3,3,3,3,3,1,0,0],
  [0,1,3,3,3,3,3,3,3,3,3,3,1,0],
  [0,1,3,3,3,2,3,3,3,3,3,3,1,0],
  [1,3,3,3,3,3,3,3,3,2,3,3,3,1],
  [1,3,3,2,3,3,3,3,3,3,3,3,3,1],
  [1,3,3,3,3,3,3,2,3,3,3,3,3,1],
  [1,3,3,3,3,3,3,3,3,3,3,2,3,1],
  [1,3,3,3,2,3,3,3,3,3,3,3,3,1],
  [0,1,3,3,3,3,3,3,2,3,3,3,1,0],
  [0,1,3,3,3,3,3,3,3,3,3,3,1,0],
  [0,0,1,1,3,3,3,3,3,3,1,1,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0],
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

// Floating overlay glyphs (driven by usePetAnimation) → a single pixel char.
// 'none' renders nothing.
const GLYPH_CHAR: Record<Exclude<OverlayGlyph, 'none'>, string> = {
  zzz:   'Z',
  note:  '♪',
  heart: '♥',
  crumb: '•',
  spark: '✦',
};

// ─── Component ──────────────────────────────────────────────────────────────

interface PetSpriteProps {
  petType: PetType;
  mood: Mood;
  stage?: LifeStage;      // 'egg' renders the egg sprite (rarity stays hidden inside)
  palette?: LcdPalette;   // rarity tint; defaults to common (DMG green)
  background?: string;    // color shown through transparent cells; defaults to palette.bg
  cellSize?: number;      // pt per pixel cell; defaults to the theme CELL_SIZE
  // ── Motion (all optional; omitting them = the classic gentle idle bob) ──
  activity?: { key: PetActivity; nonce: number }; // bump nonce ⇒ play once
  ambient?: boolean;      // enable the self-driven idle scheduler (default false)
  isNight?: boolean;      // gate night-only ambient activities (default false)
}

export function PetSprite({
  petType,
  mood,
  stage,
  palette = COMMON_PALETTE,
  background,
  cellSize = CELL_SIZE,
  activity,
  ambient = false,
  isNight = false,
}: PetSpriteProps): React.ReactElement {
  const isEgg = stage === 'egg';
  const sprite = isEgg ? SPRITE_EGG : getSprite(petType, mood);
  const bg = background ?? palette.bg;

  // An egg gently wobbles (it's incubating, not dead); a ghost stays frozen.
  const isDead = mood === 'dead' && !isEgg;

  // All motion (idle bob, one-shot activities, ambient wandering, overlay glyph)
  // lives in the hook so this component stays a pure renderer.
  const { animatedStyle, overlayGlyph, overlayStyle } = usePetAnimation({
    isEgg,
    isDead,
    ambient,
    isNight,
    activity,
  });

  const accessLabel = isEgg
    ? 'Pet sprite: unhatched egg'
    : mood === 'dead'
      ? 'Pet sprite: ghost'
      : `Pet sprite: ${mood} ${petType}`;

  return (
    <Animated.View
      style={[styles.container, { transform: animatedStyle.transform }]}
      accessible
      accessibilityLabel={accessLabel}
    >
      {sprite.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((cell, colIdx) => (
            <View
              key={colIdx}
              style={[
                { width: cellSize, height: cellSize },
                { backgroundColor: cellColor(cell, palette, bg) },
              ]}
            />
          ))}
        </View>
      ))}

      {/* Floating glyph above the sprite — absolute so it never shifts layout. */}
      {overlayGlyph !== 'none' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.overlay,
            { opacity: overlayStyle.opacity, transform: overlayStyle.transform },
          ]}
        >
          <PixelText variant="tiny" color={LCD_DARK}>
            {GLYPH_CHAR[overlayGlyph]}
          </PixelText>
        </Animated.View>
      )}
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
  // Floats near the sprite's top-right; absolute so it's out of the layout flow.
  overlay: {
    position: 'absolute',
    top: 0,
    right: -SPACE_2,
  },
});
