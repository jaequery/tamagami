import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  SHELL_COLOR,
  SHELL_DARK,
  SHELL_LIGHT,
  SCREEN_INSET,
  LCD_BG,
  COLOR_TEXT_ON_SHELL,
  PIXEL,
  BORDER_HEAVY,
  SPACE_4,
  SPACE_6,
  SPACE_8,
  SPACE_12,
  DEVICE_FRAME_MIN_HEIGHT,
} from '../theme';
import { PixelText } from './PixelText';

interface DeviceFrameProps {
  children: React.ReactNode;
}

// Square pixel speaker hole — no borderRadius so it reads as a hard pixel grid
function SpeakerDot({ size = 4 }: { size?: number }): React.ReactElement {
  return (
    <View
      style={[
        styles.speakerDot,
        { width: size, height: size },
      ]}
    />
  );
}

export function DeviceFrame({ children }: DeviceFrameProps): React.ReactElement {
  return (
    <View style={styles.device}>
      {/* Top brand / title strip */}
      <View style={styles.topStrip}>
        <PixelText variant="tiny" color={COLOR_TEXT_ON_SHELL} style={styles.brandText}>
          TAMAGAMI
        </PixelText>
      </View>

      {/* Screen area — inset bezel + LCD window */}
      <View style={styles.bezel}>
        <View style={styles.screenInset}>
          <View style={styles.lcd}>
            {children}
          </View>
        </View>
      </View>

      {/* Decorative speaker grille */}
      <View style={styles.speakerRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SpeakerDot key={i} size={PIXEL * 2} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  device: {
    flex:            1,
    backgroundColor: SHELL_COLOR,
    borderWidth:     BORDER_HEAVY,
    borderColor:     SHELL_DARK,
    // Hard chamfer: tighter top / even tighter bottom for retro feel
    borderTopLeftRadius:     PIXEL * 3,
    borderTopRightRadius:    PIXEL * 3,
    borderBottomLeftRadius:  PIXEL * 2,
    borderBottomRightRadius: PIXEL * 2,
    paddingHorizontal: SPACE_8,
    paddingBottom:     SPACE_8,
    // Hard-pixel top highlight rim
    borderTopColor:  SHELL_LIGHT,
    shadowColor:     SHELL_DARK,
    shadowOffset:    { width: PIXEL * 2, height: PIXEL * 4 },
    shadowOpacity:   0.4,
    shadowRadius:    0, // keep it pixel-hard
    elevation:       6,
  },
  topStrip: {
    alignItems:   'center',
    paddingTop:   SPACE_6,
    paddingBottom: SPACE_4,
  },
  brandText: {
    letterSpacing: 2,
  },
  bezel: {
    backgroundColor:  SHELL_DARK,
    borderWidth:      PIXEL,
    borderColor:      SCREEN_INSET,
    borderRadius:     PIXEL * 2,
    padding:          PIXEL * 3,
    marginBottom:     SPACE_6,
  },
  screenInset: {
    borderWidth:      PIXEL,
    borderColor:      SCREEN_INSET,
    backgroundColor:  SCREEN_INSET,
  },
  lcd: {
    backgroundColor: LCD_BG,
    paddingHorizontal: SPACE_6,
    paddingVertical:   SPACE_6,
    minHeight:         DEVICE_FRAME_MIN_HEIGHT,
  },
  speakerRow: {
    flexDirection:  'row',
    justifyContent: 'flex-end',
    alignItems:     'center',
    paddingRight:   SPACE_4,
    gap:            PIXEL * 2,
    marginBottom:   SPACE_12,
  },
  speakerDot: {
    backgroundColor: SHELL_DARK,
  },
});
