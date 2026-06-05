import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LCD_BG, SPACE_8, DEVICE_FRAME_MIN_HEIGHT } from '../theme';

interface DeviceFrameProps {
  children: React.ReactNode;
}

/**
 * Full-bleed LCD screen. The pet lives directly on the screen now — no Game Boy
 * shell, bezel, or speaker grille. Just edge-to-edge green.
 */
export function DeviceFrame({ children }: DeviceFrameProps): React.ReactElement {
  return <View style={styles.screen}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex:              1,
    backgroundColor:   LCD_BG,
    paddingHorizontal: SPACE_8,
    paddingVertical:   SPACE_8,
    minHeight:         DEVICE_FRAME_MIN_HEIGHT,
    justifyContent:    'center',
  },
});
