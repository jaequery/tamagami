// EventBanner — the in-LCD omen. Shows while a world event is live: an inverted
// dark strip (it stands out against the green screen) with the event's glyph and
// name. If the pet hasn't witnessed it yet, the whole strip is a WITNESS button;
// once witnessed it shows a passive check so you know you caught it.

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import type { GameEvent } from '../game/events';
import { PixelText } from './PixelText';
import { LCD_BG, LCD_DARK, BORDER_WIDTH, SPACE_2, SPACE_4 } from '../theme';

interface EventBannerProps {
  event: GameEvent;
  witnessed: boolean; // has THIS pet already witnessed it
  onWitness: () => void;
}

export function EventBanner({ event, witnessed, onWitness }: EventBannerProps): React.ReactElement {
  const inner = (
    <View style={styles.row}>
      <PixelText variant="sm" color={LCD_BG} style={styles.glyph}>{event.glyph}</PixelText>
      <PixelText variant="tiny" color={LCD_BG} numberOfLines={1} style={styles.name}>
        {event.name}
      </PixelText>
      <PixelText variant="tiny" color={LCD_BG}>
        {witnessed ? 'WITNESSED' : 'TAP TO WITNESS'}
      </PixelText>
    </View>
  );

  if (witnessed) {
    return (
      <View style={styles.banner} accessible accessibilityLabel={`${event.name} is live. Already witnessed.`}>
        {inner}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={onWitness}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${event.name} is live. Tap to witness it.`}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: LCD_DARK,
    borderWidth: BORDER_WIDTH,
    borderColor: LCD_DARK,
    paddingVertical: SPACE_2,
    paddingHorizontal: SPACE_4,
    marginTop: SPACE_4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glyph: {
    marginRight: SPACE_4,
  },
  name: {
    flex: 1,
    marginRight: SPACE_4,
  },
});
