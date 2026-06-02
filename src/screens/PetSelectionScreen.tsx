import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { DeviceFrame } from '../components/DeviceFrame';
import { PetSprite } from '../components/PetSprite';
import { PixelText } from '../components/PixelText';
import { PET_PROFILES, PET_TYPES } from '../game/profiles';
import type { PetProfile } from '../game/profiles';
import type { PetType } from '../game/types';
import {
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  SHELL_DARK,
  SPACE_2,
  SPACE_4,
  SPACE_6,
  SPACE_8,
  BORDER_WIDTH,
} from '../theme';

interface PetSelectionScreenProps {
  onSelect: (petType: PetType) => void;
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

export function PetSelectionScreen({ onSelect }: PetSelectionScreenProps): React.ReactElement {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <DeviceFrame>
          <View style={styles.screenContent}>
            <PixelText variant="sm" color={LCD_DARK} style={styles.heading}>
              PICK YOUR PET
            </PixelText>
            <PixelText variant="tiny" color={LCD_SHADE2} style={styles.subheading}>
              YOU CAN START OVER ANYTIME
            </PixelText>

            <View style={styles.cardList}>
              {PET_TYPES.map((type) => (
                <PetCard key={type} profile={PET_PROFILES[type]} onSelect={onSelect} />
              ))}
            </View>
          </View>
        </DeviceFrame>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SHELL_DARK,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACE_6,
    paddingVertical: SPACE_8,
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
});
