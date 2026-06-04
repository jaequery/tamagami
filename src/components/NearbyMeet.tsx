// NearbyMeet — transient celebration overlay shown when your pet meets another
// TAMAGAMI pet nearby. Fades in, holds, fades out, then calls onDone. Rendered
// keyed by the meet nonce so each encounter mounts a fresh, self-dismissing pop.

import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Friend, PetType } from '../game/types';
import { isAnimal } from '../game/profiles';
import { rarityEpithet, rarityRank } from '../game/evolution';
import { paletteForRarity, rarityAccent } from '../game/palettes';
import { PetSprite } from './PetSprite';
import { PixelText } from './PixelText';
import {
  COLOR_OVERLAY,
  LCD_BG,
  BORDER_WIDTH,
  SPACE_2,
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
  const peerRare = rarityRank(peer.rarity) >= rarityRank('rare');

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity: anim }]}
      accessible
      accessibilityLabel={`Met ${peer.name}${peerRare ? `, a ${rarityEpithet(peer.rarity)} pet,` : ''} nearby`}
    >
      <View style={styles.spriteRow}>
        <PetSprite petType={localType} mood="happy" cellSize={MEET_CELL} />
        <PixelText variant="lg" color={LCD_BG} style={styles.heart}>+</PixelText>
        <PetSprite
          petType={peer.petType}
          mood="happy"
          cellSize={MEET_CELL}
          palette={paletteForRarity(peer.rarity)}
        />
      </View>

      <PixelText variant="md" color={LCD_BG} style={styles.title} numberOfLines={1}>
        MET {peer.name.toUpperCase()}!
      </PixelText>
      <PixelText variant="sm" color={LCD_BG}>{boostLabel}</PixelText>

      {peerRare && (
        <View style={[styles.rarityTag, { backgroundColor: rarityAccent(peer.rarity) }]}>
          <PixelText variant="tiny" color={LCD_BG}>{rarityEpithet(peer.rarity)} PET! +LUCK</PixelText>
        </View>
      )}
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
  rarityTag: {
    marginTop:         SPACE_6,
    paddingHorizontal: SPACE_4,
    paddingVertical:   SPACE_2,
    borderWidth:       BORDER_WIDTH,
    borderColor:       'rgba(0,0,0,0.25)',
  },
});
