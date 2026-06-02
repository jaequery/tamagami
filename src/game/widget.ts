import { Platform } from 'react-native';
import { ExtensionStorage } from '@bacons/apple-targets';
import type { PetState } from './types';

/** App Group shared between the app and the iOS widget extension.
 *  Must match `ios.entitlements` in app.json and the widget's expo-target.config.js. */
export const WIDGET_APP_GROUP = 'group.com.tamagotcha.app';

/** Key under which the full PetState (JSON string) is written for the widget to read. */
export const WIDGET_PET_KEY = 'petState';

const storage = new ExtensionStorage(WIDGET_APP_GROUP);

/**
 * Mirror the current pet into the App Group so the iOS home-screen / lock-screen
 * widget can read it and project the decay forward on its own timeline.
 *
 * Best-effort and fully crash-safe: on non-iOS, in Expo Go, or wherever the
 * native ExtensionStorage module is absent, the underlying calls are no-ops and
 * this function never throws.
 *
 * @param reload when true, also asks WidgetKit to refresh the widget timeline.
 *               Pass true on user actions / backgrounding; false for routine ticks.
 */
export function syncWidget(state: PetState, reload = false): void {
  if (Platform.OS !== 'ios') return;
  try {
    storage.set(WIDGET_PET_KEY, JSON.stringify(state));
    if (reload) ExtensionStorage.reloadWidget();
  } catch {
    // Widget mirroring is best-effort — never let it break the app.
  }
}
