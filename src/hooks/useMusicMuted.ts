import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tamagami.music.muted';

/**
 * Persisted background-music mute preference. Defaults to *unmuted* (music on)
 * so the soundtrack plays for new players; the choice survives relaunches.
 *
 * Returns `[muted, toggle]`. The write is fire-and-forget — a failed save just
 * means the preference doesn't persist, never a crash.
 */
export function useMusicMuted(): readonly [boolean, () => void] {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(KEY).then((v) => {
      if (alive && v === '1') setMuted(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback(() => {
    setMuted((cur) => {
      const next = !cur;
      void AsyncStorage.setItem(KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  return [muted, toggle] as const;
}
