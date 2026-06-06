// ─── Cosmetics ──────────────────────────────────────────────────────────────
// Accessories the cat can WEAR: hats, glasses, collars. A "realistic store" item
// layer on top of the economy (GAME.md's surprise-over-choice store — no gacha).
// Buying costs coins (the engine charges it); equipping is free and per-slot, so
// a crown + shades + collar can be worn together (great for the share card).
//
// Everything here is a PURE function over PetCosmetics (no I/O, no stats). The
// engine owns anything that also touches coins (buying). The renderer
// (components/PetSprite) draws compositeOverlay() on top of the base sprite.
//
// Overlays reuse the EXACT index scheme of the sprite matrices (see PetSprite),
// so accessories stay on the LCD palette and a future Swift widget can mirror
// these matrices verbatim — the same sync contract the sprites already have:
//   0 transparent · 1 dark · 2 mid · 3 light · 4 white · 5 warning · 6 shell · 7 tear

import type { PetCosmetics } from './types';

// Each accessory occupies exactly one slot; a slot holds at most one item, so
// items in different slots layer freely.
export type AccessorySlot = 'head' | 'face' | 'neck';

// Paint order when compositing (no two slots overlap on the cat, so order is
// only a tiebreak — kept stable for determinism + the Swift mirror).
export const SLOTS: readonly AccessorySlot[] = ['neck', 'face', 'head'];

export interface AccessoryDef {
  id:      string;
  title:   string;
  slot:    AccessorySlot;
  glyph:   string;        // single pixel-font char shown on the shop row
  price:   number;        // coins
  overlay: number[][];    // GRID×GRID, sprite index scheme (0 = transparent)
}

// The sprite grid is 14×14 (mirror of PetSprite); overlays must match exactly.
export const GRID = 14;

// Build a GRID×GRID overlay from a sparse {row: [[col, index], …]} spec, so each
// accessory reads as the handful of lit cells it actually is, not a wall of zeros.
function paint(spec: Record<number, ReadonlyArray<readonly [number, number]>>): number[][] {
  const grid: number[][] = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
  for (const [rowStr, cells] of Object.entries(spec)) {
    const row = Number(rowStr);
    for (const [col, idx] of cells) grid[row][col] = idx;
  }
  return grid;
}

// ─── Catalog ──────────────────────────────────────────────────────────────────
// Positions are tuned to the cat sprite: eyes at rows 5–6, neck at rows 9–10,
// the crown of the head between the ears at rows 0–1.

export const ACCESSORIES: readonly AccessoryDef[] = [
  // NECK ──────────────────────────────────────────────────────────────────────
  {
    id: 'collar', title: 'COLLAR', slot: 'neck', glyph: 'o', price: 25,
    overlay: paint({
      9:  [[4, 1], [5, 1], [6, 1], [7, 1], [8, 1]], // dark band around the neck
      10: [[6, 5]],                                  // a little warning-bright tag
    }),
  },
  {
    id: 'bandana', title: 'BANDANA', slot: 'neck', glyph: 'v', price: 35,
    overlay: paint({
      9:  [[4, 2], [5, 2], [6, 2], [7, 2], [8, 2]], // kerchief band
      10: [[5, 2], [6, 2], [7, 2]],
      11: [[6, 2]],                                  // knotted point
    }),
  },
  // FACE ──────────────────────────────────────────────────────────────────────
  {
    id: 'shades', title: 'SHADES', slot: 'face', glyph: '=', price: 60,
    overlay: paint({
      5: [[3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1]], // top bar
      6: [[3, 1], [4, 4], [5, 1], [7, 1], [8, 4], [9, 1]],         // lenses + glints
    }),
  },
  // HEAD ──────────────────────────────────────────────────────────────────────
  {
    id: 'bow', title: 'BOW', slot: 'head', glyph: '8', price: 45,
    overlay: paint({
      0: [[5, 5], [7, 5]],                                  // loop tips
      1: [[4, 5], [5, 5], [6, 1], [7, 5], [8, 5]],          // loops + dark knot
    }),
  },
  {
    id: 'crown', title: 'CROWN', slot: 'head', glyph: 'W', price: 150,
    overlay: paint({
      0: [[4, 5], [6, 5], [8, 5]],                          // three points
      1: [[4, 5], [5, 5], [6, 5], [7, 5], [8, 5]],          // band
    }),
  },
];

export const MAX_ACCESSORIES = ACCESSORIES.length;

// ─── Factory ──────────────────────────────────────────────────────────────────

export function defaultCosmetics(): PetCosmetics {
  return { owned: [], equipped: { head: null, face: null, neck: null } };
}

// ─── Lookups ────────────────────────────────────────────────────────────────--

export function accessoryById(id: string | null): AccessoryDef | null {
  if (id === null) return null;
  return ACCESSORIES.find((a) => a.id === id) ?? null;
}

export function ownsAccessory(cos: PetCosmetics, id: string): boolean {
  return cos.owned.includes(id);
}

export function isCosmeticEquipped(cos: PetCosmetics, id: string): boolean {
  const def = accessoryById(id);
  if (def === null) return false;
  return cos.equipped[def.slot] === id;
}

// ─── Pure transforms (no coins) ───────────────────────────────────────────────
// Each returns the cosmetics unchanged when the action isn't valid, so the UI's
// guards and the model's guards never disagree (mirrors economy.ts).

/** Acquire an accessory and wear it (buying auto-equips). No-op for unknown ids;
 *  re-acquiring something already owned just (re)equips it, never duplicates. */
export function acquireCosmetic(cos: PetCosmetics, id: string): PetCosmetics {
  const def = accessoryById(id);
  if (def === null) return cos;
  const owned = cos.owned.includes(id) ? cos.owned : [...cos.owned, id];
  return { owned, equipped: { ...cos.equipped, [def.slot]: id } };
}

/** Toggle an owned accessory: wear it, or take it off if it's the one already on
 *  in its slot. No-op if unknown or not owned. */
export function toggleCosmetic(cos: PetCosmetics, id: string): PetCosmetics {
  const def = accessoryById(id);
  if (def === null || !cos.owned.includes(id)) return cos;
  const next = cos.equipped[def.slot] === id ? null : id;
  return { ...cos, equipped: { ...cos.equipped, [def.slot]: next } };
}

// ─── Render ─────────────────────────────────────────────────────────────────--

/**
 * Composite every equipped accessory into one GRID×GRID overlay of sprite
 * indices (0 = nothing here, let the base sprite show through). Returns null
 * when nothing is worn, so the renderer can skip the overlay entirely.
 */
export function compositeOverlay(cos: PetCosmetics): number[][] | null {
  let any = false;
  const grid: number[][] = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
  for (const slot of SLOTS) {
    const def = accessoryById(cos.equipped[slot]);
    if (def === null) continue;
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (def.overlay[r][c] !== 0) {
          grid[r][c] = def.overlay[r][c];
          any = true;
        }
      }
    }
  }
  return any ? grid : null;
}
