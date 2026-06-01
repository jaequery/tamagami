// Pixel design tokens — Game Boy DMG-style LCD palette
// All colors named semantically; no raw hex in components.

// ─── LCD Palette ───────────────────────────────────────────────────────────
// Classic Game Boy green-screen shades (lightest → darkest)
export const LCD_BG       = '#9BBC0F'; // screen background (lime green)
export const LCD_SHADE1   = '#8BAC0F'; // lightest pixel shade
export const LCD_SHADE2   = '#306230'; // mid-dark pixel
export const LCD_DARK     = '#0F380F'; // darkest pixel / text
export const LCD_OFF      = '#7AA80A'; // "unpowered" dim pixel in empty stat segments

// ─── Device Shell ──────────────────────────────────────────────────────────
export const SHELL_COLOR  = '#2B7A78'; // teal device body
export const SHELL_DARK   = '#1A5B58'; // darker bezel / recessed edge
export const SHELL_LIGHT  = '#3DA39F'; // highlight rim
export const SCREEN_INSET = '#0A0A0A'; // black inset border around LCD

// ─── Semantic / UI Colors ──────────────────────────────────────────────────
export const COLOR_TEXT_PRIMARY   = LCD_DARK;    // main text on LCD
export const COLOR_TEXT_DIM       = LCD_SHADE2;  // secondary / label text
export const COLOR_TEXT_ON_SHELL  = '#EAEAEA';   // text printed on the device body
export const COLOR_WARNING        = '#C44B00';   // low-stat alert (warm orange, readable on LCD)
export const COLOR_CRITICAL       = '#8B0000';   // near-dead flash
export const COLOR_ACCENT         = LCD_SHADE2;  // pressed-button fill
export const COLOR_BUTTON_FACE    = '#D4E8A0';   // button face (lighter than LCD)
export const COLOR_BUTTON_BORDER  = LCD_DARK;    // hard pixel border on buttons
export const COLOR_BUTTON_PRESSED = LCD_SHADE2;  // pressed state fill
export const COLOR_BUTTON_DISABLED = '#A0B060';  // muted/disabled button

// ─── Typography ────────────────────────────────────────────────────────────
export const FONT_FAMILY  = 'PressStart2P_400Regular';
export const FONT_TINY    = 6;   // labels inside stat bars
export const FONT_SM      = 8;   // stat labels, sub-labels
export const FONT_MD      = 10;  // main body text, button labels
export const FONT_LG      = 14;  // pet name / emphasis
export const FONT_XL      = 18;  // title / death screen heading

// ─── Pixel Grid ────────────────────────────────────────────────────────────
// All dimensions snap to multiples of PIXEL so edges stay crisp.
export const PIXEL         = 2;  // 1 logical pixel = 2pt → crisp on @2x screens
export const BORDER_WIDTH  = PIXEL * 1;   // 2pt — hard pixel border
export const BORDER_HEAVY  = PIXEL * 2;   // 4pt — bezel / device border

// ─── Spacing Scale ─────────────────────────────────────────────────────────
export const SPACE_1  = PIXEL * 1;   //  2
export const SPACE_2  = PIXEL * 2;   //  4
export const SPACE_3  = PIXEL * 3;   //  6
export const SPACE_4  = PIXEL * 4;   //  8
export const SPACE_6  = PIXEL * 6;   // 12
export const SPACE_8  = PIXEL * 8;   // 16
export const SPACE_10 = PIXEL * 10;  // 20
export const SPACE_12 = PIXEL * 12;  // 24
export const SPACE_16 = PIXEL * 16;  // 32

// ─── Sprite Cell ───────────────────────────────────────────────────────────
// Each sprite cell is CELL_SIZE × CELL_SIZE pt (gives large, crisp pixels)
export const CELL_SIZE = 10; // pt per sprite cell

// ─── Stat Bar ──────────────────────────────────────────────────────────────
export const STAT_SEGMENTS      = 10;  // number of filled/empty blocks
export const STAT_SEGMENT_WIDTH = PIXEL * 5;   // 10pt per segment
export const STAT_SEGMENT_GAP   = PIXEL * 1;   //  2pt gap between segments
export const STAT_WARN_THRESHOLD = 30;          // below this → warning color
