import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { DeviceFrame } from '../components/DeviceFrame';
import { PetSprite } from '../components/PetSprite';
import { PixelText } from '../components/PixelText';
import { PixelButton } from '../components/PixelButton';
import { PET_PROFILES, PET_TYPES, profileFor } from '../game/profiles';
import type { PetProfile } from '../game/profiles';
import type { PetType } from '../game/types';
import {
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  FONT_FAMILY,
  FONT_MD,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
  BORDER_WIDTH,
  BORDER_HEAVY,
} from '../theme';

const NAME_MAX = 12;

interface PetSelectionScreenProps {
  onSelect: (petType: PetType, name: string) => void;
}

interface PetCardProps {
  profile: PetProfile;
  onSelect: (petType: PetType) => void;
}

function PetCard({ profile, onSelect }: PetCardProps): React.ReactElement {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onSelect(profile.type);
  }, [onSelect, profile.type]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`Choose ${profile.title}. ${profile.tagline}`}
      style={styles.card}
    >
      <View style={styles.cardSprite}>
        <PetSprite petType={profile.type} mood="happy" cellSize={5} />
      </View>
      <View style={styles.cardBody}>
        <PixelText variant="md" color={LCD_DARK} style={styles.cardTitle}>
          {profile.title}
        </PixelText>
        <PixelText variant="tiny" color={LCD_SHADE2} style={styles.cardTagline}>
          {profile.tagline}
        </PixelText>
      </View>
    </TouchableOpacity>
  );
}

// ─── Name step ──────────────────────────────────────────────────────────────
// After a type is chosen, the player names the pet before it's hatched.

interface NameStepProps {
  petType: PetType;
  onConfirm: (name: string) => void;
  onBack: () => void;
}

function NameStep({ petType, onConfirm, onBack }: NameStepProps): React.ReactElement {
  const profile = profileFor(petType);
  const [name, setName] = useState('');

  const handleConfirm = useCallback(() => {
    const finalName = name.trim() || profile.title;
    onConfirm(finalName);
  }, [name, profile.title, onConfirm]);

  return (
    <View style={styles.screenContent}>
      <PixelText variant="sm" color={LCD_DARK} style={styles.heading}>
        NAME YOUR {profile.title}
      </PixelText>

      <View style={styles.namePreview}>
        <PetSprite petType={petType} mood="happy" />
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="TYPE A NAME"
        placeholderTextColor={LCD_SHADE2}
        maxLength={NAME_MAX}
        autoFocus
        autoCorrect={false}
        autoCapitalize="characters"
        returnKeyType="done"
        onSubmitEditing={handleConfirm}
        selectionColor={LCD_DARK}
        style={styles.nameInput}
        accessibilityLabel="Pet name"
      />

      <View style={styles.nameButtons}>
        <PixelButton
          label="BACK"
          onPress={onBack}
          accessibilityLabel="Go back and pick a different pet"
        />
        <PixelButton
          label="HATCH"
          glyph=">"
          onPress={handleConfirm}
          accessibilityLabel={`Hatch your ${profile.title}`}
        />
      </View>
    </View>
  );
}

export function PetSelectionScreen({ onSelect }: PetSelectionScreenProps): React.ReactElement {
  // null = picking a type; non-null = naming the chosen type.
  const [chosen, setChosen] = useState<PetType | null>(null);

  const handlePick = useCallback((petType: PetType) => setChosen(petType), []);
  const handleBack = useCallback(() => setChosen(null), []);
  const handleConfirm = useCallback(
    (name: string) => {
      if (chosen !== null) onSelect(chosen, name);
    },
    [chosen, onSelect],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <DeviceFrame>
            {chosen === null ? (
              <View style={styles.screenContent}>
                <PixelText variant="sm" color={LCD_DARK} style={styles.heading}>
                  PICK YOUR PET
                </PixelText>
                <PixelText variant="tiny" color={LCD_SHADE2} style={styles.subheading}>
                  YOU CAN START OVER ANYTIME
                </PixelText>

                <View style={styles.cardList}>
                  {PET_TYPES.map((type) => (
                    <PetCard key={type} profile={PET_PROFILES[type]} onSelect={handlePick} />
                  ))}
                </View>
              </View>
            ) : (
              <NameStep petType={chosen} onConfirm={handleConfirm} onBack={handleBack} />
            )}
          </DeviceFrame>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LCD_BG,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screenContent: {
    position: 'relative',
  },
  heading: {
    textAlign: 'center',
    marginBottom: SPACE_2,
  },
  subheading: {
    textAlign: 'center',
    marginBottom: SPACE_8,
  },
  cardList: {
    gap: SPACE_6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: BORDER_WIDTH,
    borderColor: LCD_DARK,
    backgroundColor: LCD_BG,
    padding: SPACE_4,
  },
  cardSprite: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    marginLeft: SPACE_4,
  },
  cardTitle: {
    marginBottom: SPACE_2,
  },
  cardTagline: {
    lineHeight: 12,
  },
  // ── Name step ──
  namePreview: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACE_8,
  },
  nameInput: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_MD,
    color: LCD_DARK,
    textAlign: 'center',
    borderWidth: BORDER_HEAVY,
    borderColor: LCD_DARK,
    backgroundColor: LCD_BG,
    paddingHorizontal: SPACE_6,
    paddingVertical: SPACE_6,
    marginBottom: SPACE_8,
  },
  nameButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
