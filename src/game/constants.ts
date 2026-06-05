// ─── Storage ─────────────────────────────────────────────────────────────────
// v3 adds the immutable `rarity` trait (egg/evolution system). Older saves lack
// it, fail validation, and drop the user back to pet-selection to hatch fresh —
// same intentional no-migration policy as v1→v2 (pre-launch, no production data).
export const STORAGE_KEY = '@tama/pet/v3';
export const CURRENT_VERSION = 3;

// ─── Catch-up cap ────────────────────────────────────────────────────────────
// Maximum elapsed seconds applied in a single simulate() call.
// Prevents a pet left for weeks from overflowing any counters.
export const MAX_CATCHUP_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ─── Cat / dog decay rates (units per real second) ───────────────────────────
// hunger:    100 → 0 over ~4 hours   (14400s)  →  0.006944/s
export const HUNGER_DECAY_PER_SECOND = 100 / (4 * 60 * 60);
// happiness: 100 → 0 over ~5 hours   (18000s)  →  0.005556/s
export const HAPPINESS_DECAY_PER_SECOND = 100 / (5 * 60 * 60);

// ─── Health (cat) ────────────────────────────────────────────────────────────
// Health drains while a core need is critically low, regenerates when both are met.
export const HUNGER_CRITICAL_THRESHOLD = 15;
export const HAPPINESS_CRITICAL_THRESHOLD = 15;
// neglected → dead over ~8h
export const HEALTH_DECAY_CRITICAL_PER_SECOND = 100 / (8 * 60 * 60);
// full regen over ~4h when hunger & happiness are both above critical
export const HEALTH_REGEN_PER_SECOND = 100 / (4 * 60 * 60);

// ─── Death ───────────────────────────────────────────────────────────────────
// health → 0 → dead. cause = 'starvation' if hunger was critical, else 'neglect'.
// (Old age + illness are the other, gentler causes — see lifespan.ts / sickness.ts.)

// ─── Action effects ──────────────────────────────────────────────────────────
// FEED
export const FEED_HUNGER_BOOST = 30;      // +30 hunger per feed
export const FEED_HAPPINESS_DELTA = 5;    // small happiness boost from a meal

// PLAY (cat)
export const PLAY_HAPPINESS_BOOST = 25;   // +25 happiness per play session
export const PLAY_HUNGER_COST = 8;        // −8 hunger (playing makes them hungry)

// ─── Notification thresholds ─────────────────────────────────────────────────
// Stat value at/below which the user should be nudged
export const NOTIFY_HUNGER_THRESHOLD = 20;
export const NOTIFY_HAPPINESS_THRESHOLD = 20;

// ─── Nearby / social ─────────────────────────────────────────────────────────
// When two TAMAGAMI cats meet over BLE, the local cat gets a one-off "social"
// boost: +happiness and a little +health.
export const SOCIAL_HAPPINESS_BOOST = 20;
export const SOCIAL_HEALTH_BOOST = 5;

// A given peer can only boost this pet once per cooldown window — stops two
// phones sitting on a desk together from pinning every stat to 100.
export const SOCIAL_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes per peer

// ─── Bonds + charm (Phase 4 social graph) ─────────────────────────────────────
// Bond strength is your distinct meet count with a friend. Crossing a threshold
// promotes the bond (shown in the friends list).
export const BOND_FRIEND_MEETS = 3;   // ≥3 meets → FRIEND
export const BOND_BESTIE_MEETS = 6;   // ≥6 meets → BESTIE
// Each rare-or-better friend you've made adds 1 "charm", which gives your NEXT
// hatched pet an extra rarity roll (best wins) — so a social collector breeds
// luckier eggs. Capped so it stays a nudge, not a guarantee.
export const CHARM_CAP = 3;

// AsyncStorage keys for the social layer (independent of the pet save, so a pet
// reset never wipes your friends or your stable device identity).
export const DEVICE_ID_KEY = '@tama/deviceId/v1';
export const FRIENDS_KEY = '@tama/friends/v1';

// ─── Codex (collection) ───────────────────────────────────────────────────────
// The set of forms (petType × rarity) the player has hatched at least once.
// Independent of the pet save so it survives reset/restart — your collection is
// permanent even after a pet dies. See game/codex.ts and game/evolution.ts.
export const CODEX_KEY = '@tama/codex/v1';

// The set of world events (eclipse, meteor, …) the player has ever witnessed.
// Also permanent and save-independent. See game/eventCodex.ts and game/events.ts.
export const EVENT_CODEX_KEY = '@tama/events/v1';

// The set of daily "moments" (§4) and milestone firsts/lasts (§6) the player has
// ever caught — the catch-and-keep collection. Permanent + save-independent, like
// the event codex. See game/momentCodex.ts and game/moments.ts.
export const MOMENT_CODEX_KEY = '@tama/moments/v1';

// The set of pet birth timestamps whose cold-open cinematic (§1–3) has already
// played — so the birth sequence plays exactly once per pet (and once per heir),
// and returning users skip straight to their pet. Save-independent. See
// game/intro.ts and components/ColdOpen.tsx.
export const INTRO_SEEN_KEY = '@tama/intro/v1';

// ─── Lineage (family tree) ────────────────────────────────────────────────────
// The ordered list of past pets in a bloodline (graves). Permanent and
// save-independent so the family tree survives reset. See game/lineage.ts.
export const LINEAGE_KEY = '@tama/lineage/v1';

// ─── Gift (deep-link welcome luck) ────────────────────────────────────────────
// A pending luck bonus left by a tamagami:// hatch link someone shared. Consumed
// at the recipient's next hatch — closes the share → install → reward loop.
export const GIFT_KEY = '@tama/gift/v1';
export const GIFT_LUCK_CAP = 3;

// ─── Economy (currency · marketplace · jobs · education) ──────────────────────
// The care loop has money behind it: feeding means buying food, food costs coins,
// coins come from working a job, and better-paying jobs require education you pay
// for. The economy lives inside PetState.economy and is migrated tolerantly (old
// v3 saves seed a default), like `events`/`generation`.

// Seed coins so a fresh pet can buy a meal or two before its first paycheck —
// avoids a dead-end where you can't afford food and have no income yet.
export const STARTING_COINS = 60;

// Wages are quoted "per hour". We compress an in-game hour to this many real
// seconds so a short play session actually earns something — 1 hour = 1 minute.
export const WORK_SECONDS_PER_HOUR = 60;

// A single shift caps here, so leaving the pet clocked-in (even backgrounded for
// days) only ever banks one shift of pay — you must clock out + back in to earn
// more. 8 in-game hours = 480 real seconds.
export const WORK_SHIFT_MAX_SECONDS = 8 * WORK_SECONDS_PER_HOUR;
