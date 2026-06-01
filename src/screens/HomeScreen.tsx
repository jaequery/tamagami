import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { usePet } from '../hooks/usePet';
import type { CauseOfDeath } from '../game/types';
import { DeviceFrame } from '../components/DeviceFrame';
import { PetSprite } from '../components/PetSprite';
import { StatBar } from '../components/StatBar';
import { PixelButton } from '../components/PixelButton';
import { PixelText } from '../components/PixelText';
import {
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  COLOR_WARNING,
  SHELL_DARK,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
  SPACE_12,
  PIXEL,
  BORDER_WIDTH,
} from '../theme';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatAge(seconds: number): string {
  if (seconds < 60)        return `${seconds}s`;
  if (seconds < 3600)      return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)     return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function causeOfDeathLabel(cause: CauseOfDeath): string {
  switch (cause) {
    case 'starvation': return 'STARVATION';
    case 'sickness':   return 'SICKNESS';
    case 'neglect':    return 'NEGLECT';
    default:           return 'UNKNOWN';
  }
}

// ─── Poop Glyph ─────────────────────────────────────────────────────────────
// A tiny 5×5 pixel-art swirl poop rendered as a grid.

const POOP_MATRIX = [
  [0,1,1,0,0],
  [1,2,2,1,0],
  [0,1,2,2,1],
  [0,1,2,1,0],
  [0,0,1,0,0],
];
const POOP_PALETTE: Record<number, string> = {
  0: 'transparent',
  1: '#3B2A1A',
  2: '#7B5C3A',
};
const POOP_CELL = 4;

