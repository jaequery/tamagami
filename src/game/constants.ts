// ─── Storage ─────────────────────────────────────────────────────────────────
export const STORAGE_KEY = '@tama/pet/v1';
export const CURRENT_VERSION = 1;

// ─── Catch-up cap ────────────────────────────────────────────────────────────
// Maximum elapsed seconds applied in a single simulate() call.
// Prevents a pet left for weeks from overflowing any counters.
export const MAX_CATCHUP_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ─── Awake decay rates (units per real second) ────────────────────────────────
// hunger:    100 → 0 over ~4 hours   (14400s)  →  0.006944/s
export const HUNGER_DECAY_PER_SECOND = 100 / (4 * 60 * 60);
// happiness: 100 → 0 over ~5 hours   (18000s)  →  0.005556/s
export const HAPPINESS_DECAY_PER_SECOND = 100 / (5 * 60 * 60);
// energy:    100 → 0 over ~8 hours   (28800s)  →  0.003472/s  (only while awake)
export const ENERGY_DECAY_PER_SECOND = 100 / (8 * 60 * 60);
// hygiene:   100 → 0 over ~6 hours   (21600s)  →  0.004630/s
export const HYGIENE_DECAY_PER_SECOND = 100 / (6 * 60 * 60);

// ─── Asleep modifier rates ───────────────────────────────────────────────────
// While sleeping:
//   energy RECOVERS: 0 → 100 over ~3 hours     → +0.009259/s
export const ENERGY_RECOVER_PER_SECOND = 100 / (3 * 60 * 60);
//   hunger decays at 40% of normal rate
export const SLEEP_HUNGER_DECAY_MULTIPLIER = 0.4;
//   happiness decays at 30% of normal rate
export const SLEEP_HAPPINESS_DECAY_MULTIPLIER = 0.3;
//   hygiene still decays (slower) at 50% of normal rate
export const SLEEP_HYGIENE_DECAY_MULTIPLIER = 0.5;

// ─── Poop mechanics ──────────────────────────────────────────────────────────
// Poop interval: one poop every ~2.5 hours (9000s)
export const POOP_INTERVAL_SECONDS = 2.5 * 60 * 60;
// Maximum poops before hygiene drain accelerates
export const POOP_OVERFLOW_THRESHOLD = 3;
// Hygiene drained per second per poop on screen
export const HYGIENE_DRAIN_PER_POOP_PER_SECOND = 100 / (3 * 60 * 60); // each poop drains ~33 hygiene/hr
// Extra hygiene drain per second when poops >= POOP_OVERFLOW_THRESHOLD (on top of poop drain)
export const HYGIENE_OVERFLOW_DRAIN_PER_SECOND = 100 / (1.5 * 60 * 60);

// ─── Sickness ────────────────────────────────────────────────────────────────
// Sickness triggers when: hunger===0 sustained, OR hygiene===0, OR poops > POOP_OVERFLOW_THRESHOLD
// health decays when sick
export const HEALTH_DECAY_SICK_PER_SECOND = 100 / (6 * 60 * 60); // sick → dead over ~6h
// health also drains (slower) when hunger is critically low
export const HUNGER_CRITICAL_THRESHOLD = 15;
export const HEALTH_DECAY_CRITICAL_HUNGER_PER_SECOND = 100 / (12 * 60 * 60);
// health regenerates slowly when needs are met and not sick
export const HEALTH_REGEN_PER_SECOND = 100 / (4 * 60 * 60); // full regen over ~4h

// ─── Death ───────────────────────────────────────────────────────────────────
// When health reaches 0, the pet dies. CauseOfDeath is assigned at death moment.
// Primary cause: if hunger was 0 when health hit 0 → starvation
//                if pet was sick (driven by hygiene/poops) → sickness
//                otherwise → neglect

// ─── Action effects ──────────────────────────────────────────────────────────
// FEED
export const FEED_HUNGER_BOOST = 30;       // +30 hunger per feed
export const FEED_HAPPINESS_DELTA = 5;     // small happiness boost from a meal

// PLAY
export const PLAY_HAPPINESS_BOOST = 20;    // +20 happiness per play session
export const PLAY_ENERGY_COST = 15;        // −15 energy
export const PLAY_HUNGER_COST = 5;         // −5 hunger (playing makes them hungry)

// CLEAN
export const CLEAN_HYGIENE_RESTORE = 100;  // hygiene → 100, poops → 0

// HEAL
export const HEAL_HEALTH_BOOST = 20;       // +20 health when healed (only cures sickness)

// ─── Life-stage thresholds (cumulative age in seconds) ───────────────────────
// egg hatches quickly (~45s) for instant delight
export const STAGE_EGG_HATCH_SECONDS = 45;        // egg → baby at 45s
// baby stage lasts ~15 minutes
export const STAGE_BABY_TO_CHILD_SECONDS = 15 * 60;       // baby → child at 15m
// child stage lasts ~2 hours
export const STAGE_CHILD_TO_TEEN_SECONDS = 2 * 60 * 60 + 15 * 60;    // → teen at 2h 15m
// teen stage lasts ~6 hours
export const STAGE_TEEN_TO_ADULT_SECONDS = 8 * 60 * 60 + 15 * 60;    // → adult at 8h 15m
// adult lives indefinitely (or until neglected)

// ─── Notification thresholds ─────────────────────────────────────────────────
// Stat value at/below which the user should be nudged
export const NOTIFY_HUNGER_THRESHOLD = 20;
export const NOTIFY_HAPPINESS_THRESHOLD = 20;
export const NOTIFY_ENERGY_THRESHOLD = 15;
export const NOTIFY_HYGIENE_THRESHOLD = 20;
export const NOTIFY_HEALTH_THRESHOLD = 30;
