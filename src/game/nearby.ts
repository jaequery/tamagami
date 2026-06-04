// ─── Nearby (BLE) transport + payload codec ──────────────────────────────────
//
// Bridges the local Swift module `TamagamiNearby` (modules/tamagami-nearby).
// The native side advertises + scans; this file owns the *payload format* and a
// safe, optional wrapper so the JS app keeps running where the native module
// isn't linked (web, Expo Go, Android).
//
// SERVICE_UUID lives in the Swift module (TamagamiNearbyModule.swift) — the two
// MUST match. It isn't needed here because all BLE filtering happens natively.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';
import { DEVICE_ID_KEY } from './constants';
import type { PeerIdentity, PetType, Rarity } from './types';
import type {
  BluetoothState,
  PeerFoundEvent,
  StateChangeEvent,
  TamagamiNearbyModule,
} from '../../modules/tamagami-nearby/TamagamiNearby.types';

// Loaded optionally: null on platforms/builds without the native module.
const Native = requireOptionalNativeModule<TamagamiNearbyModule>('TamagamiNearby');

export function isNearbySupported(): boolean {
  return Native != null;
}

// ─── Payload codec ────────────────────────────────────────────────────────────
// Packed into the BLE advertisement's local-name field, which iOS caps at a
// couple dozen bytes — so keep it tiny: a prefix, the device id, a 1-char type
// code, and a truncated name.
//
// Delimiter is U+001F (Unit Separator). engine.sanitizeName() strips ALL control
// chars (U+0000–U+001F), so the separator can never collide with a pet name.
const PREFIX = 'TG';
const SEP = '\u001F'; // U+001F Unit Separator — never collides with a sanitized name
const NAME_MAX = 10;

const TYPE_TO_CODE: Record<PetType, string> = { plant: 'p', cat: 'c', dog: 'd' };
const CODE_TO_TYPE: Record<string, PetType> = { p: 'plant', c: 'cat', d: 'dog' };

const RARITY_TO_CODE: Record<Rarity, string> = {
  common: 'o', uncommon: 'u', rare: 'r', epic: 'e', secret: 's',
};
const CODE_TO_RARITY: Record<string, Rarity> = {
  o: 'common', u: 'uncommon', r: 'rare', e: 'epic', s: 'secret',
};

export function encodePayload(identity: PeerIdentity): string {
  const code = TYPE_TO_CODE[identity.petType];
  const rcode = RARITY_TO_CODE[identity.rarity];
  const name = identity.name.slice(0, NAME_MAX);
  return [PREFIX, identity.id, code, rcode, name].join(SEP);
}

export function decodePayload(raw: string): PeerIdentity | null {
  const parts = raw.split(SEP);
  // 5 fields = current (with rarity); 4 = legacy pre-rarity payloads → common.
  if (parts.length !== 4 && parts.length !== 5) return null;
  const prefix = parts[0];
  const id = parts[1];
  const code = parts[2];
  if (prefix !== PREFIX) return null;
  if (id.length === 0) return null;
  const petType = CODE_TO_TYPE[code];
  if (petType === undefined) return null;

  let rarity: Rarity = 'common';
  let name: string;
  if (parts.length === 5) {
    rarity = CODE_TO_RARITY[parts[3]] ?? 'common';
    name = parts[4];
  } else {
    name = parts[3];
  }
  return { id, name: name.length > 0 ? name : 'Pixel', petType, rarity };
}

// ─── Stable device identity ───────────────────────────────────────────────────
// One id per install, persisted independently of the pet save. Survives pet
// rename / restart so friends you've met still recognize you.

function generateId(): string {
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId !== null) return cachedDeviceId;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored !== null && stored.length > 0) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch {
    // fall through to generate
  }
  const fresh = generateId();
  cachedDeviceId = fresh;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  } catch {
    // best-effort; an ephemeral id is still fine for a session
  }
  return fresh;
}

// ─── Transport wrapper ────────────────────────────────────────────────────────

export interface NearbyHandlers {
  /** A peer's decoded identity (self-broadcasts are filtered out for you). */
  onPeer(peer: PeerIdentity, rssi: number): void;
  /** Bluetooth adapter / permission state changed. */
  onState?(state: BluetoothState): void;
}

export interface NearbySession {
  stop(): void;
}

/**
 * Begin advertising this pet and listening for peers. Returns a handle whose
 * stop() tears down both the BLE session and the JS listeners. No-op (returns a
 * stop() that does nothing) when the native module is unavailable.
 */
export function startNearby(self: PeerIdentity, handlers: NearbyHandlers): NearbySession {
  if (Native == null) {
    return { stop: () => undefined };
  }

  const subs: EventSubscription[] = [];

  subs.push(
    Native.addListener('onPeerFound', (event: PeerFoundEvent) => {
      const peer = decodePayload(event.payload);
      if (peer === null) return;
      if (peer.id === self.id) return; // ignore our own advertisement
      handlers.onPeer(peer, event.rssi);
    }),
  );

  if (handlers.onState) {
    const onState = handlers.onState;
    subs.push(
      Native.addListener('onStateChange', (event: StateChangeEvent) => {
        onState(event.state);
      }),
    );
  }

  void Native.start(encodePayload(self)).catch(() => undefined);

  return {
    stop: () => {
      void Native.stop().catch(() => undefined);
      for (const sub of subs) sub.remove();
    },
  };
}
