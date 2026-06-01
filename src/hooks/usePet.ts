import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  clean,
  createInitialPet,
  feed,
  getMood,
  heal,
  play,
  rename as engineRename,
  restart as engineRestart,
  simulate,
  toggleSleep,
} from '../game/engine';
import { initNotifications, rescheduleCareNotifications } from '../game/notifications';
import { loadPet, savePet } from '../game/storage';
import type { PetActions, PetState, UsePet } from '../game/types';

const TICK_INTERVAL_MS = 1000;
const PERSIST_INTERVAL_MS = 10_000;

export function usePet(): UsePet {
  const [pet, setPet] = useState<PetState>(() => createInitialPet('Pixel', Date.now()));
  const [loading, setLoading] = useState(true);

  // Refs for mutable state that callbacks close over. applyState() and the
  // bootstrap effect keep petRef in sync synchronously; this effect is the
  // backstop for any other setPet path.
  const petRef = useRef<PetState>(pet);
  useEffect(() => {
    petRef.current = pet;
  }, [pet]);

  const lastPersistRef = useRef<number>(0);

  // ── Persist helper ────────────────────────────────────────────────────────
  const persist = useCallback(async (state: PetState, force = false): Promise<void> => {
    const now = Date.now();
    if (!force && now - lastPersistRef.current < PERSIST_INTERVAL_MS) return;
    lastPersistRef.current = now;
    await savePet(state);
    await rescheduleCareNotifications(state);
  }, []);

  // ── Apply state + persist ─────────────────────────────────────────────────
  const applyState = useCallback(
    (next: PetState, forcePersist = false): void => {
      setPet(next);
      petRef.current = next;
      void persist(next, forcePersist);
    },
    [persist],
  );

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      await initNotifications();
      const loaded = await loadPet();
      if (cancelled) return;

      const base = loaded ?? createInitialPet('Pixel', Date.now());
      const simulated = simulate(base, Date.now());

      setPet(simulated);
      petRef.current = simulated;
      setLoading(false);

      await savePet(simulated);
      await rescheduleCareNotifications(simulated);
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  // ── Tick interval (1s) — only runs while app is foregrounded ─────────────
  // Fix #10: interval is created/cleared in step with AppState so it does not
  // fire while backgrounded (the AppState catch-up already handles that time).
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTick = useCallback(() => {
    if (tickIntervalRef.current !== null) return; // already running
    tickIntervalRef.current = setInterval(() => {
      const current = petRef.current;
      if (current.isDead) return;
      const next = simulate(current, Date.now());
      applyState(next);
    }, TICK_INTERVAL_MS);
  }, [applyState]);

  const stopTick = useCallback(() => {
    if (tickIntervalRef.current !== null) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    // Start immediately when loading finishes (app is foregrounded at this point)
    startTick();
    return stopTick;
  }, [loading, startTick, stopTick]);

  // ── AppState: catch-up on foreground, persist on background ──────────────
  useEffect(() => {
    if (loading) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Fix #8: skip simulate/persist I/O if the pet is already dead
        const current = petRef.current;
        if (current.isDead) return;

        const next = simulate(current, Date.now());
        applyState(next);

        // Fix #10: restart the tick interval when returning to foreground
        startTick();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Fix #10: pause the interval while backgrounded — no need to fire every second
        stopTick();
        void persist(petRef.current, true);
      }
    });

    return () => subscription.remove();
  }, [loading, applyState, persist, startTick, stopTick]);

  // ── Individual action callbacks ───────────────────────────────────────────
  const actionFeed = useCallback(() => {
    const next = feed(petRef.current, Date.now());
    applyState(next, true);
  }, [applyState]);

  const actionPlay = useCallback(() => {
    const next = play(petRef.current, Date.now());
    applyState(next, true);
  }, [applyState]);

  const actionToggleSleep = useCallback(() => {
    const next = toggleSleep(petRef.current, Date.now());
    applyState(next, true);
  }, [applyState]);

  const actionClean = useCallback(() => {
    const next = clean(petRef.current, Date.now());
    applyState(next, true);
  }, [applyState]);

  const actionHeal = useCallback(() => {
    const next = heal(petRef.current, Date.now());
    applyState(next, true);
  }, [applyState]);

  const actionRestart = useCallback((name?: string) => {
    const next = engineRestart(petRef.current, Date.now(), name);
    applyState(next, true);
  }, [applyState]);

  const actionRename = useCallback((name: string) => {
    const next = engineRename(petRef.current, name);
    applyState(next, true);
  }, [applyState]);

  // Fix #7: stable actions object — identity only changes when a callback dep changes
  const actions: PetActions = useMemo(() => ({
    feed: actionFeed,
    play: actionPlay,
    toggleSleep: actionToggleSleep,
    clean: actionClean,
    heal: actionHeal,
    restart: actionRestart,
    rename: actionRename,
  }), [actionFeed, actionPlay, actionToggleSleep, actionClean, actionHeal, actionRestart, actionRename]);

  return {
    pet,
    actions,
    loading,
    mood: getMood(pet),
  };
}
