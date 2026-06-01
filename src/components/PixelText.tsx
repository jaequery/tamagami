import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import {
  FONT_FAMILY,
  FONT_TINY,
  FONT_SM,
  FONT_MD,
  FONT_LG,
  FONT_XL,
  COLOR_TEXT_PRIMARY,
} from '../theme';

type FontVariant = 'tiny' | 'sm' | 'md' | 'lg' | 'xl';

interface PixelTextProps {
  children: React.ReactNode;
  variant?: FontVariant;
  color?: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

const FONT_SIZE_MAP: Record<FontVariant, number> = {
  tiny: FONT_TINY,
  sm:   FONT_SM,
  md:   FONT_MD,
  lg:   FONT_LG,
  xl:   FONT_XL,
};

export function PixelText({
  children,
  variant = 'md',
  color = COLOR_TEXT_PRIMARY,
  style,
  numberOfLines,
}: PixelTextProps): React.ReactElement {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        { fontSize: FONT_SIZE_MAP[variant], color },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT_FAMILY,
    includeFontPadding: false,
  },
});
