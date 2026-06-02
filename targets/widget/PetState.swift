// PetState.swift
// Model types + shared-data loader for the TamaWidget extension.
// Reads from App Group "group.com.tamagotcha.app", key "petState".

import Foundation

// MARK: - Types

enum LifeStage: String, Codable {
    case egg, baby, child, teen, adult
}

enum Mood {
    case happy, neutral, sad, sick, sleeping, dead
}

enum CauseOfDeath: String, Codable {
    case starvation, sickness, neglect
}

struct PetStats: Codable {
    var hunger: Double
    var happiness: Double
    var energy: Double
    var hygiene: Double
    var health: Double
}

struct PetState: Codable {
    var version: Int
    var name: String
    var bornAt: Double       // epoch ms
    var lastTick: Double     // epoch ms
    var stats: PetStats
    var stage: LifeStage
    var isSleeping: Bool
    var isSick: Bool
    var poops: Int
    var isDead: Bool
    var causeOfDeath: CauseOfDeath?
    var ageSeconds: Double
}

// MARK: - Default / fallback state

extension PetState {
    /// A freshly-hatched egg used as a fallback when no stored state is available.
    static func defaultEgg(nowMs: Double = Date().timeIntervalSince1970 * 1000) -> PetState {
        PetState(
            version: 1,
            name: "Pixel",
            bornAt: nowMs,
            lastTick: nowMs,
            stats: PetStats(hunger: 80, happiness: 80, energy: 100, hygiene: 100, health: 100),
            stage: .egg,
            isSleeping: false,
            isSick: false,
            poops: 0,
            isDead: false,
            causeOfDeath: nil,
            ageSeconds: 0
        )
    }
}

// MARK: - Shared-container loader

struct PetStateLoader {
    static let suiteName = "group.com.tamagotcha.app"
    static let key       = "petState"

    /// Reads, decodes, and returns the current pet state.
    /// Falls back to `PetState.defaultEgg()` on any failure.
    static func load() -> PetState {
        guard
            let suite  = UserDefaults(suiteName: suiteName),
            let json   = suite.string(forKey: key),
            let data   = json.data(using: .utf8)
        else {
            return .defaultEgg()
        }

        let decoder = JSONDecoder()
        do {
            return try decoder.decode(PetState.self, from: data)
        } catch {
            return .defaultEgg()
        }
    }
}
