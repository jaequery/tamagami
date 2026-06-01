import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import {
  LCD_DARK,
  LCD_OFF,
  COLOR_WARNING,
  COLOR_CRITICAL,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_4,
  STAT_SEGMENTS,
  STAT_SEGMENT_WIDTH,
  STAT_SEGMENT_GAP,
  STAT_WARN_THRESHOLD,
  STAT_CRITICAL_THRESHOLD,
} from '../theme';
import { PixelText } from './PixelText';

interface StatBarProps {
  label: string;
  value: number; // 0..100
}

export function StatBar({ label, value }: StatBarProps): React.ReactElement {
  const clampedValue  = Math.max(0, Math.min(100, value));
  const filledCount   = Math.round((clampedValue / 100) * STAT_SEGMENTS);
  const isCritical    = clampedValue <= STAT_CRITICAL_THRESHOLD;
  const isLow         = clampedValue < STAT_WARN_THRESHOLD;
  const fillColor     = isCritical ? COLOR_CRITICAL : isLow ? COLOR_WARNING : LCD_DARK;
  const accessLabel   = `${label} ${Math.round(clampedValue)} of 100`;

  // Pulse opacity when critical so the bar draws the eye
  const [pulseAnim] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!isCritical) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isCritical, pulseAnim]);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={accessLabel}
    >
      {/* Label — FONT_SM (8pt) minimum */}
      <PixelText variant="sm" style={styles.label}>
        {label.substring(0, 3).toUpperCase()}
      </PixelText>

      <View style={styles.segmentRow}>
        {Array.from({ length: STAT_SEGMENTS }).map((_, i) => {
          const filled = i < filledCount;
          const segStyle = filled
            ? { backgroundColor: fillColor }
            : styles.segmentEmpty;
          if (isCritical && filled) {
            return (
              <Animated.View
                key={i}
                style={[styles.segment, segStyle, { opacity: pulseAnim }]}
              />
            );
          }
          return (
            <View
              key={i}
              style={[styles.segment, filled ? segStyle : styles.segmentEmpty]}
            />
          );
        })}
      </View>

      {/* Value — FONT_SM (8pt), no space-padding that hides low numbers */}
      <PixelText
        variant="sm"
        color={isCritical ? COLOR_CRITICAL : isLow ? COLOR_WARNING : LCD_DARK}
        style={styles.value}
      >
        {String(Math.round(clampedValue))}
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
    flex:          1,
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
    width:      22,
    textAlign:  'right',
  },
});