function PoopGlyph(): React.ReactElement {
  return (
    <View style={poopStyles.container} accessible accessibilityLabel="poop">
      {POOP_MATRIX.map((row, ri) => (
        <View key={ri} style={poopStyles.row}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={[
                poopStyles.cell,
                {
                  backgroundColor:
                    POOP_PALETTE[cell] === 'transparent'
                      ? LCD_BG
                      : POOP_PALETTE[cell],
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const poopStyles = StyleSheet.create({
  container: { marginHorizontal: 2 },
  row:       { flexDirection: 'row' },
  cell:      { width: POOP_CELL, height: POOP_CELL },
});

// ─── Loading Splash ──────────────────────────────────────────────────────────

function LoadingSplash(): React.ReactElement {
  return (
    <View style={splashStyles.container} accessible accessibilityLabel="Loading">
      <PixelText variant="lg" color={LCD_DARK}>
        . . .
      </PixelText>
      <PixelText variant="sm" color={LCD_SHADE2} style={splashStyles.sub}>
        HATCHING
      </PixelText>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    minHeight:       180,
  },
  sub: {
    marginTop: SPACE_8,
  },
});

// ─── Death Overlay ───────────────────────────────────────────────────────────

interface DeathOverlayProps {
  cause:   CauseOfDeath;
  onRestart: () => void;
}

function DeathOverlay({ cause, onRestart }: DeathOverlayProps): React.ReactElement {
  return (
    <View style={deathStyles.overlay} accessible accessibilityLabel="Your pet has died">
      <PixelText variant="md" color={LCD_DARK} style={deathStyles.title}>
        R.I.P.
      </PixelText>
      <PixelText variant="sm" color={LCD_SHADE2} style={deathStyles.cause}>
        CAUSE: {causeOfDeathLabel(cause)}
      </PixelText>

      {/* Ghost tombstone indicator */}
      <View style={deathStyles.tombstone}>
        <PixelText variant="md" color={LCD_SHADE2}>RIP</PixelText>
      </View>

      <View style={deathStyles.buttonRow}>
        <PixelButton
          label="NEW PET"
          onPress={onRestart}
          accessibilityLabel="Start a new pet"
        />
      </View>
    </View>
  );
}

const deathStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor:  'rgba(15,56,15,0.88)',
    alignItems:       'center',
    justifyContent:   'center',
    zIndex:           10,
    padding:          SPACE_12,
  },
  title: {
    marginBottom: SPACE_6,
  },
  cause: {
    marginBottom: SPACE_8,
  },
  tombstone: {
    borderWidth:     BORDER_WIDTH,
    borderColor:     LCD_DARK,
    paddingVertical: SPACE_4,
    paddingHorizontal: SPACE_8,
    marginBottom:    SPACE_12,
    backgroundColor: LCD_BG,
  },
  buttonRow: {
    flexDirection: 'row',
  },
});

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export function HomeScreen(): React.ReactElement {
  const { pet, actions, loading, mood } = usePet();

  const handleFeed         = useCallback(() => actions.feed(),         [actions]);
  const handlePlay         = useCallback(() => actions.play(),         [actions]);
  const handleToggleSleep  = useCallback(() => actions.toggleSleep(),  [actions]);
  const handleClean        = useCallback(() => actions.clean(),        [actions]);
  const handleHeal         = useCallback(() => actions.heal(),         [actions]);
  const handleRestart      = useCallback(() => actions.restart(),      [actions]);

  const isSleepingOrDead   = pet.isSleeping || pet.isDead;
  const canClean           = pet.poops > 0 || pet.stats.hygiene < 100;
  const canHeal            = pet.isSick;
  const sleepLabel         = pet.isSleeping ? 'WAKE' : 'SLEEP';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <DeviceFrame>
          {loading ? (
            <LoadingSplash />
          ) : (
            <View style={styles.screenContent}>
              {/* ── Top Row: name / stage / age ── */}
              <View style={styles.topRow}>
                <PixelText
                  variant="sm"
                  color={LCD_DARK}
                  style={styles.petName}
                  numberOfLines={1}
                >
                  {pet.name.toUpperCase()}
                </PixelText>
                <PixelText variant="tiny" color={LCD_SHADE2}>
                  {pet.stage.toUpperCase()} {formatAge(pet.ageSeconds)}
                </PixelText>
              </View>

              {/* ── Pet sprite + poops ── */}
              <View style={styles.spriteRow}>
                <View style={styles.spriteContainer}>
                  <PetSprite stage={pet.stage} mood={mood} />
                </View>

                {/* Poop indicators */}
                {pet.poops > 0 && (
                  <View style={styles.poopRow} accessibilityLabel={`${pet.poops} poop${pet.poops !== 1 ? 's' : ''}`}>
                    {Array.from({ length: Math.min(pet.poops, 5) }).map((_, i) => (
                      <PoopGlyph key={i} />
                    ))}
                  </View>
                )}
              </View>

              {/* ── Divider ── */}
              <View style={styles.divider} />

              {/* ── Stat Bars ── */}
              <View style={styles.statsSection}>
                <StatBar label="HUNGER"    value={pet.stats.hunger}    />
                <StatBar label="HAPPY"     value={pet.stats.happiness} />
                <StatBar label="ENERGY"    value={pet.stats.energy}    />
                <StatBar label="HYGIENE"   value={pet.stats.hygiene}   />
                <StatBar label="HEALTH"    value={pet.stats.health}    />
              </View>

              {/* ── Action Buttons ── */}
              <View style={styles.actionGrid}>
                <View style={styles.buttonRow}>
                  <PixelButton
                    label="FEED"
                    glyph="*"
                    onPress={handleFeed}
                    disabled={isSleepingOrDead}
                    accessibilityLabel="Feed your pet"
                  />
                  <PixelButton
                    label="PLAY"
                    glyph="+"
                    onPress={handlePlay}
                    disabled={isSleepingOrDead}
                    accessibilityLabel="Play with your pet"
                  />
                </View>
                <View style={styles.buttonRow}>
                  <PixelButton
                    label={sleepLabel}
                    glyph="z"
                    onPress={handleToggleSleep}
                    disabled={pet.isDead}
                    accessibilityLabel={pet.isSleeping ? 'Wake your pet' : 'Put your pet to sleep'}
                  />
                  <PixelButton
                    label="CLEAN"
                    glyph="~"
                    onPress={handleClean}
                    disabled={pet.isDead || !canClean}
                    accessibilityLabel="Clean your pet"
                  />
                  <PixelButton
                    label="HEAL"
                    glyph="+"
                    onPress={handleHeal}
                    disabled={pet.isDead || !canHeal}
                    accessibilityLabel="Heal your pet"
                  />
                </View>
              </View>

              {/* ── Death Overlay ── */}
              {pet.isDead && (
                <DeathOverlay
                  cause={pet.causeOfDeath}
                  onRestart={handleRestart}
                />
              )}
            </View>
          )}
        </DeviceFrame>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex:            1,
    backgroundColor: SHELL_DARK,
  },
  scrollContent: {
    flexGrow:          1,
    paddingHorizontal: SPACE_6,
    paddingVertical:   SPACE_8,
  },
  screenContent: {
    position: 'relative',
  },
  topRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    marginBottom:    SPACE_4,
    paddingBottom:   SPACE_2,
    borderBottomWidth: BORDER_WIDTH,
    borderBottomColor: LCD_SHADE2,
  },
  petName: {
    maxWidth: 120,
  },
  spriteRow: {
    alignItems:      'center',
    justifyContent:  'center',
    marginVertical:  SPACE_8,
  },
  spriteContainer: {
    alignItems: 'center',
  },
  poopRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    justifyContent: 'center',
    marginTop:     SPACE_4,
    gap:           PIXEL,
  },
  divider: {
    height:          BORDER_WIDTH,
    backgroundColor: LCD_SHADE2,
    marginVertical:  SPACE_4,
    opacity:         0.5,
  },
  statsSection: {
    marginBottom: SPACE_4,
  },
  actionGrid: {
    marginTop: SPACE_4,
  },
  buttonRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    flexWrap:       'wrap',
    marginBottom:   SPACE_2,
  },
  warningText: {
    color: COLOR_WARNING,
  },
});
