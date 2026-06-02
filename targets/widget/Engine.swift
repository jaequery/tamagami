// Engine.swift
// Pure-Swift port of the TypeScript simulation engine (src/game/engine.ts).
// simulate(_:to:) is a deterministic, bit-for-bit reproduction of the TS logic.

import Foundation

// MARK: - Constants
// All derived via the same FORMULAS as the TS source — never pre-rounded.

private let MAX_CATCHUP_SECONDS: Double         = 7 * 24 * 60 * 60          // 604 800

private let HUNGER_DECAY_PER_SECOND: Double     = 100.0 / (4 * 60 * 60)
private let HAPPINESS_DECAY_PER_SECOND: Double  = 100.0 / (5 * 60 * 60)
private let ENERGY_DECAY_PER_SECOND: Double     = 100.0 / (8 * 60 * 60)
private let HYGIENE_DECAY_PER_SECOND: Double    = 100.0 / (6 * 60 * 60)
private let ENERGY_RECOVER_PER_SECOND: Double   = 100.0 / (3 * 60 * 60)

private let SLEEP_HUNGER_DECAY_MULTIPLIER: Double    = 0.4
private let SLEEP_HAPPINESS_DECAY_MULTIPLIER: Double = 0.3
private let SLEEP_HYGIENE_DECAY_MULTIPLIER: Double   = 0.5

private let POOP_INTERVAL_SECONDS: Double            = 2.5 * 60 * 60         // 9 000
private let POOP_OVERFLOW_THRESHOLD: Int             = 3
private let HYGIENE_DRAIN_PER_POOP_PER_SECOND: Double = 100.0 / (3 * 60 * 60)
private let HYGIENE_OVERFLOW_DRAIN_PER_SECOND: Double = 100.0 / (1.5 * 60 * 60)

private let HEALTH_DECAY_SICK_PER_SECOND: Double             = 100.0 / (6 * 60 * 60)
private let HUNGER_CRITICAL_THRESHOLD: Double                = 15.0
private let HEALTH_DECAY_CRITICAL_HUNGER_PER_SECOND: Double  = 100.0 / (12 * 60 * 60)
private let HEALTH_REGEN_PER_SECOND: Double                  = 100.0 / (4 * 60 * 60)

private let STAGE_EGG_HATCH_SECONDS: Double     = 45
private let STAGE_BABY_TO_CHILD_SECONDS: Double = 15 * 60
private let STAGE_CHILD_TO_TEEN_SECONDS: Double = 2 * 60 * 60 + 15 * 60
private let STAGE_TEEN_TO_ADULT_SECONDS: Double = 8 * 60 * 60 + 15 * 60

let NOTIFY_ENERGY_THRESHOLD: Double = 15.0     // also used by getMood — kept internal-public

// MARK: - Helpers

private func clamp(_ v: Double, lo: Double = 0, hi: Double = 100) -> Double {
    return max(lo, min(hi, v))
}

func resolveStage(_ ageSeconds: Double) -> LifeStage {
    if ageSeconds < STAGE_EGG_HATCH_SECONDS     { return .egg }
    if ageSeconds < STAGE_BABY_TO_CHILD_SECONDS { return .baby }
    if ageSeconds < STAGE_CHILD_TO_TEEN_SECONDS { return .child }
    if ageSeconds < STAGE_TEEN_TO_ADULT_SECONDS { return .teen }
    return .adult
}

private func hasSicknessCause(hunger: Double, hygiene: Double, poops: Int) -> Bool {
    return hunger == 0 || hygiene == 0 || poops > POOP_OVERFLOW_THRESHOLD
}

// MARK: - simulate

