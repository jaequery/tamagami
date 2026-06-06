// ShareCard — the shareable "cartridge". The single viral object: a Game Boy
// game-cart label wrapping the pet's sprite in its rarity palette, its name,
// form, rarity and age. Screenshot-native and unmistakably TAMAGAMI.
//
// Today it shares TEXT + a deep link via the OS share sheet. To share it as an
// IMAGE, wrap `cardRef` with react-native-view-shot's captureRef and hand the
// PNG to expo-sharing — the card already renders as a self-contained view, so
// that's a drop-in upgrade (one native rebuild) with no layout changes here.

import React, { useCallback, useRef } from 'react';
import { Modal, View, Share, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import type { CauseOfDeath, PetState } from '../game/types';
import { paletteForRarity, rarityAccent } from '../game/palettes';
import { formName, rarityEpithet, rarityLabel, stageFor } from '../game/evolution';
import { eventById } from '../game/events';
import { isOriginId, originById } from '../game/origins';
import { householdFromId } from '../game/household';
import { lifeSummaryCaption } from '../game/lifeSummary';
import { epitaphFor } from '../game/lineage';
import { PetSprite } from './PetSprite';
import { PixelText } from './PixelText';
import { PixelButton } from './PixelButton';
import {
  COLOR_OVERLAY,
  COLOR_WARNING,
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  SCREEN_INSET,
  BORDER_WIDTH,
  BORDER_HEAVY,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
} from '../theme';

const CARTRIDGE_BODY = '#9A9C8C'; // grey game-cart plastic
const CARTRIDGE_EDGE = '#6E7062'; // darker ridge / recessed edge

interface ShareCardProps {
  visible: boolean;
  pet: PetState;
  onClose: () => void;
}

function causeLabel(cause: CauseOfDeath): string {
  switch (cause) {
    case 'starvation': return 'STARVATION';
    case 'neglect':    return 'NEGLECT';
    case 'oldAge':     return 'OLD AGE';
    case 'illness':    return 'ILLNESS';
    default:           return 'UNKNOWN';
  }
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function ShareCard({ visible, pet, onClose }: ShareCardProps): React.ReactElement {
  const cardRef = useRef<View>(null);
  const palette = paletteForRarity(pet.rarity);
  const stage = stageFor(pet.ageSeconds);
  const name = pet.name.toUpperCase();
  const form = formName(pet.petType, pet.rarity);
  const ageLabel = formatAge(pet.ageSeconds);
  const auraEvents = pet.events
    .map((id) => eventById(id))
    .filter((e): e is NonNullable<ReturnType<typeof eventById>> => e !== null);

  const epitaph = epitaphFor(pet.name, pet.bornAt);

  // The §1–2 life story, for the sealed Origin-Card caption (GAME.md §10).
  const origin = isOriginId(pet.origin) ? originById(pet.origin) : null;
  const household = householdFromId(pet.household);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    const deepLink = `tamagami://hatch?type=${pet.petType}&rarity=${pet.rarity}`;
    const touched = auraEvents.length > 0
      ? ` Touched by: ${auraEvents.map((e) => e.name).join(', ')}.`
      : '';

    // Living pet → the Origin Card: lead with the WONDER (rarity epithet + her
    // origin's drama) and where she landed, but WITHHOLD the form — the receiver
    // has to install to see what she becomes (GAME.md §10: "seal, don't spoil").
    // Falls back to the plain form line only if the life story is somehow absent.
    const owner = pet.ownerName.trim() || household?.person || '';
    const sentTo = owner ? `, and sent to ${owner}` : '';
    const sealedOrigin = origin
      ? `Something ${rarityEpithet(pet.rarity)} was ${origin.tone}${sentTo}. Meet ${name}.${touched}\n`
        + `Hatch your own mystery pet: ${deepLink}`
      : `${name} the ${form} — ${ageLabel} old and thriving on TAMAGAMI (gen ${pet.generation}).${touched}\n`
        + `Hatch your own mystery pet: ${deepLink}`;

    // Dead pet → the Life-Summary card (§9/§10): her whole story, told now
    // *because* it's over — origin, person, who she became, what she witnessed,
    // and the bond, named. A punchline and a tear.
    const message = pet.isDead
      ? `${lifeSummaryCaption(pet)}${touched}\n`
        + `Raise your own on TAMAGAMI: ${deepLink}`
      : sealedOrigin;

    // Capture the cartridge as a PNG and share image + caption together. iOS's
    // share sheet attaches the file (`url`) AND the text (with the install link).
    // If capture isn't available (Expo Go / web / native module missing), fall
    // back to a text-only share so the button never dead-ends.
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      await Share.share({ url: fileUri, message });
      return;
    } catch {
      // fall through to text-only
    }
    Share.share({ message }).catch(() => undefined);
  }, [pet, name, form, ageLabel, auraEvents, origin, household]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View ref={cardRef} style={styles.cartridge} collapsable={false}>
          {/* notch ridges along the top edge */}
          <View style={styles.ridgeRow}>
            <View style={styles.ridge} />
            <View style={styles.ridge} />
            <View style={styles.ridge} />
          </View>

          {/* the "screen" label — sprite in its rarity palette */}
          <View style={[styles.screen, { backgroundColor: palette.bg }]}>
            <PetSprite
              petType={pet.petType}
              mood={pet.isDead ? 'dead' : 'happy'}
              stage={stage}
              palette={palette}
              background={palette.bg}
              cellSize={8}
            />
          </View>

          {pet.isDead && (
            <PixelText variant="md" color={COLOR_WARNING} style={styles.rip}>R.I.P.</PixelText>
          )}

          <PixelText variant="lg" color={LCD_DARK} numberOfLines={1} style={styles.name}>
            {name}
          </PixelText>

          <View style={styles.metaRow}>
            <PixelText variant="sm" color={LCD_DARK} numberOfLines={1} style={styles.form}>
              {form}
            </PixelText>
            <View style={[styles.rarityTag, { backgroundColor: rarityAccent(pet.rarity) }]}>
              <PixelText variant="tiny" color={palette.bg}>{rarityLabel(pet.rarity)}</PixelText>
            </View>
          </View>

          <PixelText variant="tiny" color={LCD_SHADE2} style={styles.age}>
            AGE {ageLabel} · {stage.toUpperCase()} · G{pet.generation}
          </PixelText>

          {pet.isDead && (
            <View style={styles.epitaphBlock}>
              <PixelText variant="tiny" color={COLOR_WARNING}>CAUSE: {causeLabel(pet.causeOfDeath)}</PixelText>
              <PixelText variant="tiny" color={LCD_SHADE2} style={styles.epitaph}>&quot;{epitaph}&quot;</PixelText>
            </View>
          )}

          {auraEvents.length > 0 && (
            <View style={styles.auraRow}>
              {auraEvents.map((ev) => (
                <View key={ev.id} style={styles.auraChip}>
                  <PixelText variant="tiny" color={LCD_BG}>✦ {ev.short}</PixelText>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <PixelText variant="sm" color={LCD_DARK} style={styles.wordmark}>
            TAMAGAMI
          </PixelText>
          <PixelText variant="tiny" color={LCD_SHADE2} style={styles.tagline}>
            HATCH · CARE · COLLECT
          </PixelText>
        </View>

        <View style={styles.footer}>
          <PixelButton label="SHARE" glyph=">" onPress={handleShare} accessibilityLabel="Share your pet cartridge" />
          <PixelButton label="CLOSE" onPress={onClose} accessibilityLabel="Close share card" />
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
  cartridge: {
    width: '100%',
    maxWidth: 260,
    backgroundColor: CARTRIDGE_BODY,
    borderWidth: BORDER_HEAVY,
    borderColor: LCD_DARK,
    padding: SPACE_6,
    alignItems: 'center',
  },
  ridgeRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    marginBottom: SPACE_4,
  },
  ridge: {
    width: SPACE_8,
    height: SPACE_2,
    backgroundColor: CARTRIDGE_EDGE,
    marginLeft: SPACE_2,
  },
  screen: {
    padding: SPACE_4,
    borderWidth: BORDER_HEAVY,
    borderColor: SCREEN_INSET,
    marginBottom: SPACE_6,
  },
  rip: {
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: SPACE_2,
  },
  name: {
    textAlign: 'center',
    marginBottom: SPACE_4,
  },
  epitaphBlock: {
    alignItems: 'center',
    marginBottom: SPACE_4,
  },
  epitaph: {
    marginTop: SPACE_2,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACE_2,
  },
  form: {
    marginRight: SPACE_4,
  },
  rarityTag: {
    paddingHorizontal: SPACE_4,
    paddingVertical: SPACE_2,
    borderWidth: BORDER_WIDTH,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  age: {
    marginBottom: SPACE_4,
  },
  auraRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    justifyContent: 'center',
    marginBottom:  SPACE_2,
  },
  auraChip: {
    backgroundColor:   LCD_DARK,
    paddingHorizontal: SPACE_4,
    paddingVertical:   SPACE_2,
    margin:            SPACE_2,
  },
  divider: {
    alignSelf: 'stretch',
    height: BORDER_WIDTH,
    backgroundColor: CARTRIDGE_EDGE,
    marginVertical: SPACE_4,
  },
  wordmark: {
    letterSpacing: 1,
  },
  tagline: {
    marginTop: SPACE_2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACE_8,
  },
});
