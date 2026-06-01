import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_VERSION, STORAGE_KEY } from './constants';
import type { PetState } from './types';

export async function loadPet(): Promise<PetState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);

    // Defensive validation: ensure the parsed value looks like a PetState
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).version !== 'number' ||
      (parsed as Record<string, unknown>).version !== CURRENT_VERSION ||
      typeof (parsed as Record<string, unknown>).name !== 'string' ||
      typeof (parsed as Record<string, unknown>).lastTick !== 'number' ||
      typeof (parsed as Record<string, unknown>).stats !== 'object'
    ) {
      return null;
    }

    return parsed as PetState;
  } catch {
    // Corrupt data or parse error — caller will hatch a fresh pet
    return null;
  }
}

export async function savePet(state: PetState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort: storage errors are non-fatal
  }
}
