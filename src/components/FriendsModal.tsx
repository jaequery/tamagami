// FriendsModal — the local log of TAMAGAMI pets you've met nearby over BLE.
// Read-only list; friends are added automatically on each (cooldown-gated) meet.

import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import type { Friend, PetType } from '../game/types';
import { bondLevel, bondLabel } from '../game/social';
import { rarityEpithet } from '../game/evolution';
import { rarityAccent } from '../game/palettes';
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

interface FriendsModalProps {
  visible: boolean;
  /** Reference time (ms) for relative "last met" labels; captured when opened. */
  now: number;
  friends: Friend[];
  onClose: () => void;
}

const TYPE_TAG: Record<PetType, string> = { cat: 'C' };

function formatAgo(ms: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 60)    return 'now';
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function FriendsModal({ visible, now, friends, onClose }: FriendsModalProps): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <PixelText variant="md" color={LCD_DARK} style={styles.heading}>
            FRIENDS ({friends.length})
          </PixelText>

          <View style={styles.divider} />

          {friends.length === 0 ? (
            <View style={styles.empty} accessible accessibilityLabel="No friends yet">
              <PixelText variant="sm" color={LCD_SHADE2} style={styles.emptyText}>
                NO FRIENDS YET
              </PixelText>
              <PixelText variant="tiny" color={LCD_SHADE2} style={styles.emptyText}>
                GET NEAR ANOTHER TAMAGAMI WITH THE APP OPEN
              </PixelText>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {friends.map((f) => (
                <View key={f.id} style={styles.row}>
                  <View style={[styles.tag, { backgroundColor: rarityAccent(f.rarity) }]}>
                    <PixelText variant="sm" color={LCD_BG}>{TYPE_TAG[f.petType]}</PixelText>
                  </View>
                  <View style={styles.rowMain}>
                    <PixelText variant="sm" color={LCD_DARK} numberOfLines={1}>
                      {f.name.toUpperCase()}
                    </PixelText>
                    <PixelText variant="tiny" color={LCD_SHADE2} numberOfLines={1}>
                      {rarityEpithet(f.rarity)} · {bondLabel(bondLevel(f.meetCount))}
                    </PixelText>
                  </View>
                  <PixelText variant="tiny" color={LCD_SHADE2} style={styles.meta}>
                    ×{f.meetCount} · {formatAgo(f.lastMetAt, now)}
                  </PixelText>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <PixelButton label="CLOSE" onPress={onClose} accessibilityLabel="Close friends list" />
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
  heading: {
    textAlign: 'center',
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
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: SPACE_2,
  },
  tag: {
    width:           18,
    height:          18,
    backgroundColor: LCD_SHADE2,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     SPACE_4,
  },
  rowMain: {
    flex: 1,
  },
  meta: {
    marginLeft: SPACE_4,
  },
  empty: {
    alignItems:    'center',
    paddingVertical: SPACE_8,
  },
  emptyText: {
    textAlign:    'center',
    marginBottom: SPACE_2,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      SPACE_4,
  },
});
