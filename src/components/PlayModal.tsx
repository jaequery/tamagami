// PlayModal — the "how do you want to play?" menu. PLAY is no longer one action:
// it opens this list of ways to play (pet, feather, laser, yarn, cuddle). Each row
// shows what it gives (happiness) and whether it tires her (hunger cost). Tapping a
// row plays it once and closes — picking a way to play IS the play.

import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PLAYS, type PlayDef } from '../game/play';
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

interface PlayModalProps {
  visible: boolean;
  onPlay: (playId: string) => void;
  onClose: () => void;
}

interface PlayRowProps {
  play: PlayDef;
  onPlay: (playId: string) => void;
}

function PlayRow({ play, onPlay }: PlayRowProps): React.ReactElement {
  const handlePress = (): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPlay(play.id);
  };

  // Active play tires her out; calm play (no hunger cost) reads as a gentle bond.
  const effect = play.hunger > 0 ? `+${play.happiness} FUN · −${play.hunger} HUN` : `+${play.happiness} FUN`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${play.title} — ${play.blurb}`}
      style={styles.row}
    >
      <View style={styles.glyphBox}>
        <PixelText variant="md" color={LCD_BG}>{play.glyph}</PixelText>
      </View>
      <View style={styles.rowMain}>
        <PixelText variant="sm" color={LCD_DARK}>{play.title}</PixelText>
        <PixelText variant="tiny" color={LCD_SHADE2} style={styles.rowSub}>
          {play.blurb}
        </PixelText>
      </View>
      <PixelText variant="tiny" color={LCD_DARK}>{effect}</PixelText>
    </TouchableOpacity>
  );
}

export function PlayModal({ visible, onPlay, onClose }: PlayModalProps): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <PixelText variant="md" color={LCD_DARK}>PLAY</PixelText>
          </View>

          <View style={styles.divider} />

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {PLAYS.map((play) => (
              <PlayRow key={play.id} play={play} onPlay={onPlay} />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <PixelButton label="CLOSE" onPress={onClose} accessibilityLabel="Close play menu" />
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
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      SPACE_4,
  },
});
