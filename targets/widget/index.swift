// index.swift
// @main Widget struct + all entry views for TamaWidget.
// Families: .systemSmall, .systemMedium (Home Screen)
//           .accessoryCircular, .accessoryRectangular, .accessoryInline (Lock Screen, iOS 16+)

import WidgetKit
import SwiftUI

// MARK: - Palette constants (shared by views in this file)

private let LCD_BG_COLOR  = Color(red: 0x9B/255.0, green: 0xBC/255.0, blue: 0x0F/255.0)  // lime screen (matches app)
private let LCD_INK_COLOR = Color(red: 0x0F/255.0, green: 0x38/255.0, blue: 0x0F/255.0)  // dark ink — name/RIP text
private let LCD_DIM_COLOR = Color(red: 0x30/255.0, green: 0x62/255.0, blue: 0x30/255.0)  // mid green — secondary text

// MARK: - systemSmall view

struct SmallWidgetView: View {
    let entry: TamaEntry

    private var state: PetState { entry.state }
    private var mood:  Mood     { entry.mood }

    /// The most urgent stats to show in limited space.
    private var urgentStats: [(label: String, value: Double)] {
        twoWorstStats(in: state)
    }

    var body: some View {
        ZStack {
            LCD_BG_COLOR

            if state.isDead {
                deadSmallView
            } else {
                aliveSmallView
            }
        }
        .modify { view in
            if #available(iOSApplicationExtension 17.0, *) {
                view.containerBackground(LCD_BG_COLOR, for: .widget)
            } else {
                view
            }
        }
    }

    private var aliveSmallView: some View {
        VStack(spacing: 2) {
            // Pet sprite — centered
            PixelSprite(petType: state.petType, mood: mood, cellSize: 3)
                .frame(maxWidth: .infinity, alignment: .center)

            // Name + type
            Text(state.name)
                .font(.system(size: 8, weight: .bold, design: .monospaced))
                .foregroundColor(LCD_INK_COLOR)
                .lineLimit(1)
            Text("\(state.petType.title) · \(ageLabel(state.ageSeconds))")
                .font(.system(size: 6, weight: .regular, design: .monospaced))
                .foregroundColor(LCD_DIM_COLOR)
                .lineLimit(1)

            Spacer(minLength: 2)

            // Most urgent stats
            VStack(spacing: 2) {
                ForEach(Array(urgentStats.enumerated()), id: \.offset) { _, stat in
                    CompactStatBar(label: stat.label, value: stat.value, segments: 5, labelWidth: 32)
                }
            }
            .padding(.horizontal, 4)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 4)
    }

    private var deadSmallView: some View {
        VStack(spacing: 3) {
            PixelSprite(petType: state.petType, mood: .dead, cellSize: 3)
                .frame(maxWidth: .infinity, alignment: .center)
            Text("R.I.P.")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundColor(LCD_INK_COLOR)
            Text(state.name)
                .font(.system(size: 7, weight: .regular, design: .monospaced))
                .foregroundColor(LCD_DIM_COLOR)
                .lineLimit(1)
        }
        .padding(6)
    }
}

// MARK: - systemMedium view

struct MediumWidgetView: View {
    let entry: TamaEntry

    private var state: PetState { entry.state }
    private var mood:  Mood     { entry.mood }

    var body: some View {
        ZStack {
            LCD_BG_COLOR

            if state.isDead {
                deadMediumView
            } else {
                aliveMediumView
            }
        }
        .modify { view in
            if #available(iOSApplicationExtension 17.0, *) {
                view.containerBackground(LCD_BG_COLOR, for: .widget)
            } else {
                view
            }
        }
    }

    private var aliveMediumView: some View {
        HStack(alignment: .top, spacing: 8) {
            // Left: sprite
            VStack {
                Spacer(minLength: 0)
                PixelSprite(petType: state.petType, mood: mood, cellSize: 3)
                Spacer(minLength: 0)
            }
            .frame(width: 50)
            .padding(.leading, 6)

            // Right: name + per-type stats
            VStack(alignment: .leading, spacing: 3) {
                Text(state.name)
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(LCD_INK_COLOR)
                    .lineLimit(1)
                Text("\(state.petType.title)  \(ageLabel(state.ageSeconds))")
                    .font(.system(size: 7, weight: .regular, design: .monospaced))
                    .foregroundColor(LCD_DIM_COLOR)
                    .lineLimit(1)

                Divider()
                    .background(LCD_DIM_COLOR)
                    .padding(.vertical, 1)

                ForEach(Array(statBars(for: state).enumerated()), id: \.offset) { _, stat in
                    CompactStatBar(label: stat.label, value: stat.value, segments: 6, labelWidth: 38)
                }
            }
            .padding(.vertical, 8)
            .padding(.trailing, 6)
        }
    }

    private var deadMediumView: some View {
        HStack(spacing: 12) {
            PixelSprite(petType: state.petType, mood: .dead, cellSize: 3)
                .frame(width: 50)
                .padding(.leading, 6)

            VStack(alignment: .leading, spacing: 4) {
                Text("R.I.P. \(state.name)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(LCD_INK_COLOR)
                if let cause = state.causeOfDeath {
                    Text("Cause: \(cause.rawValue)")
                        .font(.system(size: 8, weight: .regular, design: .monospaced))
                        .foregroundColor(LCD_DIM_COLOR)
                }
                Text("Age: \(ageLabel(state.ageSeconds))")
                    .font(.system(size: 8, weight: .regular, design: .monospaced))
                    .foregroundColor(LCD_DIM_COLOR)
            }
        }
    }
}

