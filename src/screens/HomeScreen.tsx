import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Animated,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import type { CauseOfDeath, Mood, PetActions, PetState } from '../game/types';
import { profileFor } from '../game/profiles';
import type { ActionKey } from '../game/profiles';
import { useNearby } from '../hooks/useNearby';
import { DeviceFrame } from '../components/DeviceFrame';
import { PetSprite } from '../components/PetSprite';
import { StatBar } from '../components/StatBar';
import { PixelButton } from '../components/PixelButton';
import { PixelText } from '../components/PixelText';
import { NearbyMeet } from '../components/NearbyMeet';
import { FriendsModal } from '../components/FriendsModal';
import {
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  COLOR_CRITICAL,
  COLOR_OVERLAY,
  COLOR_WARNING,
  SHELL_DARK,
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
    case 'thirst':     return 'THIRST';
    case 'neglect':    return 'NEGLECT';
    default:           return 'UNKNOWN';
  }
}

// ─── Action button config ────────────────────────────────────────────────────

interface ActionButtonSpec {
  label: string;
  glyph: string;
  accessibilityLabel: string;
  run: (actions: PetActions) => void;
}

const ACTION_SPECS: Record<ActionKey, ActionButtonSpec> = {
  feed:  { label: 'FEED',  glyph: '*', accessibilityLabel: 'Feed your pet',   run: (a) => a.feed() },
  play:  { label: 'PLAY',  glyph: '>', accessibilityLabel: 'Play with your pet', run: (a) => a.play() },
  water: { label: 'WATER', glyph: '~', accessibilityLabel: 'Water your plant', run: (a) => a.water() },
};

// ─── Critical Attention Indicator ────────────────────────────────────────────

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
  petType:   import('../game/types').PetType;
  cause:     CauseOfDeath;
  onRestart: () => void;
}

function DeathOverlay({ petType, cause, onRestart }: DeathOverlayProps): React.ReactElement {
  return (
    <View style={deathStyles.overlay} accessible accessibilityLabel="Your pet has died">
      <View style={deathStyles.ghostContainer}>
        <PetSprite petType={petType} mood="dead" />
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
          accessibilityLabel="Start over with a new pet"
        />
      </View>
    </View>
  );
}

const deathStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor:  COLOR_OVERLAY,
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

// ─── Social Bar ──────────────────────────────────────────────────────────────
// Thin status line for the nearby feature: live peer presence on the left, a
// tappable FRIENDS counter on the right.

interface SocialBarProps {
  nearbyName: string | null;
  btProblem: boolean;
  friendCount: number;
  onOpenFriends: () => void;
}

