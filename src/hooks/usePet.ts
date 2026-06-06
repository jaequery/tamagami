import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  buyFood,
  chooseJob,
  clockIn,
  clockOut,
  comfortOwner,
  createHeir,
  createInitialPet,
  enroll,
  feed,
  getMood,
  nameOwner as engineNameOwner,
  play,
  quitJob,
  rename as engineRename,
  simulate,
  socialize,
  treat,
  witnessEvent,
} from '../game/engine';
import { isWorking } from '../game/economy';
import { appendAncestor, ancestorFrom } from '../game/lineage';
import { loadCharm } from '../game/social';
import { consumeGiftLuck } from '../game/gift';
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
    // Never persist an UNNAMED founder — she only exists in memory while the cold
    // open is collecting her name. Quitting mid-cinematic restarts it fresh, and
    // validatePetState never has to see an empty name.
    if (state.name.trim() === '') return;
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

  const actionSocialize = useCallback(() => {
    if (petRef.current === null || petRef.current.isDead) return;
    applyState(socialize(petRef.current, Date.now()), true);
  }, [applyState]);

  const actionWitnessEvent = useCallback((eventId: string) => {
    if (petRef.current === null || petRef.current.isDead) return;
    applyState(witnessEvent(petRef.current, eventId, Date.now()), true);
  }, [applyState]);

  const actionTreat = useCallback(() => {
    if (petRef.current === null || petRef.current.isDead) return;
    applyState(treat(petRef.current, Date.now()), true);
  }, [applyState]);

  const actionComfortOwner = useCallback(() => {
    if (petRef.current === null || petRef.current.isDead) return;
    applyState(comfortOwner(petRef.current, Date.now()), true);
  }, [applyState]);

  // Death → continue the bloodline: archive the departed as an ancestor, then
  // hatch its heir (next generation, inherited rarity) in place — no trip back
  // to the selection screen.
  const actionContinueLine = useCallback(() => {
    const cur = petRef.current;
    if (cur === null || !cur.isDead) return;
    void appendAncestor(ancestorFrom(cur));
    // Charm from rare friends + any pending deep-link gift give the heir luck.
    void Promise.all([loadCharm(), consumeGiftLuck()]).then(([charm, gift]) =>
      applyState(createHeir(cur, Date.now(), charm + gift), true));
  }, [applyState]);

  const actionSelectType = useCallback((petType: PetType, name?: string) => {
    // Charm from rare friends + any pending deep-link gift give a fresh pet luck.
    void Promise.all([loadCharm(), consumeGiftLuck()]).then(([charm, gift]) => {
      applyState(createInitialPet(name ?? 'Pixel', petType, Date.now(), charm + gift), true);
    });
  }, [applyState]);

  // First launch / post-reset: bring an UNNAMED cat into memory so the cold open
  // can play and name her (the player names themselves, then her). Held in memory
  // only (persist() skips empty-name pets) — she's saved the instant she's named.
  const actionBegin = useCallback(() => {
    if (petRef.current !== null) return; // a founder is already in flight
    void Promise.all([loadCharm(), consumeGiftLuck()]).then(([charm, gift]) => {
      if (petRef.current !== null) return;
      const founder = { ...createInitialPet('Pixel', 'cat', Date.now(), charm + gift), name: '' };
      applyState(founder, false);
    });
  }, [applyState]);

  const actionNameOwner = useCallback((name: string) => {
    if (petRef.current === null) return;
    // In-memory only while she's still unnamed; persisted once she gets her name.
    applyState(engineNameOwner(petRef.current, name), false);
  }, [applyState]);

  const actionReset = useCallback(() => {
    // Starting fresh still records the departed in the family tree before wiping.
    const cur = petRef.current;
    if (cur !== null && cur.isDead) void appendAncestor(ancestorFrom(cur));
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

  // ── Economy actions (cat/dog) ──
  const actionBuyFood = useCallback((foodId: string) => {
    if (petRef.current === null) return;
    applyState(buyFood(petRef.current, foodId, Date.now()), true);
  }, [applyState]);

  const actionChooseJob = useCallback((jobId: string) => {
    if (petRef.current === null) return;
    applyState(chooseJob(petRef.current, jobId, Date.now()), true);
  }, [applyState]);

  const actionQuitJob = useCallback(() => {
    if (petRef.current === null) return;
    applyState(quitJob(petRef.current, Date.now()), true);
  }, [applyState]);

  const actionToggleWork = useCallback(() => {
    const cur = petRef.current;
    if (cur === null) return;
    const now = Date.now();
    applyState(isWorking(cur.economy) ? clockOut(cur, now) : clockIn(cur, now), true);
  }, [applyState]);

  const actionEnroll = useCallback(() => {
    if (petRef.current === null) return;
    applyState(enroll(petRef.current, Date.now()), true);
  }, [applyState]);

  const actions: PetActions = useMemo(() => ({
    feed: actionFeed,
    play: actionPlay,
    socialize: actionSocialize,
    witnessEvent: actionWitnessEvent,
    treat: actionTreat,
    comfortOwner: actionComfortOwner,
    continueLine: actionContinueLine,
    selectType: actionSelectType,
    begin: actionBegin,
    nameOwner: actionNameOwner,
    reset: actionReset,
    rename: actionRename,
    buyFood: actionBuyFood,
    chooseJob: actionChooseJob,
    quitJob: actionQuitJob,
    toggleWork: actionToggleWork,
    enroll: actionEnroll,
  }), [actionFeed, actionPlay, actionSocialize, actionWitnessEvent, actionTreat, actionComfortOwner, actionContinueLine, actionSelectType, actionBegin, actionNameOwner, actionReset, actionRename, actionBuyFood, actionChooseJob, actionQuitJob, actionToggleWork, actionEnroll]);

  return {
    pet,
    actions,
    loading,
    mood: pet ? getMood(pet) : 'neutral',
  };
}
