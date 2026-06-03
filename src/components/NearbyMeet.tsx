// NearbyMeet — transient celebration overlay shown when your pet meets another
// TAMAGAMI pet nearby. Fades in, holds, fades out, then calls onDone. Rendered
// keyed by the meet nonce so each encounter mounts a fresh, self-dismissing pop.

import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Friend, PetType } from '../game/types';
import { isAnimal } from '../game/profiles';
import { PetSprite } from './PetSprite';
import { PixelText } from './PixelText';
import {
  COLOR_OVERLAY,
  LCD_BG,
  SPACE_4,
  SPACE_6,
  SPACE_8,
} from '../theme';

interface NearbyMeetProps {
  localType: PetType;
  peer: Friend;
  onDone: () => void;
}

const MEET_CELL = 6;   // smaller sprites so two fit side by side
const HOLD_MS = 2200;

export function NearbyMeet({ localType, peer, onDone }: NearbyMeetProps): React.ReactElement {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    let dismissed = false;
    const finish = (): void => {
      if (dismissed) return;
      dismissed = true;
      onDone();
    };

    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const holdTimer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 280, useNativeDriver: true }).start(finish);
    }, HOLD_MS);

    return () => clearTimeout(holdTimer);
  }, [anim, onDone]);

  const boostLabel = isAnimal(localType) ? '+ HAPPY' : '+ WATER';

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity: anim }]}
      accessible
      accessibilityLabel={`Met ${peer.name} nearby`}
    >
      <View style={styles.spriteRow}>
        <PetSprite petType={localType} mood="happy" cellSize={MEET_CELL} />
        <PixelText variant="lg" color={LCD_BG} style={styles.heart}>+</PixelText>
        <PetSprite petType={peer.petType} mood="happy" cellSize={MEET_CELL} />
      </View>

      <PixelText variant="md" color={LCD_BG} style={styles.title} numberOfLines={1}>
        MET {peer.name.toUpperCase()}!
      </PixelText>
      <PixelText variant="sm" color={LCD_BG}>{boostLabel}</PixelText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLOR_OVERLAY,
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          20,
    padding:         SPACE_8,
  },
  spriteRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  SPACE_8,
  },
  heart: {
    marginHorizontal: SPACE_6,
  },
  title: {
    marginBottom: SPACE_4,
  },
});