function SocialBar({ nearbyName, btProblem, friendCount, onOpenFriends }: SocialBarProps): React.ReactElement {
  return (
    <View style={styles.socialBar}>
      <View style={styles.socialLeft}>
        {nearbyName !== null ? (
          <>
            <View style={styles.presenceDot} />
            <PixelText variant="tiny" color={LCD_DARK} numberOfLines={1}>
              NEAR: {nearbyName.toUpperCase()}
            </PixelText>
          </>
        ) : btProblem ? (
          <PixelText variant="tiny" color={COLOR_WARNING}>BLUETOOTH OFF</PixelText>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={onOpenFriends}
        hitSlop={{ top: SPACE_4, bottom: SPACE_4, left: SPACE_4, right: SPACE_4 }}
        accessibilityRole="button"
        accessibilityLabel={`Open friends list, ${friendCount} met`}
      >
        <PixelText variant="tiny" color={LCD_SHADE2}>FRIENDS {friendCount}</PixelText>
      </TouchableOpacity>
    </View>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────

interface HomeScreenProps {
  pet: PetState;
  actions: PetActions;
  mood: Mood;
}

export function HomeScreen({ pet, actions, mood }: HomeScreenProps): React.ReactElement {
  const profile = profileFor(pet.petType);

  const handleRestart = useCallback(() => actions.reset(), [actions]);

  // Change pet = wipe the current one and return to the selection screen.
  // Destructive, so gate behind a native confirm.
  const handleChangePet = useCallback(() => {
    Alert.alert(
      'Change pet?',
      `${pet.name.toUpperCase()} will be released. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change pet', style: 'destructive', onPress: () => actions.reset() },
      ],
    );
  }, [actions, pet.name]);

  // ── Nearby (BLE) social loop ──
  const { supported, bluetoothState, nearby, friends, meet, clearMeet } = useNearby(
    pet,
    actions.socialize,
  );
  // friendsOpenedAt doubles as the "open" flag and the reference time for the
  // friends list's relative timestamps (captured in the event handler, so the
  // render path stays pure).
  const [friendsOpenedAt, setFriendsOpenedAt] = useState<number | null>(null);

  const handleCloseFriends = useCallback(() => setFriendsOpenedAt(null), []);
  const handleOpenFriends = useCallback(() => setFriendsOpenedAt(Date.now()), []);

  const btProblem = bluetoothState === 'poweredOff' || bluetoothState === 'unauthorized';

  // Critical attention: any *relevant* stat at or below threshold
  const isCritical = profile.stats.some(
    (s) => pet.stats[s.key] <= STAT_CRITICAL_THRESHOLD,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <DeviceFrame>
          <View style={styles.screenContent}>
            {/* ── Top Row: name / type / age / critical indicator ── */}
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
              <View style={styles.topRight}>
                <PixelText variant="tiny" color={LCD_SHADE2}>
                  {profile.title} {formatAge(pet.ageSeconds)}
                </PixelText>
                {!pet.isDead && (
                  <TouchableOpacity
                    onPress={handleChangePet}
                    hitSlop={{ top: SPACE_4, bottom: SPACE_4, left: SPACE_4, right: SPACE_4 }}
                    accessibilityRole="button"
                    accessibilityLabel="Change pet — release this one and pick a new type"
                    style={styles.changeBtn}
                  >
                    <PixelText variant="tiny" color={LCD_DARK}>[CHANGE]</PixelText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Pet sprite ── */}
            <View style={styles.spriteRow}>
              <View style={styles.spriteContainer}>
                <PetSprite petType={pet.petType} mood={mood} />
              </View>
            </View>

            {/* ── Divider ── */}
            <View style={styles.divider} />

            {/* ── Stat Bars (profile-driven) ── */}
            <View style={styles.statsSection}>
              {profile.stats.map((s) => (
                <StatBar key={s.key} label={s.label} value={pet.stats[s.key]} />
              ))}
            </View>

            {/* ── Action Buttons (profile-driven) ── */}
            <View style={styles.actionGrid}>
              <View style={styles.buttonRow}>
                {profile.actions.map((key) => {
                  const spec = ACTION_SPECS[key];
                  return (
                    <PixelButton
                      key={key}
                      label={spec.label}
                      glyph={spec.glyph}
                      onPress={() => spec.run(actions)}
                      disabled={pet.isDead}
                      accessibilityLabel={spec.accessibilityLabel}
                    />
                  );
                })}
              </View>
            </View>

            {/* ── Social Bar (nearby pets) ── */}
            {supported && !pet.isDead && (
              <SocialBar
                nearbyName={nearby?.friend.name ?? null}
                btProblem={btProblem}
                friendCount={friends.length}
                onOpenFriends={handleOpenFriends}
              />
            )}

            {/* ── Nearby Meet celebration ── */}
            {meet !== null && (
              <NearbyMeet
                key={meet.nonce}
                localType={pet.petType}
                peer={meet.peer}
                onDone={clearMeet}
              />
            )}

            {/* ── Death Overlay ── */}
            {pet.isDead && (
              <DeathOverlay
                petType={pet.petType}
                cause={pet.causeOfDeath}
                onRestart={handleRestart}
              />
            )}
          </View>
        </DeviceFrame>
      </ScrollView>

      <FriendsModal
        visible={friendsOpenedAt !== null}
        now={friendsOpenedAt ?? 0}
        friends={friends}
        onClose={handleCloseFriends}
      />
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
  topRight: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  changeBtn: {
    marginLeft: SPACE_4,
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
  socialBar: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    marginTop:         SPACE_4,
    paddingTop:        SPACE_2,
    borderTopWidth:    BORDER_WIDTH,
    borderTopColor:    LCD_SHADE2,
  },
  socialLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    flexShrink:    1,
  },
  presenceDot: {
    width:           PIXEL * 3,
    height:          PIXEL * 3,
    backgroundColor: LCD_DARK,
    marginRight:     SPACE_2,
  },
});
