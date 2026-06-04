// RevealOverlay — the "gasp" moment. Fires when a pet crosses a life stage
// (most importantly: egg → baby, the hatch). A white flash blows out the screen,
// then the newly revealed form fades up in its rarity palette with a haptic
// punch. This is the one place we spend BIG motion — everywhere else stays calm,
// so a reveal feels like an event.

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Animated,
  AccessibilityInfo,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { LifeStage, PetType, Rarity } from '../game/types';
import { paletteForRarity, rarityAccent } from '../game/palettes';
import { formName, isHatched, rarityLabel } from '../game/evolution';
import { PetSprite } from './PetSprite';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import { BORDER_WIDTH, SPACE_2, SPACE_4, SPACE_6, SPACE_8, SPACE_12 } from '../theme';

interface RevealOverlayProps {
  petType: PetType;
  rarity: Rarity;
  stage: LifeStage;     // the stage just reached
  isNewForm: boolean;   // first time this form has ever been seen → show NEW!
  onDone: () => void;
}

const STAGE_VERB: Record<LifeStage, string> = {
  egg: 'LAID',
  baby: 'HATCHED!',
  child: 'GREW UP!',
  teen: 'EVOLVED!',
  adult: 'EVOLVED!',
  elder: 'ASCENDED!',
};

export function RevealOverlay({
  petType,
  rarity,
  stage,
  isNewForm,
  onDone,
}: RevealOverlayProps): React.ReactElement {
  const palette = paletteForRarity(rarity);
  const [flash] = useState(() => new Animated.Value(1));
  const [reveal] = useState(() => new Animated.Value(0));
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    let reducedMotion = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { reducedMotion = enabled; })
      .catch(() => undefined)
      .finally(() => {
        if (reducedMotion) {
          flash.setValue(0);
          reveal.setValue(1);
          return;
        }
        animRef.current = Animated.sequence([
          Animated.timing(flash, { toValue: 0, duration: 480, useNativeDriver: true }),
          Animated.spring(reveal, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ]);
        animRef.current.start();
      });

    return () => { animRef.current?.stop(); };
  }, [flash, reveal]);

  const revealScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const verb = isHatched(stage) ? STAGE_VERB[stage] : STAGE_VERB.baby;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDone}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: palette.bg }]}
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={`Your ${formName(petType, rarity)} ${verb.toLowerCase()} Tap to continue`}
      >
        <Animated.View style={[styles.body, { opacity: reveal, transform: [{ scale: revealScale }] }]}>
          {isNewForm && (
            <View style={[styles.newBadge, { backgroundColor: rarityAccent(rarity) }]}>
              <PixelText variant="sm" color={palette.bg}>NEW!</PixelText>
            </View>
          )}

          <PixelText variant="md" color={palette.dark} style={styles.verb}>{verb}</PixelText>

          <View style={styles.sprite}>
            <PetSprite
              petType={petType}
              mood="happy"
              palette={palette}
              background={palette.bg}
            />
          </View>

          <PixelText variant="lg" color={palette.dark} style={styles.formName}>
            {formName(petType, rarity)}
          </PixelText>

          <View style={[styles.rarityTag, { backgroundColor: rarityAccent(rarity) }]}>
            <PixelText variant="sm" color={palette.bg}>{rarityLabel(rarity)}</PixelText>
          </View>
        </Animated.View>

        {/* White blow-out flash sits on top, fading away to expose the reveal. */}
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />

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
  verb: {
    marginBottom: SPACE_8,
    letterSpacing: 1,
  },
  sprite: {
    marginBottom: SPACE_8,
  },
  formName: {
    marginBottom: SPACE_6,
    textAlign: 'center',
  },
  rarityTag: {
    paddingHorizontal: SPACE_6,
    paddingVertical: SPACE_2,
    borderWidth: BORDER_WIDTH,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  newBadge: {
    paddingHorizontal: SPACE_4,
    paddingVertical: SPACE_2,
    marginBottom: SPACE_4,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: SPACE_12,
    alignSelf: 'center',
  },
});
