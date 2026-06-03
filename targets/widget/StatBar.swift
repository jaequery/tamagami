// StatBar.swift
// Reusable retro segmented stat-bar for the TamaWidget.
// Renders a short label followed by N filled/empty segments proportional to value.

import SwiftUI

// MARK: - Palette (mirrors Sprite.swift; re-declared locally as file-private)
private let SEG_INK      = Color(red: 0x0F/255.0, green: 0x38/255.0, blue: 0x0F/255.0)  // #0F380F dark — label, value, healthy fill
private let SEG_OFF       = Color(red: 0x7A/255.0, green: 0xA8/255.0, blue: 0x0A/255.0)  // #7AA80A unpowered empty segment
private let SEG_WARNING    = Color(red: 0xC4/255.0, green: 0x4B/255.0, blue: 0x00/255.0)  // #C44B00 warn orange
private let SEG_CRITICAL   = Color(red: 0x8B/255.0, green: 0x00/255.0, blue: 0x00/255.0)  // #8B0000 dark-red

private func segColor(for value: Double) -> Color {
    if value <= 10 { return SEG_CRITICAL }
    if value <  30 { return SEG_WARNING }
    return SEG_INK
}

// MARK: - StatBar

struct StatBar: View {
    let label: String
    let value: Double          // 0..100
    var segments: Int = 8
    var labelWidth: CGFloat = 42
    var segWidth:   CGFloat = 6
    var segHeight:  CGFloat = 6
    var spacing:    CGFloat = 1

    private var filled: Int {
        let ratio = max(0, min(1, value / 100.0))
        return Int(ratio * Double(segments) + 0.5)
    }

    var body: some View {
        HStack(spacing: 3) {
            Text(label)
                .font(.system(size: 6, weight: .bold, design: .monospaced))
                .foregroundColor(SEG_INK)
                .frame(width: labelWidth, alignment: .leading)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            HStack(spacing: spacing) {
                ForEach(0..<segments, id: \.self) { idx in
                    RoundedRectangle(cornerRadius: 1)
                        .fill(idx < filled ? segColor(for: value) : SEG_OFF)
                        .frame(width: segWidth, height: segHeight)
                }
            }

            Text("\(Int(value))%")
                .font(.system(size: 6, weight: .regular, design: .monospaced))
                .foregroundColor(segColor(for: value))
                .frame(width: 22, alignment: .trailing)
                .lineLimit(1)
        }
    }
}

// MARK: - Compact variant for medium/small widgets (no % label, smaller)

struct CompactStatBar: View {
    let label: String
    let value: Double
    var segments: Int = 6
    var labelWidth: CGFloat = 38

    private var filled: Int {
        let ratio = max(0, min(1, value / 100.0))
        return Int(ratio * Double(segments) + 0.5)
    }

    var body: some View {
        HStack(spacing: 2) {
            Text(label)
                .font(.system(size: 5.5, weight: .bold, design: .monospaced))
                .foregroundColor(SEG_INK)
                .frame(width: labelWidth, alignment: .leading)
                .lineLimit(1)

            HStack(spacing: 1) {
                ForEach(0..<segments, id: \.self) { idx in
                    RoundedRectangle(cornerRadius: 0.5)
                        .fill(idx < filled ? segColor(for: value) : SEG_OFF)
                        .frame(width: 5, height: 5)
                }
            }
        }
    }
}
