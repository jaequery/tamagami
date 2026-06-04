import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Animated,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import type { CauseOfDeath, LifeStage, Mood, PetActions, PetState } from '../game/types';
import { profileFor } from '../game/profiles';
import type { ActionKey } from '../game/profiles';
import {
  stageFor,
  isHatched,
  secondsUntilHatch,
  formIdFor,
  rarityEpithet,
  STAGE_ORDER,
  TOTAL_FORMS,
  type FormId,
} from '../game/evolution';
import { paletteForRarity, rarityAccent } from '../game/palettes';
import { loadDiscovered, recordDiscovered } from '../game/codex';
import { phaseOfDay, phaseLabel } from '../game/world';
import { activeEventAt, eventById, type GameEvent } from '../game/events';
import { loadWitnessed, recordWitnessed } from '../game/eventCodex';
import { useNearby } from '../hooks/useNearby';
import { DeviceFrame } from '../components/DeviceFrame';
import { PetSprite } from '../components/PetSprite';
import { StatBar } from '../components/StatBar';
import { PixelButton } from '../components/PixelButton';
import { PixelText } from '../components/PixelText';
import { NearbyMeet } from '../components/NearbyMeet';
import { FriendsModal } from '../components/FriendsModal';
import { RevealOverlay } from '../components/RevealOverlay';
import { ShareCard } from '../components/ShareCard';
import { CodexModal } from '../components/CodexModal';
import { EventBanner } from '../components/EventBanner';
import { EventReveal } from '../components/EventReveal';
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
  BORDER_HEAVY,
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

  // ── Evolution: life stage + rarity palette (derived from the pet) ──
  const stage = stageFor(pet.ageSeconds);
  const hatched = isHatched(stage);
  const palette = paletteForRarity(pet.rarity);
  // The egg must NOT betray its rarity — render it in the neutral DMG palette so
  // the color can't leak the surprise. Only a hatched pet wears its true colors.
  const eggPalette = paletteForRarity('common');
  const showRarityFrame = hatched && pet.rarity !== 'common';
  const caption = hatched ? `${rarityEpithet(pet.rarity)} ${stage.toUpperCase()}` : null;
  const hatchIn = stage === 'egg' ? secondsUntilHatch(pet.ageSeconds) : 0;

  // ── Codex (collection) + share/codex modals ──
  const [discovered, setDiscovered] = useState<Set<FormId>>(new Set());
  const [codexOpen, setCodexOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadDiscovered().then((set) => { if (!cancelled) setDiscovered(set); });
    return () => { cancelled = true; };
  }, []);

  // ── Reveal: celebrate when the pet crosses into a higher life stage ──
  const prevStageRef = useRef<LifeStage | null>(null);
  const nonceRef = useRef(0);
  const [reveal, setReveal] = useState<{ stage: LifeStage; isNew: boolean; nonce: number } | null>(null);

  useEffect(() => {
    const prev = prevStageRef.current;
    prevStageRef.current = stage;
    if (!isHatched(stage)) return; // egg: nothing discovered yet

    const advanced = prev !== null && STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(prev);
    const formId = formIdFor(pet.petType, pet.rarity);

    // Keep the codex correct for the current form (covers loading a grown pet)...
    void recordDiscovered(formId).then((wasNew) => {
      setDiscovered((current) => (current.has(formId) ? current : new Set(current).add(formId)));
      // ...but only fire the big reveal when the stage actually advanced live.
      if (advanced) setReveal({ stage, isNew: wasNew, nonce: nonceRef.current++ });
    });
  }, [stage, pet.petType, pet.rarity]);

  const handleOpenShare = useCallback(() => setShareOpen(true), []);
  const handleCloseShare = useCallback(() => setShareOpen(false), []);
  const handleOpenCodex = useCallback(() => setCodexOpen(true), []);
  const handleCloseCodex = useCallback(() => setCodexOpen(false), []);
  const handleRevealDone = useCallback(() => setReveal(null), []);

  // ── Living world: day/night + the event live right now (from the pet's clock) ──
  const clockNow = pet.lastTick; // refreshed every sim tick → a ~1s-fresh wall clock
  const phase = phaseOfDay(clockNow);
  const activeEvent = pet.isDead ? null : activeEventAt(clockNow);
  const petWitnessed = activeEvent !== null && pet.events.includes(activeEvent.id);
  const aura = pet.events
    .map((id) => eventById(id)?.glyph)
    .filter((g): g is string => g !== undefined)
    .join(' ');

  // ── Event codex (lifetime witnessed) + the apparition reveal ──
  const [witnessed, setWitnessed] = useState<Set<string>>(new Set());
  const eventNonceRef = useRef(0);
  const [eventReveal, setEventReveal] = useState<{ event: GameEvent; isNew: boolean; nonce: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadWitnessed().then((set) => { if (!cancelled) setWitnessed(set); });
    return () => { cancelled = true; };
  }, []);

  const handleWitnessEvent = useCallback(() => {
    if (activeEvent === null) return;
    const ev = activeEvent;
    actions.witnessEvent(ev.id);
    void recordWitnessed(ev.id).then((wasNew) => {
      setWitnessed((current) => (current.has(ev.id) ? current : new Set(current).add(ev.id)));
      setEventReveal({ event: ev, isNew: wasNew, nonce: eventNonceRef.current++ });
    });
  }, [activeEvent, actions]);

  const handleEventRevealDone = useCallback(() => setEventReveal(null), []);

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

            {/* ── Pet sprite + stage caption ── */}
            <View style={styles.spriteRow}>
              <View
                style={[
                  styles.spriteContainer,
                  showRarityFrame && {
                    backgroundColor: palette.bg,
                    borderColor: rarityAccent(pet.rarity),
                    borderWidth: BORDER_HEAVY,
                    padding: SPACE_4,
                  },
                ]}
              >
                <PetSprite
                  petType={pet.petType}
                  mood={mood}
                  stage={stage}
                  palette={stage === 'egg' ? eggPalette : palette}
                  background={showRarityFrame ? palette.bg : LCD_BG}
                />
              </View>

              {stage === 'egg' ? (
                <View style={styles.caption}>
                  <PixelText variant="tiny" color={LCD_SHADE2}>INCUBATING</PixelText>
                  <PixelText variant="tiny" color={LCD_DARK} style={styles.captionSub}>
                    HATCHES IN {hatchIn}s
                  </PixelText>
                </View>
              ) : (
                caption !== null && (
                  <View style={styles.caption}>
                    <PixelText variant="tiny" color={LCD_SHADE2}>{caption}</PixelText>
                    {aura.length > 0 && (
                      <PixelText variant="tiny" color={LCD_DARK} style={styles.captionSub}>
                        ✦ {aura}
                      </PixelText>
                    )}
                  </View>
                )
              )}
            </View>

            {/* ── Living world: the live event, or a whisper of the time of day ── */}
            {activeEvent !== null ? (
              <EventBanner event={activeEvent} witnessed={petWitnessed} onWitness={handleWitnessEvent} />
            ) : (
              !pet.isDead && (
                <PixelText variant="tiny" color={LCD_SHADE2} style={styles.phaseLine}>
                  · {phaseLabel(phase)} ·
                </PixelText>
              )
            )}

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

            {/* ── Share / Codex controls ── */}
            <View style={styles.metaBar}>
              <TouchableOpacity
                onPress={handleOpenShare}
                hitSlop={{ top: SPACE_4, bottom: SPACE_4, left: SPACE_4, right: SPACE_4 }}
                accessibilityRole="button"
                accessibilityLabel="Share your pet as a cartridge card"
              >
                <PixelText variant="tiny" color={LCD_DARK}>[SHARE]</PixelText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenCodex}
                hitSlop={{ top: SPACE_4, bottom: SPACE_4, left: SPACE_4, right: SPACE_4 }}
                accessibilityRole="button"
                accessibilityLabel={`Open codex, ${discovered.size} of ${TOTAL_FORMS} forms found`}
              >
                <PixelText variant="tiny" color={LCD_DARK}>CODEX {discovered.size}/{TOTAL_FORMS}</PixelText>
              </TouchableOpacity>
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

      <ShareCard visible={shareOpen} pet={pet} onClose={handleCloseShare} />
      <CodexModal
        visible={codexOpen}
        discovered={discovered}
        witnessedEvents={witnessed}
        onClose={handleCloseCodex}
      />

      {reveal !== null && (
        <RevealOverlay
          key={reveal.nonce}
          petType={pet.petType}
          rarity={pet.rarity}
          stage={reveal.stage}
          isNewForm={reveal.isNew}
          onDone={handleRevealDone}
        />
      )}

      {eventReveal !== null && (
        <EventReveal
          key={eventReveal.nonce}
          event={eventReveal.event}
          isNew={eventReveal.isNew}
          onDone={handleEventRevealDone}
        />
      )}
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
  caption: {
    alignItems:    'center',
    marginTop:     SPACE_4,
  },
  captionSub: {
    marginTop: SPACE_2,
  },
  phaseLine: {
    textAlign: 'center',
    marginTop:  SPACE_4,
    opacity:    0.7,
  },
  metaBar: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginTop:      SPACE_4,
    paddingTop:     SPACE_2,
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
