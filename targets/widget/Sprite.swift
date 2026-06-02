// Sprite.swift
// 14x14 pixel-art sprite matrices (ported from src/components/PetSprite.tsx)
// keyed by petType × mood, and the SwiftUI renderer that draws them as a grid of
// colored Rectangles. Keep these matrices in sync with PetSprite.tsx.

import SwiftUI

// MARK: - Palette
// Game Boy LCD palette. Index 0 = transparent (rendered as LCD_BG).

private let LCD_BG    = Color(hex: "#0F380F")  // darkest
private let LCD_DARK  = Color(hex: "#0F380F")  // same as bg for outline pixels
private let LCD_MID   = Color(hex: "#306230")  // mid green
private let LCD_LIGHT = Color(hex: "#8BAC0F")  // light green
private let LCD_LCD   = Color(hex: "#9BBC0F")  // brightest / LCD green
private let WHITE     = Color.white
private let ORANGE    = Color(hex: "#D87700")  // sick/warning
private let TEAR_GRN  = Color(hex: "#306230")  // dark-green tear (same as mid)

private func paletteColor(_ index: Int) -> Color {
    switch index {
    case 0: return LCD_BG     // transparent → show background
    case 1: return LCD_DARK
    case 2: return LCD_MID
    case 3: return LCD_LIGHT
    case 4: return WHITE
    case 5: return ORANGE
    case 6: return LCD_LCD
    case 7: return TEAR_GRN
    default: return LCD_BG
    }
}

// MARK: - Sprite matrices (14×14, ported verbatim from PetSprite.tsx)

typealias SpriteMatrix = [[Int]]

