// CodexModal — the collection book. Every form (petType × rarity) shown as a
// cell: hatched forms reveal a mini sprite in their rarity palette; everything
// else is a locked "?" silhouette. The wall of locked cells IS the hook — you
// can see exactly how much mystery is left, and which rarities you've never
// pulled. Rows are grouped by pet type so the species is known and the rarity
// is the thing you're hunting.

import React from 'react';
import { Modal, ScrollView, View, StyleSheet } from 'react-native';
import type { PetType } from '../game/types';
import { ALL_FORMS, TOTAL_FORMS, rarityEpithet, type FormId } from '../game/evolution';
import { paletteForRarity, rarityAccent } from '../game/palettes';
import { PetSprite } from './PetSprite';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import {
  COLOR_OVERLAY,
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  LCD_OFF,
  SCREEN_INSET,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
} from '../theme';

const PET_TYPES: readonly PetType[] = ['plant', 'cat', 'dog'];
const CELL_PX = 3; // sprite cell size inside a codex thumbnail (14 cells → 42pt)

interface CodexModalProps {
  visible: boolean;
  discovered: Set<FormId>;
  onClose: () => void;
}

export function CodexModal({ visible, discovered, onClose }: CodexModalProps): React.ReactElement {
  const found = ALL_FORMS.filter((f) => discovered.has(f.id)).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <PixelText variant="md" color={LCD_DARK} style={styles.heading}>
            CODEX {found}/{TOTAL_FORMS}
          </PixelText>
          <View style={styles.divider} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {PET_TYPES.map((type) => (
              <View key={type} style={styles.group}>
                <PixelText variant="tiny" color={LCD_SHADE2} style={styles.groupLabel}>
                  {type.toUpperCase()}
                </PixelText>
                <View style={styles.cellRow}>
                  {ALL_FORMS.filter((f) => f.petType === type).map((form) => {
                    const isFound = discovered.has(form.id);
                    const palette = paletteForRarity(form.rarity);
                    return (
                      <View key={form.id} style={styles.cell}>
                        <View
                          style={[
                            styles.thumb,
                            {
                              backgroundColor: isFound ? palette.bg : LCD_OFF,
                              borderColor: isFound ? rarityAccent(form.rarity) : LCD_SHADE2,
                            },
                          ]}
                        >
                          {isFound ? (
                            <PetSprite
                              petType={form.petType}
                              mood="happy"
                              palette={palette}
                              background={palette.bg}
                              cellSize={CELL_PX}
                            />
                          ) : (
                            <PixelText variant="md" color={LCD_SHADE2}>?</PixelText>
                          )}
                        </View>
                        <PixelText variant="tiny" color={isFound ? LCD_DARK : LCD_SHADE2} style={styles.cellLabel}>
                          {isFound ? rarityEpithet(form.rarity) : '???'}
                        </PixelText>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <PixelButton label="CLOSE" onPress={onClose} accessibilityLabel="Close codex" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const THUMB = 14 * CELL_PX + SPACE_4; // sprite + inner padding

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
  group: {
    marginBottom: SPACE_6,
  },
  groupLabel: {
    marginBottom: SPACE_2,
  },
  cellRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    alignItems: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH,
    borderColor: SCREEN_INSET,
    marginBottom: SPACE_2,
  },
  cellLabel: {
    fontSize: 5,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      SPACE_4,
  },
});