// MARK: - accessory views (iOS 16+)

@available(iOSApplicationExtension 16.0, *)
struct AccessoryCircularView: View {
    let entry: TamaEntry

    private var state: PetState { entry.state }
    private var lowestVal: Double { lowestStat(in: state).value }

    var body: some View {
        ZStack {
            // Background gauge ring
            Gauge(value: lowestVal / 100.0) {
                EmptyView()
            } currentValueLabel: {
                // Tiny sprite in the center
                MonochromeSprite(petType: state.petType, mood: entry.mood, cellSize: 2)
                    .scaledToFit()
            }
            .gaugeStyle(.accessoryCircular)
            .widgetAccentable()
        }
    }
}

@available(iOSApplicationExtension 16.0, *)
struct AccessoryRectangularView: View {
    let entry: TamaEntry

    private var state: PetState { entry.state }
    private var worst: [(label: String, value: Double)] { twoWorstStats(in: state) }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            // Line 1: name · type
            Text("\(state.name) · \(state.petType.title)")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .lineLimit(1)
                .widgetAccentable()

            // Following lines: most urgent stats as "LABEL: value%"
            ForEach(Array(worst.enumerated()), id: \.offset) { _, stat in
                HStack(spacing: 4) {
                    Text(stat.label + ":")
                        .font(.system(size: 8, weight: .semibold, design: .monospaced))
                    Text("\(Int(stat.value))%")
                        .font(.system(size: 8, weight: .regular, design: .monospaced))
                }
                .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

@available(iOSApplicationExtension 16.0, *)
struct AccessoryInlineView: View {
    let entry: TamaEntry

    private var state: PetState { entry.state }

    // Short single-line: type-emoji + name + mood word
    private var typeGlyph: String {
        switch state.petType {
        case .plant: return "🌱"
        case .cat:   return "🐱"
        case .dog:   return "🐶"
        }
    }

    var body: some View {
        Text("\(typeGlyph) \(state.name): \(moodWord(entry.mood, state: state))")
            .font(.system(size: 10, design: .monospaced))
            .lineLimit(1)
            .widgetAccentable()
    }
}

// MARK: - View modifier helper

extension View {
    func modify<T: View>(@ViewBuilder _ modifier: (Self) -> T) -> some View {
        modifier(self)
    }
}

// MARK: - Widget definition

struct TamaWidget: Widget {
    let kind: String = "TamaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TamaProvider()) { entry in
            TamaWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Tamagami")
        .description("Watch your pet's needs decay in real time.")
        .supportedFamilies(TamaWidget.supportedFamilies)
    }

    static var supportedFamilies: [WidgetFamily] {
        if #available(iOSApplicationExtension 16.0, *) {
            return [
                .systemSmall,
                .systemMedium,
                .accessoryCircular,
                .accessoryRectangular,
                .accessoryInline,
            ]
        } else {
            return [.systemSmall, .systemMedium]
        }
    }
}

// MARK: - Entry view dispatcher

struct TamaWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TamaEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            accessoryBody
        }
    }

    @ViewBuilder
    private var accessoryBody: some View {
        if #available(iOSApplicationExtension 16.0, *) {
            switch family {
            case .accessoryCircular:
                AccessoryCircularView(entry: entry)
            case .accessoryRectangular:
                AccessoryRectangularView(entry: entry)
            case .accessoryInline:
                AccessoryInlineView(entry: entry)
            default:
                SmallWidgetView(entry: entry)
            }
        } else {
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - @main entry point

@main
struct TamaWidgetBundle: WidgetBundle {
    var body: some Widget {
        TamaWidget()
    }
}
