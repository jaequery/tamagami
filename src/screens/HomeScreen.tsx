import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Animated,
  StyleSheet,
} from 'react-native';
import { usePet } from '../hooks/usePet';
import type { CauseOfDeath } from '../game/types';
import { POOP_OVERFLOW_THRESHOLD } from '../game/constants';
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
  COLOR_CRITICAL,
  COLOR_OVERLAY,
  COLOR_POOP_DARK,
  COLOR_POOP_LIGHT,
  SHELL_DARK,
  SPACE_1,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
  SPACE_12,
  PIXEL,
  BORDER_WIDTH,
  STAT_CRITICAL_THRESHOLD,
} from '../theme';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatAge(seconds: number): string {
  if (seconds < 60)    return `${Math.floor(seconds)}s`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
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
// Theme-token palette — no raw hex
const POOP_PALETTE: Record<number, string> = {
  0: 'transparent',
  1: COLOR_POOP_DARK,
  2: COLOR_POOP_LIGHT,
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
  container: { marginHorizontal: SPACE_1 },  // was: 2 — now from token
  row:       { flexDirection: 'row' },
  cell:      { width: POOP_CELL, height: POOP_CELL },
});

// ─── Loading Splash ──────────────────────────────────────────────────────────
// Shows the egg sprite with its bob animation and a pulsing "HATCHING" label.

function LoadingSplash(): React.ReactElement {
  return (
    <View style={splashStyles.container} accessible accessibilityLabel="Loading, hatching">
      {/* Egg sprite with its natural bob animation (no runtime deps needed) */}
      <PetSprite stage="egg" mood="neutral" />
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

// ─── Critical Attention Indicator ────────────────────────────────────────────
// Blinking "!" pixel indicator shown when any stat is at critical level.

function CriticalIndicator(): React.ReactElement {
  const [blinkAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blinkAnim]);

  return (
    <Animated.View style={[critStyles.badge, { opacity: blinkAnim }]}>
      <PixelText variant="sm" color={LCD_BG}>!</PixelText>
    </Animated.View>
  );
}

const critStyles = StyleSheet.create({
  badge: {
    backgroundColor: COLOR_CRITICAL,
    paddingHorizontal: SPACE_2,
    paddingVertical:   PIXEL,
    marginLeft:        SPACE_4,
  },
});

// ─── Death Overlay ───────────────────────────────────────────────────────────

interface DeathOverlayProps {
  stage:     import('../game/types').LifeStage;
  cause:     CauseOfDeath;
  onRestart: () => void;
}

function DeathOverlay({ stage, cause, onRestart }: DeathOverlayProps): React.ReactElement {
  return (
    <View style={deathStyles.overlay} accessible accessibilityLabel="Your pet has died">
      {/* Ghost sprite is the emotional hero */}
      <View style={deathStyles.ghostContainer}>
        <PetSprite stage={stage} mood="dead" />
      </View>

      <PixelText variant="md" color={LCD_DARK} style={deathStyles.title}>
        R.I.P.
      </PixelText>
      <PixelText variant="sm" color={LCD_SHADE2} style={deathStyles.cause}>
        CAUSE: {causeOfDeathLabel(cause)}
      </PixelText>

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
    backgroundColor:  COLOR_OVERLAY,   // semantic token — no raw rgba hex
    alignItems:       'center',
    justifyContent:   'center',
    zIndex:           10,
    padding:          SPACE_12,
  },
  ghostContainer: {
    marginBottom: SPACE_8,
  },
  title: {
    marginBottom: SPACE_6,
  },
  cause: {
    marginBottom: SPACE_8,
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

  // CLEAN is enabled whenever there are poops or hygiene is degraded
  const canClean           = pet.poops > 0 || pet.stats.hygiene < 100;

  // HEAL requires pet to be sick AND poops must be below overflow threshold
  // (poop overflow sickness clears after CLEAN→HEAL sequence)
  const canHeal            = pet.isSick && pet.poops <= POOP_OVERFLOW_THRESHOLD;

  const sleepLabel         = pet.isSleeping ? 'WAKE' : 'SLEEP';
  // When waking, show a distinct glyph (not the sleep "z")
  const sleepGlyph         = pet.isSleeping ? '!' : 'Z';

  // Critical attention: any stat at or below threshold
  const stats = pet.stats;
  const isCritical =
    stats.hunger    <= STAT_CRITICAL_THRESHOLD ||
    stats.happiness <= STAT_CRITICAL_THRESHOLD ||
    stats.energy    <= STAT_CRITICAL_THRESHOLD ||
    stats.hygiene   <= STAT_CRITICAL_THRESHOLD ||
    stats.health    <= STAT_CRITICAL_THRESHOLD;

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
              {/* ── Top Row: name / stage / age / critical indicator ── */}
              <View style={styles.topRow}>
                <View style={styles.topLeft}>
                  <PixelText
                    variant="sm"
                    color={LCD_DARK}
                    style={styles.petName}
                    numberOfLines={1}
                  >
                    {pet.name.toUpperCase()}
                  </PixelText>
                  {isCritical && !pet.isDead && <CriticalIndicator />}
                </View>
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
                    glyph=">"
                    onPress={handlePlay}
                    disabled={isSleepingOrDead}
                    accessibilityLabel="Play with your pet"
                  />
                </View>
                <View style={styles.buttonRow}>
                  <PixelButton
                    label={sleepLabel}
                    glyph={sleepGlyph}
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
                  stage={pet.stage}
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
  topLeft: {
    flexDirection: 'row',
    alignItems:    'center',
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
