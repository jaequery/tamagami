import React, { useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  COLOR_BUTTON_FACE,
  COLOR_BUTTON_BORDER,
  COLOR_BUTTON_DISABLED,
  COLOR_TEXT_PRIMARY,
  LCD_DARK,
  PIXEL,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_4,
  SPACE_6,
} from '../theme';
import { PixelText } from './PixelText';

interface PixelButtonProps {
  label:             string;
  onPress:           () => void;
  disabled?:         boolean;
  glyph?:            string;   // single unicode / ascii char used as pixel icon
  accessibilityLabel?: string;
  wide?:             boolean;  // stretch to fill available width
}

export function PixelButton({
  label,
  onPress,
  disabled = false,
  glyph,
  accessibilityLabel,
  wide = false,
}: PixelButtonProps): React.ReactElement {
  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  }, [disabled, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={[styles.outer, wide && styles.wide, disabled && styles.outerDisabled]}
    >
      {/* Pixel shadow offset (bottom-right hard border) */}
      <View style={[styles.shadow, disabled && styles.shadowDisabled]} />
      <View style={[styles.face, disabled && styles.faceDisabled]}>
        {glyph !== undefined && (
          <PixelText
            variant="sm"
            color={disabled ? COLOR_BUTTON_DISABLED : LCD_DARK}
            style={styles.glyph}
          >
            {glyph}
          </PixelText>
        )}
        <PixelText
          variant="sm"
          color={disabled ? COLOR_BUTTON_DISABLED : COLOR_TEXT_PRIMARY}
          numberOfLines={1}
          style={styles.labelText}
        >
          {label}
        </PixelText>
      </View>
    </TouchableOpacity>
  );
}

const SHADOW_OFFSET = PIXEL * 2; // 4pt hard shadow

const styles = StyleSheet.create({
  outer: {
    minWidth:  44,
    minHeight: 44,
    margin:    SPACE_2,
    // Leave space for the shadow
    paddingBottom: SHADOW_OFFSET,
    paddingRight:  SHADOW_OFFSET,
  },
  outerDisabled: {
    opacity: 0.55,
  },
  wide: {
    flex: 1,
  },
  shadow: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    left:            SHADOW_OFFSET,
    top:             SHADOW_OFFSET,
    backgroundColor: COLOR_BUTTON_BORDER,
  },
  shadowDisabled: {
    backgroundColor: COLOR_BUTTON_DISABLED,
  },
  face: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: COLOR_BUTTON_FACE,
    borderWidth:     BORDER_WIDTH,
    borderColor:     COLOR_BUTTON_BORDER,
    paddingHorizontal: SPACE_6,
    paddingVertical:   SPACE_4,
    minWidth:          44,
    minHeight:         36,
  },
  faceDisabled: {
    backgroundColor: '#B8CCAA',
  },
  glyph: {
    marginRight: SPACE_2,
  },
  labelText: {
    // handled by PixelText
  },
});
