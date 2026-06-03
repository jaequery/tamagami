import { NativeModule } from 'expo-modules-core';

/** Bluetooth adapter / authorization state mirrored from CoreBluetooth. */
export type BluetoothState =
  | 'poweredOn'
  | 'poweredOff'
  | 'unauthorized'
  | 'unsupported'
  | 'resetting'
  | 'unknown';

export interface PeerFoundEvent {
  /** Raw advertised payload string (see src/game/nearby.ts encode/decode). */
  payload: string;
  /** Signal strength; closer ≈ higher (less negative). */
  rssi: number;
}

export interface StateChangeEvent {
  role: 'central' | 'peripheral';
  state: BluetoothState;
}

export type TamagamiNearbyEvents = {
  onPeerFound: (event: PeerFoundEvent) => void;
  onStateChange: (event: StateChangeEvent) => void;
};

// `declare class extends NativeModule<Events>` is the canonical Expo-module
// typing: it inherits the EventEmitter surface (addListener/removeListener/…)
// with event names + payloads typed from TamagamiNearbyEvents.
export declare class TamagamiNearbyModule extends NativeModule<TamagamiNearbyEvents> {
  /** Always true on iOS; the JS wrapper additionally guards on module presence. */
  isSupported(): boolean;
  /** Begin advertising `payload` and scanning for peers. Idempotent; re-call to update payload. */
  start(payload: string): Promise<void>;
  /** Stop advertising + scanning and clear seen-peer throttle state. */
  stop(): Promise<void>;
}
