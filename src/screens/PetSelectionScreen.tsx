import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { DeviceFrame } from '../components/DeviceFrame';
import { PetSprite } from '../components/PetSprite';
import { PixelText } from '../components/PixelText';
import { PixelButton } from '../components/PixelButton';
import type { PetType } from '../game/types';
import {
  LCD_BG,
  LCD_DARK,
  LCD_SHADE2,
  FONT_FAMILY,
  FONT_MD,
  SPACE_2,
  SPACE_8,
  BORDER_HEAVY,
} from '../theme';

const NAME_MAX = 12;

interface PetSelectionScreenProps {
  onSelect: (petType: PetType, name: string) => void;
}

/**
 * Cat-only onboarding (GAME.md): there is no species to pick — the one real choice
 * is her name. We name her, then her life begins (the cold open plays once on the
 * home screen). Egg/rarity/origin stay a surprise until the birth.
 */
export function PetSelectionScreen({ onSelect }: PetSelectionScreenProps): React.ReactElement {
  const [name, setName] = useState('');

  const handleConfirm = useCallback(() => {
    onSelect('cat', name.trim() || 'Pixel');
  }, [name, onSelect]);

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
            <View style={styles.screenContent}>
              <PixelText variant="sm" color={LCD_DARK} style={styles.heading}>
                NAME YOUR CAT
              </PixelText>
              <PixelText variant="tiny" color={LCD_SHADE2} style={styles.subheading}>
                THE SMALL ONES BECOME SOMEONE THE MOMENT THEY&apos;RE NAMED
              </PixelText>

              <View style={styles.preview}>
                <PetSprite petType="cat" mood="happy" />
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
                accessibilityLabel="Cat name"
              />

              <View style={styles.buttons}>
                <PixelButton
                  label="BEGIN"
                  glyph=">"
                  onPress={handleConfirm}
                  accessibilityLabel="Name your cat and begin"
                />
              </View>
            </View>
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
  preview: {
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
    paddingHorizontal: SPACE_8,
    paddingVertical: SPACE_8,
    marginBottom: SPACE_8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
