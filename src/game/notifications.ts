import * as Notifications from 'expo-notifications';
import { nextStageAt } from './engine';
import type { PetState } from './types';

// Identifier prefix for care notifications so we can batch-cancel them
const CARE_NOTIFICATION_PREFIX = 'tama-care-';

// Track whether permission was granted so we avoid re-requesting every call.
// May be stale after a mid-session grant; refreshed lazily in rescheduleCareNotifications.
let _permissionGranted = false;

// In-flight guard to prevent concurrent cancel/schedule interleaving
let _rescheduling = false;

export async function initNotifications(): Promise<boolean> {
  try {
    // Set foreground notification handler — show banner while app is open
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: false,
      },
    });

    _permissionGranted = status === 'granted';
    return _permissionGranted;
  } catch {
    return false;
  }
}

export async function rescheduleCareNotifications(state: PetState): Promise<void> {
  // Serialize: skip if a reschedule is already in progress
  if (_rescheduling) return;
  _rescheduling = true;

  try {
    if (state.isDead) return;

    // Fix #9: if the cached flag is false, re-query to handle mid-session grants
    // or the fast-resume race before initNotifications completes.
    if (!_permissionGranted) {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        _permissionGranted = status === 'granted';
      } catch {
        // getPermissionsAsync failed — keep existing flag, bail gracefully
        return;
      }
    }

    if (!_permissionGranted) return;

    // Cancel all previously scheduled care notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const cancelPromises = scheduled
      .filter((n) => n.identifier.startsWith(CARE_NOTIFICATION_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier));
    await Promise.all(cancelPromises);

    if (state.isSleeping) return;

    const projections = nextStageAt(state);
    const now = Date.now();

    const schedulePromises = projections
      .filter((p) => p.triggerAtMs > now + 60_000) // only schedule if at least 1 min in the future
      .map((p) => {
        const secondsFromNow = Math.round((p.triggerAtMs - now) / 1000);
        return Notifications.scheduleNotificationAsync({
          identifier: `${CARE_NOTIFICATION_PREFIX}${p.stat}`,
          content: {
            title: 'Your pet needs you!',
            body: p.label,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsFromNow,
          },
        });
      });

    await Promise.all(schedulePromises);
  } catch {
    // Silently ignore — notifications are best-effort
  } finally {
    _rescheduling = false;
  }
}
