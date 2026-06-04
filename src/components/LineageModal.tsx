// LineageModal — the family tree. Every generation of the bloodline, oldest at
// the top, the living pet pinned at the bottom. Death stops being an ending and
// becomes a row in a history you keep adding to.

import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import type { CauseOfDeath, PetState } from '../game/types';
import type { Ancestor } from '../game/lineage';
import { rarityEpithet, stageFor } from '../game/evolution';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import {
  COLOR_OVERLAY,
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  COLOR_WARNING,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
} from '../theme';

interface LineageModalProps {
  visible: boolean;
  lineage: Ancestor[];
  current: PetState;
  onClose: () => void;
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function causeLabel(cause: CauseOfDeath): string {
  switch (cause) {
    case 'starvation': return 'STARVED';
    case 'thirst':     return 'WILTED';
    case 'neglect':    return 'NEGLECT';
    default:           return 'LOST';
  }
}

const TYPE_NOUN: Record<PetState['petType'], string> = { plant: 'PLANT', cat: 'CAT', dog: 'DOG' };

export function LineageModal({ visible, lineage, current, onClose }: LineageModalProps): React.ReactElement {
  const generations = lineage.length + 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <PixelText variant="md" color={LCD_DARK} style={styles.heading}>
            FAMILY TREE ({generations})
          </PixelText>
          <View style={styles.divider} />

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {lineage.map((a, i) => (
              <View key={`${a.bornAt}-${i}`} style={styles.row}>
                <View style={styles.genTag}>
                  <PixelText variant="tiny" color={LCD_BG}>G{a.generation}</PixelText>
                </View>
                <View style={styles.rowMain}>
                  <PixelText variant="sm" color={LCD_DARK} numberOfLines={1}>
                    {a.name.toUpperCase()}
                  </PixelText>
                  <PixelText variant="tiny" color={LCD_SHADE2} numberOfLines={1}>
                    {rarityEpithet(a.rarity)} {TYPE_NOUN[a.petType]} · {formatAge(a.ageSeconds)}
                  </PixelText>
                </View>
                <PixelText variant="tiny" color={COLOR_WARNING} style={styles.fate}>
                  {causeLabel(a.causeOfDeath)}
                </PixelText>
              </View>
            ))}

            {/* The living generation, pinned at the bottom. */}
            <View style={[styles.row, styles.livingRow]}>
              <View style={[styles.genTag, styles.genTagLiving]}>
                <PixelText variant="tiny" color={LCD_BG}>G{current.generation}</PixelText>
              </View>
              <View style={styles.rowMain}>
                <PixelText variant="sm" color={LCD_DARK} numberOfLines={1}>
                  {current.name.toUpperCase()}
                </PixelText>
                <PixelText variant="tiny" color={LCD_SHADE2} numberOfLines={1}>
                  {rarityEpithet(current.rarity)} {TYPE_NOUN[current.petType]} · {stageFor(current.ageSeconds).toUpperCase()}
                </PixelText>
              </View>
              <PixelText variant="tiny" color={current.isDead ? COLOR_WARNING : LCD_DARK} style={styles.fate}>
                {current.isDead ? causeLabel(current.causeOfDeath) : 'ALIVE'}
              </PixelText>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PixelButton label="CLOSE" onPress={onClose} accessibilityLabel="Close family tree" />
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
    maxHeight: '80%',
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
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACE_2,
  },
  livingRow: {
    borderTopWidth: BORDER_WIDTH,
    borderTopColor: LCD_SHADE2,
    marginTop: SPACE_2,
    paddingTop: SPACE_4,
  },
  genTag: {
    minWidth: 22,
    paddingHorizontal: SPACE_2,
    paddingVertical: SPACE_2,
    backgroundColor: LCD_SHADE2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACE_4,
  },
  genTagLiving: {
    backgroundColor: LCD_DARK,
  },
  rowMain: {
    flex: 1,
  },
  fate: {
    marginLeft: SPACE_4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACE_4,
  },
});
