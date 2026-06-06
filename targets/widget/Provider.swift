// Provider.swift
// WidgetKit TimelineProvider.
// Generates a dense 6-hour forward timeline (~25 entries, every 15 minutes)
// by calling simulate(_:to:) for each projected timestamp.

import WidgetKit
import Foundation

// MARK: - Entry

struct TamaEntry: TimelineEntry {
    let date: Date
    let state: PetState
    let mood:  Mood
}

// MARK: - Provider

struct TamaProvider: TimelineProvider {

    // MARK: Placeholder (shown while widget loads / in widget gallery)
    func placeholder(in context: Context) -> TamaEntry {
        let nowMs = Date().timeIntervalSince1970 * 1000
        let state = PetState.defaultPet(nowMs: nowMs)
        return TamaEntry(date: Date(), state: state, mood: getMood(state))
    }

    // MARK: Snapshot (quick preview)
    func getSnapshot(in context: Context, completion: @escaping (TamaEntry) -> Void) {
        let nowMs  = Date().timeIntervalSince1970 * 1000
        let loaded = PetStateLoader.load()
        let state  = simulate(loaded, to: nowMs)
        let entry  = TamaEntry(date: Date(), state: state, mood: getMood(state))
        completion(entry)
    }

    // MARK: Timeline (dense 6-hour projection)
    func getTimeline(in context: Context, completion: @escaping (Timeline<TamaEntry>) -> Void) {
        let now     = Date()
        let nowMs   = now.timeIntervalSince1970 * 1000
        let loaded  = PetStateLoader.load()

        // First entry = current time
        var entries: [TamaEntry] = []

        // 10-minute cadence: drives both stat-decay smoothness AND the Large
        // widget's cat wander (each entry repositions the cat). WidgetKit advances
        // through pre-supplied entries on their dates WITHOUT spending reload
        // budget, so a finer cadence is free liveliness.
        let intervalMinutes: Double = 10
        let totalHours: Double      = 6
        let count = Int(totalHours * 60 / intervalMinutes) + 1  // ~37 entries

        for i in 0..<count {
            let offsetSeconds = Double(i) * intervalMinutes * 60
            let entryDate     = now.addingTimeInterval(offsetSeconds)
            let entryMs       = nowMs + offsetSeconds * 1000
            let projected     = simulate(loaded, to: entryMs)
            entries.append(TamaEntry(date: entryDate, state: projected, mood: getMood(projected)))
        }

        // Refresh when the pre-computed timeline is exhausted
        let expiry   = now.addingTimeInterval(totalHours * 3600)
        let timeline = Timeline(entries: entries, policy: .after(expiry))
        completion(timeline)
    }
}
