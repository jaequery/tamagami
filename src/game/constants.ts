// ─── Storage ─────────────────────────────────────────────────────────────────
// v2 introduces pet types + a slimmed stat model. v1 saves are intentionally not
// migrated (pre-launch, no production data) — they fail validation and the user
// is dropped back on the pet-selection screen to pick fresh.
export const STORAGE_KEY = '@tama/pet/v2';
export const CURRENT_VERSION = 2;

// ─── Catch-up cap ────────────────────────────────────────────────────────────
// Maximum elapsed seconds applied in a single simulate() call.
// Prevents a pet left for weeks from overflowing any counters.
export const MAX_CATCHUP_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ─── Cat / dog decay rates (units per real second) ───────────────────────────
// hunger:    100 → 0 over ~4 hours   (14400s)  →  0.006944/s
export const HUNGER_DECAY_PER_SECOND = 100 / (4 * 60 * 60);
// happiness: 100 → 0 over ~5 hours   (18000s)  →  0.005556/s
export const HAPPINESS_DECAY_PER_SECOND = 100 / (5 * 60 * 60);

// ─── Plant decay rate ────────────────────────────────────────────────────────
// water:     100 → 0 over ~24 hours  (86400s)  →  0.001157/s
// Deliberately slow — the plant is the low-maintenance, "easy" pet.
export const WATER_DECAY_PER_SECOND = 100 / (24 * 60 * 60);

// ─── Health (cat / dog) ──────────────────────────────────────────────────────
// Health drains while a core need is critically low, regenerates when both are met.
export const HUNGER_CRITICAL_THRESHOLD = 15;
export const HAPPINESS_CRITICAL_THRESHOLD = 15;
// neglected → dead over ~8h
export const HEALTH_DECAY_CRITICAL_PER_SECOND = 100 / (8 * 60 * 60);
// full regen over ~4h when hunger & happiness are both above critical
export const HEALTH_REGEN_PER_SECOND = 100 / (4 * 60 * 60);

// ─── Death ───────────────────────────────────────────────────────────────────
// cat/dog: health → 0 → dead. cause = 'starvation' if hunger was critical, else 'neglect'.
// plant:   water  → 0 → dead. cause = 'thirst'.

// ─── Action effects ──────────────────────────────────────────────────────────
// FEED (cat/dog)
export const FEED_HUNGER_BOOST = 30;      // +30 hunger per feed
export const FEED_HAPPINESS_DELTA = 5;    // small happiness boost from a meal

// PLAY (cat/dog)
export const PLAY_HAPPINESS_BOOST = 25;   // +25 happiness per play session
export const PLAY_HUNGER_COST = 8;        // −8 hunger (playing makes them hungry)

// WATER (plant)
export const WATER_BOOST = 35;            // +35 water per watering

// ─── Notification thresholds ─────────────────────────────────────────────────
// Stat value at/below which the user should be nudged
export const NOTIFY_HUNGER_THRESHOLD = 20;
export const NOTIFY_HAPPINESS_THRESHOLD = 20;
export const NOTIFY_WATER_THRESHOLD = 25;
