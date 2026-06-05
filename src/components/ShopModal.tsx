// ShopModal — the food marketplace. Feeding the pet now means buying food, and
// food costs coins. Each row shows price + how much hunger it restores; rows you
// can't afford are dimmed. Stays open so you can stock up; the balance updates
// live as you buy.

import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FOODS, type FoodDef } from '../game/economy';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import {
  COLOR_OVERLAY,
  COLOR_WARNING,
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
} from '../theme';

interface ShopModalProps {
  visible: boolean;
  coins: number;
  onBuy: (foodId: string) => void;
  onClose: () => void;
}

interface FoodRowProps {
  food: FoodDef;
  affordable: boolean;
  onBuy: (foodId: string) => void;
}

function FoodRow({ food, affordable, onBuy }: FoodRowProps): React.ReactElement {
  const handlePress = (): void => {
    if (!affordable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onBuy(food.id);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!affordable}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${food.title}, ${food.price} coins, restores ${food.hunger} hunger${affordable ? '' : ' — not enough coins'}`}
      style={[styles.row, !affordable && styles.rowDisabled]}
    >
      <View style={styles.glyphBox}>
        <PixelText variant="md" color={LCD_BG}>{food.glyph}</PixelText>
      </View>
      <View style={styles.rowMain}>
        <PixelText variant="sm" color={LCD_DARK}>{food.title}</PixelText>
        <PixelText variant="tiny" color={LCD_SHADE2} style={styles.rowSub}>
          +{food.hunger} HUNGER
        </PixelText>
      </View>
      <PixelText variant="sm" color={affordable ? LCD_DARK : COLOR_WARNING}>
        {food.price}c
      </PixelText>
    </TouchableOpacity>
  );
}

export function ShopModal({ visible, coins, onBuy, onClose }: ShopModalProps): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <PixelText variant="md" color={LCD_DARK}>SHOP</PixelText>
            <PixelText variant="sm" color={LCD_DARK}>◈ {coins}</PixelText>
          </View>

          <View style={styles.divider} />

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {FOODS.map((food) => (
              <FoodRow key={food.id} food={food} affordable={coins >= food.price} onBuy={onBuy} />
            ))}
          </ScrollView>

          <PixelText variant="tiny" color={LCD_SHADE2} style={styles.hint}>
            NO COINS? GET A JOB IN CAREER.
          </PixelText>

          <View style={styles.footer}>
            <PixelButton label="CLOSE" onPress={onClose} accessibilityLabel="Close shop" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: COLOR_OVERLAY,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         SPACE_8,
  },
  panel: {
    width:           '100%',
    maxWidth:        320,
    maxHeight:       '80%',
    backgroundColor: LCD_BG,
    borderWidth:     BORDER_WIDTH,
    borderColor:     LCD_DARK,
    padding:         SPACE_6,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  divider: {
    height:          BORDER_WIDTH,
    backgroundColor: LCD_SHADE2,
    opacity:         0.5,
    marginVertical:  SPACE_4,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: SPACE_4,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  glyphBox: {
    width:           22,
    height:          22,
    backgroundColor: LCD_DARK,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     SPACE_4,
  },
  rowMain: {
    flex: 1,
  },
  rowSub: {
    marginTop: SPACE_2,
  },
  hint: {
    textAlign:  'center',
    marginTop:  SPACE_4,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      SPACE_4,
  },
});