/// Advances `state` forward to `nowMs` (epoch milliseconds).
/// Mirrors the TypeScript `simulate()` in src/game/engine.ts exactly.
func simulate(_ state: PetState, to nowMs: Double) -> PetState {
    // Dead: update clock only, no stat changes.
    if state.isDead {
        var s = state; s.lastTick = nowMs; return s
    }

    let rawElapsed = (nowMs - state.lastTick) / 1000.0   // seconds
    let elapsed    = min(rawElapsed, MAX_CATCHUP_SECONDS)

    if elapsed <= 0 {
        var s = state; s.lastTick = nowMs; return s
    }

    var hunger     = state.stats.hunger
    var happiness  = state.stats.happiness
    var energy     = state.stats.energy
    var hygiene    = state.stats.hygiene
    var health     = state.stats.health
    var poops      = state.poops
    var isSick     = state.isSick
    var causeOfDeath = state.causeOfDeath
    var ageSeconds = state.ageSeconds
    var isDead     = state.isDead
    let isSleeping = state.isSleeping

    // Age
    ageSeconds += elapsed

    // Stat decay
    if isSleeping {
        hunger    -= HUNGER_DECAY_PER_SECOND   * SLEEP_HUNGER_DECAY_MULTIPLIER    * elapsed
        happiness -= HAPPINESS_DECAY_PER_SECOND * SLEEP_HAPPINESS_DECAY_MULTIPLIER * elapsed
        energy     = min(100, energy + ENERGY_RECOVER_PER_SECOND * elapsed)
        hygiene   -= HYGIENE_DECAY_PER_SECOND  * SLEEP_HYGIENE_DECAY_MULTIPLIER   * elapsed
    } else {
        hunger    -= HUNGER_DECAY_PER_SECOND    * elapsed
        happiness -= HAPPINESS_DECAY_PER_SECOND * elapsed
        energy    -= ENERGY_DECAY_PER_SECOND    * elapsed
        hygiene   -= HYGIENE_DECAY_PER_SECOND   * elapsed
    }

    // Poop accumulation (not while egg)
    if state.stage != .egg {
        let newPoopCount = Int(floor(ageSeconds / POOP_INTERVAL_SECONDS))
        let oldPoopCount = Int(floor(state.ageSeconds / POOP_INTERVAL_SECONDS))
        poops += newPoopCount - oldPoopCount
    }

    // Hygiene drag from poops
    if poops > 0 {
        hygiene -= HYGIENE_DRAIN_PER_POOP_PER_SECOND * Double(poops) * elapsed
    }
    if poops >= POOP_OVERFLOW_THRESHOLD {
        hygiene -= HYGIENE_OVERFLOW_DRAIN_PER_SECOND * elapsed
    }

    // Clamp before sickness logic
    hunger    = clamp(hunger)
    happiness = clamp(happiness)
    energy    = clamp(energy)
    hygiene   = clamp(hygiene)

    // Sickness onset / recovery (sets AND clears)
    isSick = hasSicknessCause(hunger: hunger, hygiene: hygiene, poops: poops)

    // Health changes
    if isSick {
        health -= HEALTH_DECAY_SICK_PER_SECOND * elapsed
    } else if hunger <= HUNGER_CRITICAL_THRESHOLD {
        health -= HEALTH_DECAY_CRITICAL_HUNGER_PER_SECOND * elapsed
    } else if hunger > HUNGER_CRITICAL_THRESHOLD && hygiene > 0 && happiness > 0 {
        health += HEALTH_REGEN_PER_SECOND * elapsed
    }
    health = clamp(health)

    // Death
    if health == 0 && !isDead {
        isDead = true
        if hunger <= HUNGER_CRITICAL_THRESHOLD {
            causeOfDeath = .starvation
        } else if isSick {
            causeOfDeath = .sickness
        } else {
            causeOfDeath = .neglect
        }
    }

    // Life stage
    let stage = resolveStage(ageSeconds)

    return PetState(
        version:      state.version,
        name:         state.name,
        bornAt:       state.bornAt,
        lastTick:     nowMs,
        stats:        PetStats(
            hunger:    clamp(hunger),
            happiness: clamp(happiness),
            energy:    clamp(energy),
            hygiene:   clamp(hygiene),
            health:    clamp(health)
        ),
        stage:        stage,
        isSleeping:   isSleeping,
        isSick:       isSick,
        poops:        poops,
        isDead:       isDead,
        causeOfDeath: causeOfDeath,
        ageSeconds:   ageSeconds
    )
}

// MARK: - getMood

func getMood(_ state: PetState) -> Mood {
    if state.isDead    { return .dead }
    if state.isSleeping { return .sleeping }
    if state.isSick    { return .sick }

    let avg = (state.stats.hunger + state.stats.happiness) / 2

    if state.stats.energy <= NOTIFY_ENERGY_THRESHOLD { return .sad }
    if avg >= 60 { return .happy }
    if avg >= 30 { return .neutral }
    return .sad
}

// MARK: - Stat urgency helper

/// Returns the lowest stat value together with its display label.
func lowestStat(in state: PetState) -> (label: String, value: Double) {
    let candidates: [(String, Double)] = [
        ("HUNGER",  state.stats.hunger),
        ("HAPPY",   state.stats.happiness),
        ("ENERGY",  state.stats.energy),
        ("HYGIENE", state.stats.hygiene),
        ("HEALTH",  state.stats.health),
    ]
    return candidates.min(by: { $0.1 < $1.1 }) ?? ("HEALTH", state.stats.health)
}

/// Returns the two most urgent (lowest) stats, worst first.
func twoWorstStats(in state: PetState) -> [(label: String, value: Double)] {
    let candidates: [(String, Double)] = [
        ("HUNGER",  state.stats.hunger),
        ("HAPPY",   state.stats.happiness),
        ("ENERGY",  state.stats.energy),
        ("HYGIENE", state.stats.hygiene),
        ("HEALTH",  state.stats.health),
    ]
    return Array(candidates.sorted { $0.1 < $1.1 }.prefix(2))
}

/// A short textual description of the pet's current mood for inline widget text.
func moodWord(_ mood: Mood, state: PetState) -> String {
    switch mood {
    case .dead:     return "R.I.P."
    case .sleeping: return "sleeping"
    case .sick:     return "sick"
    case .sad:
        let lowest = lowestStat(in: state)
        switch lowest.label {
        case "HUNGER":  return "hungry"
        case "HAPPY":   return "lonely"
        case "ENERGY":  return "tired"
        case "HYGIENE": return "dirty"
        default:        return "unwell"
        }
    case .neutral:  return "okay"
    case .happy:    return "happy"
    }
}

/// Display string for the pet's life stage.
func stageLabel(_ stage: LifeStage) -> String {
    switch stage {
    case .egg:   return "Egg"
    case .baby:  return "Baby"
    case .child: return "Child"
    case .teen:  return "Teen"
    case .adult: return "Adult"
    }
}

/// Human-readable compact age string.
func ageLabel(_ ageSeconds: Double) -> String {
    let s = Int(ageSeconds)
    if s < 60      { return "\(s)s" }
    if s < 3600    { return "\(s / 60)m" }
    if s < 86400   { return "\(s / 3600)h" }
    return "\(s / 86400)d"
}
