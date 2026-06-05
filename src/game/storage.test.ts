import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPet, savePet } from './storage';
import { createInitialPet } from './engine';
import { STORAGE_KEY } from './constants';
import { rollOrigin } from './origins';
import { rollHousehold } from './household';
import { BOND_SEED } from './bond';
import { OWNER_MOOD_SEED } from './ownerLife';

const NOW = 1_700_000_000_000;

afterEach(async () => {
  await AsyncStorage.clear();
});

describe('storage — origin/household round-trip + tolerance', () => {
  it('persists and reloads the dealt origin + household intact', async () => {
    const pet = createInitialPet('Maple', 'cat', NOW);
    await savePet(pet);
    const loaded = await loadPet();
    expect(loaded).not.toBeNull();
    expect(loaded!.origin).toBe(pet.origin);
    expect(loaded!.household).toBe(pet.household);
  });

  it('self-heals a legacy v3 save with no origin/household (no reset)', async () => {
    // Simulate a pre-§1/§2 save: a valid v3 state missing the new fields.
    const pet = createInitialPet('Legacy', 'cat', NOW);
    const legacy = JSON.parse(JSON.stringify(pet)) as Record<string, unknown>;
    delete legacy.origin;
    delete legacy.household;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = await loadPet();
    // The save is NOT rejected — the fields are re-derived deterministically to
    // exactly what this birth identity would have rolled.
    expect(loaded).not.toBeNull();
    expect(loaded!.origin).toBe(rollOrigin(NOW, 'Legacy', 'cat', pet.rarity));
    expect(loaded!.household).toBe(rollHousehold(NOW, 'Legacy', 'cat'));
  });

  it('repairs a malformed origin/household instead of invalidating the save', async () => {
    const pet = createInitialPet('Patch', 'cat', NOW);
    const corrupt = JSON.parse(JSON.stringify(pet)) as Record<string, unknown>;
    corrupt.origin = 'not_a_real_origin';
    corrupt.household = 'garbage:value';
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(corrupt));

    const loaded = await loadPet();
    expect(loaded).not.toBeNull();
    expect(loaded!.origin).toBe(pet.origin);
    expect(loaded!.household).toBe(pet.household);
  });

  it('round-trips the §3/§5/§9 fields and seeds them on a legacy save', async () => {
    const pet = { ...createInitialPet('Sol', 'cat', NOW), bond: 64, ownerMood: 30, lastTreatedDay: 19_500 };
    await savePet(pet);
    const loaded = await loadPet();
    expect(loaded!.bond).toBe(64);
    expect(loaded!.ownerMood).toBe(30);
    expect(loaded!.lastTreatedDay).toBe(19_500);

    // A legacy save missing all three is repaired to seeds, not rejected.
    const legacy = JSON.parse(JSON.stringify(pet)) as Record<string, unknown>;
    delete legacy.bond;
    delete legacy.ownerMood;
    delete legacy.lastTreatedDay;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const healed = await loadPet();
    expect(healed).not.toBeNull();
    expect(healed!.bond).toBe(BOND_SEED);
    expect(healed!.ownerMood).toBe(OWNER_MOOD_SEED);
    expect(healed!.lastTreatedDay).toBeNull();
  });
});
