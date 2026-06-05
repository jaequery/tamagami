// StoryModal — her life story, surfaced (GAME.md §1 origin, §2 household, §8 bond).
// The cold-open cinematics are flagged for a later pass; until then this is where
// the dealt-not-chosen life lives: where she came from, who she got, and the bond
// you've built — named gently, never metered.

import React from 'react';
import { Modal, ScrollView, View, StyleSheet } from 'react-native';
import type { PetState } from '../game/types';
import { isOriginId, originById, HANDOFF_LINES } from '../game/origins';
import { householdFromId, contrastLine } from '../game/household';
import { bondLevel, bondBehaviors } from '../game/bond';
import { ownerStageOf } from '../game/engine';
import { ownerMoodBand } from '../game/ownerLife';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import {
  COLOR_OVERLAY,
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
} from '../theme';

interface StoryModalProps {
  visible: boolean;
  pet: PetState;
  onClose: () => void;
}

const BOND_LABEL: Record<ReturnType<typeof bondLevel>, string> = {
  wary: 'STILL WARMING UP',
  warming: 'WARMING TO YOU',
  bonded: 'BONDED',
  devoted: 'DEVOTED TO YOU',
};

const OWNER_MOOD_LINE: Record<ReturnType<typeof ownerMoodBand>, string> = {
  low: 'has been having a hard time lately.',
  okay: 'is getting by, day to day.',
  good: 'has been doing well lately.',
};

function Section({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <View style={styles.section}>
      <PixelText variant="tiny" color={LCD_SHADE2} style={styles.sectionLabel}>{label}</PixelText>
      {children}
    </View>
  );
}

export function StoryModal({ visible, pet, onClose }: StoryModalProps): React.ReactElement {
  const origin = isOriginId(pet.origin) ? originById(pet.origin) : null;
  const household = householdFromId(pet.household);
  const level = bondLevel(pet.bond ?? 0);
  const behaviors = bondBehaviors(pet.bond ?? 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <PixelText variant="md" color={LCD_DARK} style={styles.heading}>
            {pet.name.toUpperCase()}&apos;S STORY
          </PixelText>
          <View style={styles.divider} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {origin !== null && (
              <Section label="HOW SHE CAME TO YOU">
                <PixelText variant="sm" color={LCD_DARK} style={styles.title}>{origin.title}</PixelText>
                {origin.beats.map((beat, i) => (
                  <PixelText key={i} variant="tiny" color={LCD_DARK} style={styles.beat}>{beat}</PixelText>
                ))}
                {HANDOFF_LINES.map((line, i) => (
                  <PixelText key={`h${i}`} variant="tiny" color={LCD_SHADE2} style={styles.beat}>{line}</PixelText>
                ))}
              </Section>
            )}

            {household !== null && (
              <Section label="WHERE SHE LANDED">
                <PixelText variant="tiny" color={LCD_DARK} style={styles.beat}>{household.homeLine}</PixelText>
                <PixelText variant="tiny" color={LCD_DARK} style={styles.beat}>{household.personLine}</PixelText>
                {origin !== null && (
                  <PixelText variant="tiny" color={LCD_SHADE2} style={styles.contrast}>
                    {contrastLine(origin.id, household)}
                  </PixelText>
                )}
              </Section>
            )}

            {household !== null && (
              <Section label="HER PERSON">
                <PixelText variant="tiny" color={LCD_DARK} style={styles.beat}>
                  {household.person} {OWNER_MOOD_LINE[ownerMoodBand(pet.ownerMood ?? 55)]}
                </PixelText>
                <PixelText variant="tiny" color={LCD_SHADE2} style={styles.beat}>
                  ({String(ownerStageOf(pet)).replace('_', ' ')})
                </PixelText>
              </Section>
            )}

            <Section label="THE BOND">
              <PixelText variant="sm" color={LCD_DARK} style={styles.title}>{BOND_LABEL[level]}</PixelText>
              {behaviors.map((b, i) => (
                <PixelText key={i} variant="tiny" color={LCD_DARK} style={styles.beat}>{b}</PixelText>
              ))}
            </Section>
          </ScrollView>

          <View style={styles.footer}>
            <PixelButton label="CLOSE" onPress={onClose} accessibilityLabel="Close story" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLOR_OVERLAY,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE_8,
  },
  panel: {
    width: '100%',
    maxWidth: 320,
    maxHeight: '85%',
    backgroundColor: LCD_BG,
    borderWidth: BORDER_WIDTH,
    borderColor: LCD_DARK,
    padding: SPACE_6,
  },
  heading: {
    textAlign: 'center',
  },
  divider: {
    height: BORDER_WIDTH,
    backgroundColor: LCD_SHADE2,
    opacity: 0.5,
    marginVertical: SPACE_4,
  },
  section: {
    marginBottom: SPACE_6,
  },
  sectionLabel: {
    marginBottom: SPACE_2,
  },
  title: {
    marginBottom: SPACE_2,
  },
  beat: {
    lineHeight: 12,
    marginBottom: SPACE_2,
  },
  contrast: {
    lineHeight: 12,
    marginTop: SPACE_2,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACE_4,
  },
});