// ── PLANT ──────────────────────────────────────────────────────────────────
private let SPRITE_PLANT_NEUTRAL: SpriteMatrix = [
    [0,0,0,0,0,0,2,2,0,0,0,0,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,2,2,0,2,2,2,2,0,2,2,0,0],
    [0,2,3,3,2,2,2,2,2,2,3,3,2,0],
    [0,2,3,3,3,2,2,2,2,3,3,3,2,0],
    [0,0,2,2,2,2,2,2,2,2,2,2,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,1,3,3,3,3,3,3,1,0,0,0],
    [0,0,0,1,3,1,3,3,1,3,1,0,0,0],
    [0,0,0,1,3,3,1,1,3,3,1,0,0,0],
    [0,0,0,0,1,3,3,3,3,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
]

private let SPRITE_PLANT_HAPPY: SpriteMatrix = [
    [0,0,0,0,0,0,2,2,0,0,0,0,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,2,2,2,2,2,2,2,2,2,2,0,0],
    [0,2,3,3,3,2,2,2,2,3,3,3,2,0],
    [0,2,3,3,3,2,2,2,2,3,3,3,2,0],
    [0,0,2,2,2,2,2,2,2,2,2,2,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,1,3,3,3,3,3,3,1,0,0,0],
    [0,0,0,1,3,1,3,3,1,3,1,0,0,0],
    [0,0,0,1,3,1,3,3,1,3,1,0,0,0],
    [0,0,0,0,1,1,3,3,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
]

private let SPRITE_PLANT_SAD: SpriteMatrix = [
    [0,0,0,0,0,0,2,2,0,0,0,0,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,2,2,0,0,2,2,2,2,0,0,2,2,0],
    [2,3,3,2,0,2,2,2,2,0,2,3,3,2],
    [0,2,2,2,0,2,2,2,2,0,2,2,2,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,1,3,3,3,3,3,3,1,0,0,0],
    [0,0,0,1,3,1,3,3,1,3,1,0,0,0],
    [0,0,0,1,3,3,1,1,3,3,1,0,0,0],
    [0,0,7,0,1,3,3,3,3,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
]

// ── CAT ────────────────────────────────────────────────────────────────────
private let SPRITE_CAT_NEUTRAL: SpriteMatrix = [
    [0,1,1,0,0,0,0,0,0,0,1,1,0,0],
    [1,2,2,1,0,0,0,0,0,1,2,2,1,0],
    [1,2,2,1,3,3,3,3,3,1,2,2,1,0],
    [0,1,1,3,2,2,2,2,2,3,1,1,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,1,2,2,1,2,2,3,0,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,2,1,2,1,2,2,3,0,0,0],
    [0,0,3,2,1,1,1,1,1,2,3,0,0,0],
    [0,0,0,3,2,2,2,2,2,3,0,0,0,0],
    [0,0,0,0,3,3,2,2,3,3,0,0,0,0],
    [0,0,0,0,3,0,0,0,0,3,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

private let SPRITE_CAT_HAPPY: SpriteMatrix = [
    [0,1,1,0,0,0,0,0,0,0,1,1,0,0],
    [1,2,2,1,0,0,0,0,0,1,2,2,1,0],
    [1,2,2,1,3,3,3,3,3,1,2,2,1,0],
    [0,1,1,3,2,2,2,2,2,3,1,1,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,1,1,2,1,1,2,3,0,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,1,2,2,2,1,2,3,0,0,0],
    [0,0,3,2,2,1,1,1,2,2,3,0,0,0],
    [0,0,0,3,2,2,2,2,2,3,0,0,0,0],
    [0,0,0,0,3,3,2,2,3,3,0,0,0,0],
    [0,0,0,0,3,0,0,0,0,3,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

private let SPRITE_CAT_SAD: SpriteMatrix = [
    [0,1,1,0,0,0,0,0,0,0,1,1,0,0],
    [1,2,2,1,0,0,0,0,0,1,2,2,1,0],
    [1,2,2,1,3,3,3,3,3,1,2,2,1,0],
    [0,1,1,3,2,2,2,2,2,3,1,1,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,1,2,2,1,2,2,3,0,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,1,2,2,2,1,2,3,0,0,0],
    [0,0,3,2,2,1,1,1,2,2,3,0,0,0],
    [0,0,0,3,2,2,2,2,2,3,0,0,0,0],
    [0,0,0,0,3,3,2,2,3,3,0,0,0,0],
    [0,0,0,7,3,0,0,0,0,3,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

// ── DOG ────────────────────────────────────────────────────────────────────
private let SPRITE_DOG_NEUTRAL: SpriteMatrix = [
    [0,0,1,1,0,0,0,0,0,0,1,1,0,0],
    [0,1,2,2,1,0,0,0,0,1,2,2,1,0],
    [0,1,2,2,1,1,1,1,1,1,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,2,2,2,1,0],
    [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,2,1,2,2,2,2,1,2,1,0,0],
    [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,2,2,2,1,1,2,2,2,1,0,0],
    [0,0,1,2,2,1,1,1,1,2,2,1,0,0],
    [0,0,1,2,2,2,1,1,2,2,2,1,0,0],
    [0,0,0,1,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,0,1,1,2,2,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

private let SPRITE_DOG_HAPPY: SpriteMatrix = [
    [0,0,1,1,0,0,0,0,0,0,1,1,0,0],
    [0,1,2,2,1,0,0,0,0,1,2,2,1,0],
    [0,1,2,2,1,1,1,1,1,1,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,2,2,2,1,0],
    [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,2,1,1,2,2,1,1,2,1,0,0],
    [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,2,2,2,1,1,2,2,2,1,0,0],
    [0,0,1,2,1,1,1,1,1,1,2,1,0,0],
    [0,0,1,2,2,1,3,3,1,2,2,1,0,0],
    [0,0,0,1,2,2,3,3,2,2,1,0,0,0],
    [0,0,0,0,1,1,2,2,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

private let SPRITE_DOG_SAD: SpriteMatrix = [
    [0,0,1,1,0,0,0,0,0,0,1,1,0,0],
    [0,1,2,2,1,0,0,0,0,1,2,2,1,0],
    [0,1,2,2,1,1,1,1,1,1,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,2,2,2,1,0],
    [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,2,1,2,2,2,2,1,2,1,0,0],
    [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,2,2,1,1,1,1,2,2,1,0,0],
    [0,0,1,2,2,1,1,1,1,2,2,1,0,0],
    [0,0,1,2,2,2,1,1,2,2,2,1,0,0],
    [0,0,7,1,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,0,1,1,2,2,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

// ── DEAD (shared) ────────────────────────────────────────────────────────────
private let SPRITE_DEAD: SpriteMatrix = [
    [0,0,0,0,3,3,3,3,3,0,0,0,0,0],
    [0,0,0,3,2,2,2,2,2,3,0,0,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,1,2,2,1,2,2,3,0,0,0],
    [0,0,3,2,1,1,2,1,1,2,3,0,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,2,1,1,1,2,2,3,0,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,2,2,2,2,2,2,3,0,0,0],
    [0,0,3,2,0,3,2,3,0,2,3,0,0,0],
    [0,0,3,0,3,2,0,2,3,0,3,0,0,0],
    [0,0,3,0,0,0,0,0,0,0,3,0,0,0],
    [0,0,0,3,3,3,0,3,3,3,0,0,0,0],
]

// MARK: - Sprite lookup

func getSprite(petType: PetType, mood: Mood) -> SpriteMatrix {
    if mood == .dead { return SPRITE_DEAD }

    switch petType {
    case .plant:
        switch mood {
        case .happy: return SPRITE_PLANT_HAPPY
        case .sad:   return SPRITE_PLANT_SAD
        default:     return SPRITE_PLANT_NEUTRAL
        }
    case .cat:
        switch mood {
        case .happy: return SPRITE_CAT_HAPPY
        case .sad:   return SPRITE_CAT_SAD
        default:     return SPRITE_CAT_NEUTRAL
        }
    case .dog:
        switch mood {
        case .happy: return SPRITE_DOG_HAPPY
        case .sad:   return SPRITE_DOG_SAD
        default:     return SPRITE_DOG_NEUTRAL
        }
    }
}

// MARK: - SwiftUI renderer

/// Renders a 14×14 sprite matrix as a grid of SwiftUI Rectangles.
/// `cellSize` controls the pt dimension of each pixel cell.
struct PixelSprite: View {
    let petType: PetType
    let mood: Mood
    var cellSize: CGFloat = 3.0

    private var matrix: SpriteMatrix { getSprite(petType: petType, mood: mood) }

    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<matrix.count, id: \.self) { row in
                HStack(spacing: 0) {
                    ForEach(0..<matrix[row].count, id: \.self) { col in
                        Rectangle()
                            .fill(paletteColor(matrix[row][col]))
                            .frame(width: cellSize, height: cellSize)
                    }
                }
            }
        }
    }
}

/// A simplified single-color (monochrome) sprite for Lock Screen accessory families.
/// Renders dark pixels as the accent tint; transparent pixels are clear.
struct MonochromeSprite: View {
    let petType: PetType
    let mood: Mood
    var cellSize: CGFloat = 2.5

    private var matrix: SpriteMatrix { getSprite(petType: petType, mood: mood) }

    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<matrix.count, id: \.self) { row in
                HStack(spacing: 0) {
                    ForEach(0..<matrix[row].count, id: \.self) { col in
                        let idx = matrix[row][col]
                        Rectangle()
                            .fill(idx == 0 ? Color.clear : Color.primary)
                            .frame(width: cellSize, height: cellSize)
                    }
                }
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Color extension

extension Color {
    init(hex: String) {
        let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        let scanner = Scanner(string: h)
        var value: UInt64 = 0
        scanner.scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >>  8) & 0xFF) / 255
        let b = Double( value        & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
