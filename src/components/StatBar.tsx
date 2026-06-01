import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  LCD_DARK,
  LCD_OFF,
  COLOR_WARNING,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_4,
  STAT_SEGMENTS,
  STAT_SEGMENT_WIDTH,
  STAT_SEGMENT_GAP,
  STAT_WARN_THRESHOLD,
} from '../theme';
import { PixelText } from './PixelText';

interface StatBarProps {
  label: string;
  value: number; // 0..100
}

export function StatBar({ label, value }: StatBarProps): React.ReactElement {
  const clampedValue = Math.max(0, Math.min(100, value));
  const filledCount   = Math.round((clampedValue / 100) * STAT_SEGMENTS);
  const isLow         = clampedValue < STAT_WARN_THRESHOLD;
  const fillColor     = isLow ? COLOR_WARNING : LCD_DARK;
  const accessLabel   = `${label} ${Math.round(clampedValue)} of 100`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={accessLabel}
    >
      <PixelText variant="tiny" style={styles.label}>
        {label.substring(0, 3).toUpperCase()}
      </PixelText>

      <View style={styles.segmentRow}>
        {Array.from({ length: STAT_SEGMENTS }).map((_, i) => {
          const filled = i < filledCount;
          return (
            <View
              key={i}
              style={[
                styles.segment,
                filled
                  ? { backgroundColor: fillColor }
                  : styles.segmentEmpty,
              ]}
            />
          );
        })}
      </View>

      <PixelText
        variant="tiny"
        color={isLow ? COLOR_WARNING : LCD_DARK}
        style={styles.value}
      >
        {String(Math.round(clampedValue)).padStart(3, ' ')}
      </PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  SPACE_2,
  },
  label: {
    width:       28,
    marginRight: SPACE_2,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  segment: {
    width:       STAT_SEGMENT_WIDTH,
    height:      STAT_SEGMENT_WIDTH,
    marginRight: STAT_SEGMENT_GAP,
    borderWidth: BORDER_WIDTH,
    borderColor: LCD_DARK,
  },
  segmentEmpty: {
    backgroundColor: LCD_OFF,
    borderColor:     LCD_DARK,
    borderWidth:     BORDER_WIDTH,
    opacity:         0.5,
  },
  value: {
    marginLeft: SPACE_4,
    width:      24,
    textAlign:  'right',
  },
});
