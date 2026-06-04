// EventReveal — the apparition. Fires when a pet witnesses a live world event.
// Where the hatch reveal blows out WHITE, an event emerges from the DARK: the
// screen falls to a cosmic night, the omen fades up with a haptic, and the pet
// is marked forever. Themed with the 'secret' (lunar night) palette so every
// event feels like the same mysterious layer.

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Animated,
  AccessibilityInfo,
  Pressable,
  View,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { GameEvent } from '../game/events';
import { paletteForRarity } from '../game/palettes';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import { BORDER_WIDTH, SPACE_2, SPACE_4, SPACE_6, SPACE_8, SPACE_12 } from '../theme';

const NIGHT = paletteForRarity('secret'); // bg #0B1026, ink #CBD6FF

interface EventRevealProps {
  event: GameEvent;
  isNew: boolean; // first time EVER witnessing this event → NEW!
  onDone: () => void;
}

export function EventReveal({ event, isNew, onDone }: EventRevealProps): React.ReactElement {
  const [appear] = useState(() => new Animated.Value(0));
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    let reducedMotion = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { reducedMotion = enabled; })
      .catch(() => undefined)
      .finally(() => {
        if (reducedMotion) {
          appear.setValue(1);
          return;
        }
        animRef.current = Animated.timing(appear, { toValue: 1, duration: 700, useNativeDriver: true });
        animRef.current.start();
      });

    return () => { animRef.current?.stop(); };
  }, [appear]);

  const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: NIGHT.bg }]}
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={`${event.name} witnessed. ${event.blurb} Tap to continue`}
      >
        <Animated.View style={[styles.body, { opacity: appear, transform: [{ scale }] }]}>
          {isNew && (
            <View style={[styles.newBadge, { backgroundColor: NIGHT.shade2 }]}>
              <PixelText variant="sm" color={NIGHT.bg}>NEW!</PixelText>
            </View>
          )}

          <PixelText variant="xl" color={NIGHT.dark} style={styles.glyph}>{event.glyph}</PixelText>
          <PixelText variant="lg" color={NIGHT.dark} style={styles.name}>{event.name}</PixelText>
          <PixelText variant="tiny" color={NIGHT.shade2} style={styles.blurb}>{event.blurb}</PixelText>
          <PixelText variant="sm" color={NIGHT.dark} style={styles.witnessed}>WITNESSED</PixelText>
        </Animated.View>

        <View style={styles.footer}>
          <PixelButton label="CONTINUE" onPress={onDone} accessibilityLabel="Continue" />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE_12,
  },
  body: {
    alignItems: 'center',
  },
  newBadge: {
    paddingHorizontal: SPACE_4,
    paddingVertical: SPACE_2,
    marginBottom: SPACE_6,
  },
  glyph: {
    marginBottom: SPACE_8,
  },
  name: {
    marginBottom: SPACE_4,
    textAlign: 'center',
  },
  blurb: {
    marginBottom: SPACE_6,
    textAlign: 'center',
  },
  witnessed: {
    borderWidth: BORDER_WIDTH,
    borderColor: NIGHT.shade2,
    paddingHorizontal: SPACE_6,
    paddingVertical: SPACE_2,
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: SPACE_12,
    alignSelf: 'center',
  },
});
