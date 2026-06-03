// ─── useNearby ────────────────────────────────────────────────────────────────
//
// Owns the BLE social loop for a live pet:
//   • advertise + scan while the pet is alive AND the app is foregrounded
//     (iOS only surfaces advertisements reliably in the foreground)
//   • on each peer sighting: log the encounter, and if it's outside the per-peer
//     cooldown, apply a one-off social boost and flag a "meet" for the UI
//
// Mirrors usePet's lifecycle discipline: tied to primitives (name/type/isDead),
// not the per-tick pet object, so the BLE session isn't torn down every second.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { BluetoothState } from '../../modules/tamagami-nearby/TamagamiNearby.types';
import { getFriends, recordEncounter } from '../game/friends';
import { getDeviceId, isNearbySupported, startNearby } from '../game/nearby';
import type { NearbySession } from '../game/nearby';
import type { Friend, PeerIdentity, PetState } from '../game/types';

// Clear the "nearby" badge if a peer hasn't been seen for this long.
const PRESENCE_TTL_MS = 20_000;

export interface NearbyPeer {
  friend: Friend;
  rssi: number;
  seenAt: number;
}

/** A boost-eligible meet to celebrate. `nonce` keys the animation so repeat
 *  meets remount a fresh pop even when it's the same peer. */
export interface MeetEvent {
  nonce: number;
  peer: Friend;
}

export interface UseNearby {
  supported: boolean;
  bluetoothState: BluetoothState | null;
  nearby: NearbyPeer | null; // currently-visible peer (most recent sighting)
  friends: Friend[];
  meet: MeetEvent | null;    // latest boost-eligible meet → drives the celebration
  clearMeet: () => void;     // call when the celebration finishes
}

export function useNearby(pet: PetState, socialize: () => void): UseNearby {
  const supported = isNearbySupported();

  const [bluetoothState, setBluetoothState] = useState<BluetoothState | null>(null);
  const [nearby, setNearby] = useState<NearbyPeer | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [meet, setMeet] = useState<MeetEvent | null>(null);

  const deviceIdRef = useRef<string | null>(null);
  const sessionRef = useRef<NearbySession | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meetCounterRef = useRef(0);

  // Keep the latest socialize callback without making it a session dependency.
  const socializeRef = useRef(socialize);
  useEffect(() => {
    socializeRef.current = socialize;
  }, [socialize]);

  // ── Initial friends load ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void getFriends().then((f) => {
      if (!cancelled) setFriends(f);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Peer sighting handler ───────────────────────────────────────────────────
  const handlePeer = useCallback((peer: PeerIdentity, rssi: number) => {
    const now = Date.now();
    void recordEncounter(peer, now).then(({ friend, shouldBoost }) => {
      setNearby({ friend, rssi, seenAt: now });

      // (Re)arm presence expiry so the badge fades after the peer leaves.
      if (presenceTimerRef.current !== null) clearTimeout(presenceTimerRef.current);
      presenceTimerRef.current = setTimeout(() => setNearby(null), PRESENCE_TTL_MS);

      if (shouldBoost) {
        socializeRef.current();
        meetCounterRef.current += 1;
        setMeet({ nonce: meetCounterRef.current, peer: friend });
        void getFriends().then(setFriends);
      }
    });
  }, []);

  const clearMeet = useCallback(() => setMeet(null), []);

  // ── BLE session lifecycle ───────────────────────────────────────────────────
  const petName = pet.name;
  const petType = pet.petType;
  const isDead = pet.isDead;

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;
    let appActive = AppState.currentState === 'active';

    const stopSession = (): void => {
      sessionRef.current?.stop();
      sessionRef.current = null;
      setNearby(null);
      if (presenceTimerRef.current !== null) {
        clearTimeout(presenceTimerRef.current);
        presenceTimerRef.current = null;
      }
    };

    const ensureStarted = async (): Promise<void> => {
      if (cancelled || sessionRef.current !== null) return;
      if (isDead || !appActive) return;

      const id = deviceIdRef.current ?? (await getDeviceId());
      if (cancelled) return;
      deviceIdRef.current = id;

      const self: PeerIdentity = { id, name: petName, petType };
      sessionRef.current = startNearby(self, {
        onPeer: handlePeer,
        onState: setBluetoothState,
      });
    };

    void ensureStarted();

    const sub = AppState.addEventListener('change', (s) => {
      appActive = s === 'active';
      if (appActive) void ensureStarted();
      else stopSession();
    });

    return () => {
      cancelled = true;
      sub.remove();
      stopSession();
    };
  }, [supported, petName, petType, isDead, handlePeer]);

  return { supported, bluetoothState, nearby, friends, meet, clearMeet };
}
