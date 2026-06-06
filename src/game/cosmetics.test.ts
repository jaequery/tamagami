import {
  ACCESSORIES,
  GRID,
  SLOTS,
  accessoryById,
  acquireCosmetic,
  compositeOverlay,
  defaultCosmetics,
  isCosmeticEquipped,
  ownsAccessory,
  toggleCosmetic,
} from './cosmetics';

describe('catalog integrity', () => {
  it('every accessory has a unique id and a known slot', () => {
    const ids = ACCESSORIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACCESSORIES) {
      expect(SLOTS).toContain(a.slot);
      expect(a.price).toBeGreaterThan(0);
      expect(a.glyph.length).toBeGreaterThan(0);
    }
  });

  it('every overlay is a GRID×GRID matrix of valid sprite indices', () => {
    for (const a of ACCESSORIES) {
      expect(a.overlay).toHaveLength(GRID);
      for (const row of a.overlay) {
        expect(row).toHaveLength(GRID);
        for (const cell of row) {
          expect(cell).toBeGreaterThanOrEqual(0);
          expect(cell).toBeLessThanOrEqual(7);
        }
      }
    }
  });

  it('accessoryById resolves real ids and rejects junk/null', () => {
    expect(accessoryById('collar')?.id).toBe('collar');
    expect(accessoryById('nope')).toBeNull();
    expect(accessoryById(null)).toBeNull();
  });
});

describe('defaultCosmetics', () => {
  it('starts with nothing owned and nothing worn', () => {
    const cos = defaultCosmetics();
    expect(cos.owned).toEqual([]);
    expect(cos.equipped).toEqual({ head: null, face: null, neck: null });
  });
});

describe('acquireCosmetic', () => {
  it('buying adds to owned and auto-equips its slot', () => {
    const cos = acquireCosmetic(defaultCosmetics(), 'crown');
    expect(cos.owned).toEqual(['crown']);
    expect(cos.equipped.head).toBe('crown');
    expect(isCosmeticEquipped(cos, 'crown')).toBe(true);
  });

  it('re-acquiring an owned item never duplicates it', () => {
    let cos = acquireCosmetic(defaultCosmetics(), 'collar');
    cos = toggleCosmetic(cos, 'collar'); // take it off
    cos = acquireCosmetic(cos, 'collar'); // "buy" again → just re-wears
    expect(cos.owned).toEqual(['collar']);
    expect(cos.equipped.neck).toBe('collar');
  });

  it('a new item in an occupied slot replaces what was worn there', () => {
    let cos = acquireCosmetic(defaultCosmetics(), 'crown'); // head
    cos = acquireCosmetic(cos, 'bow');                      // also head
    expect(cos.equipped.head).toBe('bow');
    expect(cos.owned).toContain('crown'); // still owned, just not worn
    expect(isCosmeticEquipped(cos, 'crown')).toBe(false);
  });

  it('ignores unknown ids', () => {
    expect(acquireCosmetic(defaultCosmetics(), 'nope')).toEqual(defaultCosmetics());
  });
});

describe('toggleCosmetic', () => {
  it('wears, then removes, an owned accessory', () => {
    let cos = acquireCosmetic(defaultCosmetics(), 'shades');
    expect(cos.equipped.face).toBe('shades');
    cos = toggleCosmetic(cos, 'shades');
    expect(cos.equipped.face).toBeNull();
    cos = toggleCosmetic(cos, 'shades');
    expect(cos.equipped.face).toBe('shades');
  });

  it('does nothing for an unowned accessory', () => {
    const cos = defaultCosmetics();
    expect(toggleCosmetic(cos, 'crown')).toEqual(cos);
  });

  it('ownsAccessory reflects the owned set', () => {
    const cos = acquireCosmetic(defaultCosmetics(), 'bandana');
    expect(ownsAccessory(cos, 'bandana')).toBe(true);
    expect(ownsAccessory(cos, 'crown')).toBe(false);
  });
});

describe('compositeOverlay', () => {
  it('is null when nothing is worn', () => {
    expect(compositeOverlay(defaultCosmetics())).toBeNull();
  });

  it('layers items from different slots into one grid', () => {
    let cos = acquireCosmetic(defaultCosmetics(), 'crown');  // head
    cos = acquireCosmetic(cos, 'shades');                    // face
    cos = acquireCosmetic(cos, 'collar');                    // neck
    const grid = compositeOverlay(cos);
    expect(grid).not.toBeNull();
    const crown = accessoryById('crown')!;
    const shades = accessoryById('shades')!;
    const collar = accessoryById('collar')!;
    // Each item's lit cells survive into the composite.
    for (const def of [crown, shades, collar]) {
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (def.overlay[r][c] !== 0) expect(grid![r][c]).toBe(def.overlay[r][c]);
        }
      }
    }
  });

  it('a removed item stops contributing to the overlay', () => {
    let cos = acquireCosmetic(defaultCosmetics(), 'collar');
    cos = toggleCosmetic(cos, 'collar');
    expect(compositeOverlay(cos)).toBeNull();
  });
});
