// PetState.swift
// Model types + shared-data loader for the TamaWidget extension.
// Mirrors src/game/types.ts. Reads from App Group "group.com.tamagami.app",
// key "petState".

import Foundation

// MARK: - Types

enum PetType: String, Codable {
    case plant, cat, dog

    /// True for the feed + play archetypes.
    var isAnimal: Bool { self == .cat || self == .dog }

    /// Short uppercase label shown in the widget header.
    var title: String {
        switch self {
        case .plant: return "PLANT"
        case .cat:   return "CAT"
        case .dog:   return "DOG"
        }
    }
}

enum Mood {
    case happy, neutral, sad, dead
}

enum CauseOfDeath: String, Codable {
    case starvation, thirst, neglect
}

struct PetStats: Codable {
    var hunger: Double     // cat/dog
    var happiness: Double  // cat/dog
    var health: Double     // cat/dog
    var water: Double      // plant
}

struct PetState: Codable {
    var version: Int
    var petType: PetType
    var name: String
    var bornAt: Double       // epoch ms
    var lastTick: Double     // epoch ms
    var stats: PetStats
    var isDead: Bool
    var causeOfDeath: CauseOfDeath?
    var ageSeconds: Double
}

// MARK: - Default / fallback state

extension PetState {
    /// A freshly-created pet used as a fallback when no stored state is available.
    static func defaultPet(nowMs: Double = Date().timeIntervalSince1970 * 1000) -> PetState {
        PetState(
            version: 2,
            petType: .cat,
            name: "Pixel",
            bornAt: nowMs,
            lastTick: nowMs,
            stats: PetStats(hunger: 80, happiness: 80, health: 100, water: 100),
            isDead: false,
            causeOfDeath: nil,
            ageSeconds: 0
        )
    }
}

// MARK: - Shared-container loader

struct PetStateLoader {
    static let suiteName = "group.com.tamagami.app"
    static let key       = "petState"

    /// Reads, decodes, and returns the current pet state.
    /// Falls back to `PetState.defaultPet()` on any failure.
    static func load() -> PetState {
        guard
            let suite  = UserDefaults(suiteName: suiteName),
            let json   = suite.string(forKey: key),
            let data   = json.data(using: .utf8)
        else {
            return .defaultPet()
        }

        let decoder = JSONDecoder()
        do {
            return try decoder.decode(PetState.self, from: data)
        } catch {
            return .defaultPet()
        }
    }
}
