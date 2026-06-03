import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  createInitialPet,
  feed,
  getMood,
  play,
  rename as engineRename,
  simulate,
  socialize,
  water,
} from '../game/engine';
import { initNotifications, rescheduleCareNotifications } from '../game/notifications';
import { clearPet, loadPet, savePet } from '../game/storage';
import { clearWidget, syncWidget } from '../game/widget';
import * as Notifications from 'expo-notifications';
import type { PetActions, PetState, PetType, UsePet } from '../game/types';

const TICK_INTERVAL_MS = 1000;
const PERSIST_INTERVAL_MS = 10_000;

export function usePet(): UsePet {
  // null until the user picks a type (or after reset).
  const [pet, setPet] = useState<PetState | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs for mutable state that callbacks close over. applyState() and the
  // bootstrap effect keep petRef in sync synchronously.
  const petRef = useRef<PetState | null>(pet);
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
    // Mirror to the iOS widget; reload its timeline only on forced persists
    // (user actions / backgrounding) to stay within WidgetKit's refresh budget.
    syncWidget(state, force);
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

      // No saved pet (new user or post-reset) → show the selection screen.
      if (loaded === null) {
        setPet(null);
        petRef.current = null;
        setLoading(false);
        return;
      }

      const simulated = simulate(loaded, Date.now());
      setPet(simulated);
      petRef.current = simulated;
      setLoading(false);

      await savePet(simulated);
      await rescheduleCareNotifications(simulated);
      syncWidget(simulated, true);
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  // ── Tick interval (1s) — only runs while a live pet is foregrounded ───────
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTick = useCallback(() => {
    if (tickIntervalRef.current !== null) return; // already running
    tickIntervalRef.current = setInterval(() => {
      const current = petRef.current;
      if (current === null || current.isDead) return;
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

  // Depend on the presence of a pet, not its identity — `pet` gets a new object
  // every tick, and depending on it directly would tear down + rebuild the
  // interval every second.
  const hasPet = pet !== null;
  useEffect(() => {
    if (loading || !hasPet) return;
    startTick();
    return stopTick;
  }, [loading, hasPet, startTick, stopTick]);

  // ── AppState: catch-up on foreground, persist on background ──────────────
  useEffect(() => {
    if (loading) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const current = petRef.current;
      if (current === null) return; // nothing to simulate on the selection screen

      if (nextAppState === 'active') {
        if (current.isDead) return;
        const next = simulate(current, Date.now());
        applyState(next);
        startTick();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        stopTick();
        void persist(current, true);
      }
    });

    return () => subscription.remove();
  }, [loading, applyState, persist, startTick, stopTick]);

  // ── Action callbacks ──────────────────────────────────────────────────────
  const actionFeed = useCallback(() => {
    if (petRef.current === null) return;
    applyState(feed(petRef.current, Date.now()), true);
  }, [applyState]);

  const actionPlay = useCallback(() => {
    if (petRef.current === null) return;
    applyState(play(petRef.current, Date.now()), true);
  }, [applyState]);

  const actionWater = useCallback(() => {
    if (petRef.current === null) return;
    applyState(water(petRef.current, Date.now()), true);
  }, [applyState]);

  const actionSocialize = useCallback(() => {
    if (petRef.current === null || petRef.current.isDead) return;
    applyState(socialize(petRef.current, Date.now()), true);
  }, [applyState]);

  const actionSelectType = useCallback((petType: PetType, name?: string) => {
    applyState(createInitialPet(name ?? 'Pixel', petType, Date.now()), true);
  }, [applyState]);

  const actionReset = useCallback(() => {
    stopTick();
    setPet(null);
    petRef.current = null;
    void clearPet();
    void Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    clearWidget();
  }, [stopTick]);

  const actionRename = useCallback((name: string) => {
    if (petRef.current === null) return;
    applyState(engineRename(petRef.current, name), true);
  }, [applyState]);

  const actions: PetActions = useMemo(() => ({
    feed: actionFeed,
    play: actionPlay,
    water: actionWater,
    socialize: actionSocialize,
    selectType: actionSelectType,
    reset: actionReset,
    rename: actionRename,
  }), [actionFeed, actionPlay, actionWater, actionSocialize, actionSelectType, actionReset, actionRename]);

  return {
    pet,
    actions,
    loading,
    mood: pet ? getMood(pet) : 'neutral',
  };
}
