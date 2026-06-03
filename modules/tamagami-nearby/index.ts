// Local Expo native module: BLE nearby-pet discovery (iOS only).
//
// Prefer importing through `src/game/nearby.ts`, which loads this OPTIONALLY
// (requireOptionalNativeModule) so the JS app still runs on web / Expo Go /
// any build where the native module isn't linked. This barrel is the strict
// accessor used once the module is known to exist.
import { requireNativeModule } from 'expo-modules-core';

import type { TamagamiNearbyModule } from './TamagamiNearby.types';

export default requireNativeModule<TamagamiNearbyModule>('TamagamiNearby');

export type {
  BluetoothState,
  PeerFoundEvent,
  StateChangeEvent,
  TamagamiNearbyEvents,
  TamagamiNearbyModule,
} from './TamagamiNearby.types';
