// ShopModal — the store, in two tabs.
//   FOOD  : feeding means buying food, and food costs coins. Each row shows price
//           + how much hunger it restores; rows you can't afford are dimmed.
//   ITEMS : accessories the cat can wear (hats, glasses, collars). Buy with coins
//           (auto-worn), then tap an owned item to wear / take it off.
// The panel stays open so you can stock up; the balance updates live as you buy.

import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FOODS, type FoodDef } from '../game/economy';
import {
  ACCESSORIES,
  isCosmeticEquipped,
  ownsAccessory,
  type AccessoryDef,
} from '../game/cosmetics';
import type { PetCosmetics } from '../game/types';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import {
  COLOR_OVERLAY,
  COLOR_WARNING,
  LCD_BG,
  LCD_DARK,
  LCD_SHADE1,
  LCD_SHADE2,
  BORDER_WIDTH,
  SPACE_2,
  SPACE_3,
  SPACE_4,
  SPACE_6,
  SPACE_8,
} from '../theme';

export type ShopTab = 'food' | 'items';

interface ShopModalProps {
  visible: boolean;
  coins: number;
  cosmetics: PetCosmetics;
  initialTab?: ShopTab;   // which tab to land on when opened (FEED → food, SHOP → items)
  onBuy: (foodId: string) => void;
  onBuyAccessory: (id: string) => void;
  onToggleAccessory: (id: string) => void;
  onClose: () => void;
}

// ─── Food ───────────────────────────────────────────────────────────────────--

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

// ─── Items (accessories) ──────────────────────────────────────────────────────

interface ItemRowProps {
  item: AccessoryDef;
  owned: boolean;
  worn: boolean;
  affordable: boolean;
  onBuy: (id: string) => void;
  onToggle: (id: string) => void;
}

function ItemRow({ item, owned, worn, affordable, onBuy, onToggle }: ItemRowProps): React.ReactElement {
  // Owned → tapping wears/removes it (always allowed). Unowned → tapping buys it
  // (gated by coins), and buying auto-wears it.
  const disabled = !owned && !affordable;

  const handlePress = (): void => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (owned) onToggle(item.id);
    else onBuy(item.id);
  };

  const label = owned
    ? `${item.title}, ${item.slot}, ${worn ? 'worn — tap to take off' : 'owned — tap to wear'}`
    : `${item.title}, ${item.slot}, ${item.price} coins${affordable ? '' : ' — not enough coins'}`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={[styles.glyphBox, worn && styles.glyphBoxWorn]}>
        <PixelText variant="sm" color={LCD_BG}>{item.glyph}</PixelText>
      </View>
      <View style={styles.rowMain}>
        <PixelText variant="sm" color={LCD_DARK}>{item.title}</PixelText>
        <PixelText variant="tiny" color={LCD_SHADE2} style={styles.rowSub}>
          {item.slot.toUpperCase()}
        </PixelText>
      </View>
      {owned ? (
        <View style={[styles.tag, worn && styles.tagWorn]}>
          <PixelText variant="tiny" color={worn ? LCD_BG : LCD_DARK}>
            {worn ? 'WORN' : 'WEAR'}
          </PixelText>
        </View>
      ) : (
        <PixelText variant="sm" color={affordable ? LCD_DARK : COLOR_WARNING}>
          {item.price}c
        </PixelText>
      )}
    </TouchableOpacity>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, active, onPress }: TabButtonProps): React.ReactElement {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.tab, active && styles.tabActive]}
    >
      <PixelText variant="sm" color={active ? LCD_BG : LCD_DARK}>{label}</PixelText>
    </TouchableOpacity>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ShopModal({
  visible,
  coins,
  cosmetics,
  initialTab = 'food',
  onBuy,
  onBuyAccessory,
  onToggleAccessory,
  onClose,
}: ShopModalProps): React.ReactElement {
  const [tab, setTab] = useState<ShopTab>(initialTab);

  // The modal stays mounted across opens, so land on the requested tab each time
  // it's reopened — FEED enters on FOOD, the SHOP button enters on ITEMS.
  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <PixelText variant="md" color={LCD_DARK}>SHOP</PixelText>
            <PixelText variant="sm" color={LCD_DARK}>◈ {coins}</PixelText>
          </View>

          <View style={styles.tabs}>
            <TabButton label="FOOD" active={tab === 'food'} onPress={() => setTab('food')} />
            <TabButton label="ITEMS" active={tab === 'items'} onPress={() => setTab('items')} />
          </View>

          <View style={styles.divider} />

          {tab === 'food' ? (
            <>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {FOODS.map((food) => (
                  <FoodRow key={food.id} food={food} affordable={coins >= food.price} onBuy={onBuy} />
                ))}
              </ScrollView>
              <PixelText variant="tiny" color={LCD_SHADE2} style={styles.hint}>
                NO COINS? GET A JOB IN CAREER.
              </PixelText>
            </>
          ) : (
            <>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {ACCESSORIES.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    owned={ownsAccessory(cosmetics, item.id)}
                    worn={isCosmeticEquipped(cosmetics, item.id)}
                    affordable={coins >= item.price}
                    onBuy={onBuyAccessory}
                    onToggle={onToggleAccessory}
                  />
                ))}
              </ScrollView>
              <PixelText variant="tiny" color={LCD_SHADE2} style={styles.hint}>
                TAP AN OWNED ITEM TO WEAR OR REMOVE IT.
              </PixelText>
            </>
          )}

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
  tabs: {
    flexDirection: 'row',
    marginTop:     SPACE_4,
  },
  tab: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: SPACE_3,
    borderWidth:     BORDER_WIDTH,
    borderColor:     LCD_DARK,
    marginRight:     SPACE_2,
  },
  tabActive: {
    backgroundColor: LCD_DARK,
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
  glyphBoxWorn: {
    backgroundColor: COLOR_WARNING,
  },
  rowMain: {
    flex: 1,
  },
  rowSub: {
    marginTop: SPACE_2,
  },
  tag: {
    paddingHorizontal: SPACE_3,
    paddingVertical:   SPACE_2,
    borderWidth:       BORDER_WIDTH,
    borderColor:       LCD_DARK,
    backgroundColor:   LCD_SHADE1,
  },
  tagWorn: {
    backgroundColor: LCD_DARK,
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
