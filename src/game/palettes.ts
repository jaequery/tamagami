// ─── Rarity palettes ──────────────────────────────────────────────────────────
//
// Each rarity wears a different LCD palette — the same trick real Game Boys used
// (DMG green, Pocket grey, the Light's warm screen, Super Game Boy tints). Color
// becomes status AND mystery AND, for 'secret', a built-in night mode.
//
// 'common' deliberately reuses the existing theme tokens, so a common pet looks
// EXACTLY like the app does today — we add rarity on top of the soul, we don't
// repaint it. The four-shade ramp goes lightest → darkest:
//   bg     screen background (behind the sprite)
//   shade1 light pixel
//   shade2 mid pixel
//   dark   darkest pixel / ink (text drawn in this color reads on `bg`)
//   off    "unpowered" dim pixel for empty stat segments
//
// For 'secret' the ramp is inverted (dark bg, light ink) — a glowing night
// creature. Because UI in a palette draws text in `dark` on a `bg` fill, that
// inversion themes cards/codex/reveal automatically with no special-casing.

import type { Rarity } from './types';
import {
  LCD_BG,
  LCD_SHADE1,
  LCD_SHADE2,
  LCD_DARK,
  LCD_OFF,
} from '../theme';

export interface LcdPalette {
  bg: string;
  shade1: string;
  shade2: string;
  dark: string;
  off: string;
}

const PALETTES: Record<Rarity, LcdPalette> = {
  // DMG green — identical to the live theme.
  common: {
    bg: LCD_BG,
    shade1: LCD_SHADE1,
    shade2: LCD_SHADE2,
    dark: LCD_DARK,
    off: LCD_OFF,
  },
  // Game Boy Pocket — olive-grey greyscale.
  uncommon: {
    bg: '#C5C7B0',
    shade1: '#9A9C84',
    shade2: '#54563F',
    dark: '#1B1C12',
    off: '#B4B69E',
  },
  // Game Boy Light — warm amber/cream.
  rare: {
    bg: '#E8D8A0',
    shade1: '#CBA94C',
    shade2: '#8A5A1E',
    dark: '#3A2008',
    off: '#DBC986',
  },
  // Super Game Boy — royal indigo/violet.
  epic: {
    bg: '#BFC4EC',
    shade1: '#8A86D8',
    shade2: '#4B3A8C',
    dark: '#1B1140',
    off: '#AAAFDC',
  },
  // Lunar night — inverted: dark sky, glowing creature.
  secret: {
    bg: '#0B1026',
    shade1: '#27315E',
    shade2: '#5C6DB6',
    dark: '#CBD6FF',
    off: '#161C3A',
  },
};

export function paletteForRarity(rarity: Rarity): LcdPalette {
  return PALETTES[rarity];
}

// ─── Accent for rarity chips / borders ────────────────────────────────────────
// A single saturated swatch per rarity, used for the rarity tag on cards and
// codex so rarity is legible at a glance even against the LCD ramp.
const RARITY_ACCENT: Record<Rarity, string> = {
  common: '#306230',
  uncommon: '#6B6E55',
  rare: '#B07A1E',
  epic: '#6A4BC8',
  secret: '#7E8EE6',
};

export function rarityAccent(rarity: Rarity): string {
  return RARITY_ACCENT[rarity];
}
