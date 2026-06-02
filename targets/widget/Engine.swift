// Engine.swift
// Pure-Swift port of the TypeScript simulation engine (src/game/engine.ts).
// simulate(_:to:) is a deterministic, bit-for-bit reproduction of the TS logic.

import Foundation

// MARK: - Constants
// All derived via the same FORMULAS as the TS source — never pre-rounded.

private let MAX_CATCHUP_SECONDS: Double = 7 * 24 * 60 * 60          // 604 800

// cat / dog
private let HUNGER_DECAY_PER_SECOND: Double    = 100.0 / (4 * 60 * 60)
private let HAPPINESS_DECAY_PER_SECOND: Double = 100.0 / (5 * 60 * 60)

// plant
private let WATER_DECAY_PER_SECOND: Double     = 100.0 / (24 * 60 * 60)

// health (cat / dog)
private let HUNGER_CRITICAL_THRESHOLD: Double        = 15.0
private let HAPPINESS_CRITICAL_THRESHOLD: Double     = 15.0
private let HEALTH_DECAY_CRITICAL_PER_SECOND: Double = 100.0 / (8 * 60 * 60)
private let HEALTH_REGEN_PER_SECOND: Double          = 100.0 / (4 * 60 * 60)

// MARK: - Helpers

private func clamp(_ v: Double, lo: Double = 0, hi: Double = 100) -> Double {
    return max(lo, min(hi, v))
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

    let ageSeconds = state.ageSeconds + elapsed

    return state.petType.isAnimal
        ? simulateAnimal(state, to: nowMs, elapsed: elapsed, ageSeconds: ageSeconds)
        : simulatePlant(state, to: nowMs, elapsed: elapsed, ageSeconds: ageSeconds)
}

private func simulatePlant(_ state: PetState, to nowMs: Double, elapsed: Double, ageSeconds: Double) -> PetState {
    let water = clamp(state.stats.water - WATER_DECAY_PER_SECOND * elapsed)

    var isDead = false
    var causeOfDeath: CauseOfDeath? = nil
    if water == 0 {
        isDead = true
        causeOfDeath = .thirst
    }

    var stats = state.stats
    stats.water = water

    var s = state
    s.lastTick = nowMs
    s.ageSeconds = ageSeconds
    s.isDead = isDead
    s.causeOfDeath = causeOfDeath
    s.stats = stats
    return s
}

private func simulateAnimal(_ state: PetState, to nowMs: Double, elapsed: Double, ageSeconds: Double) -> PetState {
    let hunger    = clamp(state.stats.hunger - HUNGER_DECAY_PER_SECOND * elapsed)
    let happiness = clamp(state.stats.happiness - HAPPINESS_DECAY_PER_SECOND * elapsed)

    var health = state.stats.health
    let hungerCritical = hunger <= HUNGER_CRITICAL_THRESHOLD
    let happinessCritical = happiness <= HAPPINESS_CRITICAL_THRESHOLD
    if hungerCritical || happinessCritical {
        health -= HEALTH_DECAY_CRITICAL_PER_SECOND * elapsed
    } else {
        health += HEALTH_REGEN_PER_SECOND * elapsed
    }
    health = clamp(health)

    var isDead = false
    var causeOfDeath: CauseOfDeath? = nil
    if health == 0 {
        isDead = true
        causeOfDeath = hungerCritical ? .starvation : .neglect
    }

    var stats = state.stats
    stats.hunger = hunger
    stats.happiness = happiness
    stats.health = health

    var s = state
    s.lastTick = nowMs
    s.ageSeconds = ageSeconds
    s.isDead = isDead
    s.causeOfDeath = causeOfDeath
    s.stats = stats
    return s
}

// MARK: - getMood

func getMood(_ state: PetState) -> Mood {
    if state.isDead { return .dead }

    let level = state.petType == .plant
        ? state.stats.water
        : (state.stats.hunger + state.stats.happiness) / 2

    if level >= 60 { return .happy }
    if level >= 30 { return .neutral }
    return .sad
}

// MARK: - Per-type stat display

/// The stat bars to render for a pet, in display order.
/// Mirrors PET_PROFILES in src/game/profiles.ts.
func statBars(for state: PetState) -> [(label: String, value: Double)] {
    if state.petType == .plant {
        return [("WATER", state.stats.water)]
    }
    return [
        ("HUNGER", state.stats.hunger),
        ("HAPPY",  state.stats.happiness),
        ("HEALTH", state.stats.health),
    ]
}

/// Returns the lowest relevant stat together with its display label.
func lowestStat(in state: PetState) -> (label: String, value: Double) {
    let bars = statBars(for: state)
    return bars.min(by: { $0.value < $1.value }) ?? ("HEALTH", state.stats.health)
}

/// Returns the most urgent (lowest) relevant stats, worst first (up to two).
func twoWorstStats(in state: PetState) -> [(label: String, value: Double)] {
    let bars = statBars(for: state)
    return Array(bars.sorted { $0.value < $1.value }.prefix(2))
}

/// A short textual description of the pet's current mood for inline widget text.
func moodWord(_ mood: Mood, state: PetState) -> String {
    switch mood {
    case .dead:    return "R.I.P."
    case .sad:
        let lowest = lowestStat(in: state)
        switch lowest.label {
        case "HUNGER": return "hungry"
        case "HAPPY":  return "lonely"
        case "WATER":  return "thirsty"
        default:       return "unwell"
        }
    case .neutral: return "okay"
    case .happy:   return "happy"
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
