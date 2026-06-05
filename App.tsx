import React, { useCallback, useEffect, useRef } from 'react';
import { View, SafeAreaView, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import {
  useFonts,
  PressStart2P_400Regular,
} from '@expo-google-fonts/press-start-2p';
import { HomeScreen } from './src/screens/HomeScreen';
import { PetSelectionScreen } from './src/screens/PetSelectionScreen';
import { DeviceFrame } from './src/components/DeviceFrame';
import { PixelText } from './src/components/PixelText';
import { usePet } from './src/hooks/usePet';
import { RARITIES, rarityEpithet } from './src/game/evolution';
import { giftLuckFromRarity, setPendingGiftLuck } from './src/game/gift';
import type { PetType, Rarity } from './src/game/types';
import { LCD_SHADE2, SHELL_DARK, SPACE_6, SPACE_8 } from './src/theme';

/**
 * Handle inbound share links: tamagami://hatch?type=cat&rarity=rare. Records a
 * one-time luck gift for the next hatch and welcomes the new arrival — this is
 * what closes the share → install → reward loop. Tolerant of malformed/foreign
 * links (parse failures and non-hatch links are simply ignored).
 */
function useGiftLink(): void {
  const url = Linking.useURL();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url || handledRef.current === url) return;
    handledRef.current = url;
    try {
      const { hostname, queryParams } = Linking.parse(url);
      if (hostname !== 'hatch') return;
      const rarity = typeof queryParams?.rarity === 'string' ? queryParams.rarity : '';
      if (!(RARITIES as readonly string[]).includes(rarity)) return;
      void setPendingGiftLuck(giftLuckFromRarity(rarity as Rarity));
      Alert.alert(
        '🎁 YOU WERE INVITED',
        `A ${rarityEpithet(rarity as Rarity)} pet blessed your next egg with extra luck. Hatch it to see what you get!`,
      );
    } catch {
      // malformed / foreign link — ignore
    }
  }, [url]);
}

function LoadingSplash(): React.ReactElement {
  return (
    <SafeAreaView style={styles.loadingArea}>
      <View style={styles.loadingContent}>
        <DeviceFrame>
          <View style={styles.loadingInner} accessible accessibilityLabel="Loading">
            <PixelText variant="sm" color={LCD_SHADE2}>LOADING</PixelText>
          </View>
        </DeviceFrame>
      </View>
    </SafeAreaView>
  );
}

function Root(): React.ReactElement {
  const { pet, actions, loading, mood } = usePet();

  const handleSelect = useCallback(
    (petType: PetType) => actions.selectType(petType),
    [actions],
  );

  if (loading) return <LoadingSplash />;
  if (pet === null) return <PetSelectionScreen onSelect={handleSelect} />;
  return <HomeScreen pet={pet} actions={actions} mood={mood} />;
}

export default function App(): React.ReactElement {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });
  useGiftLink();

  // Always render a full-bleed dark shell so the screen never flashes white.
  // Fonts load in <200 ms on device; the dark background bridges that gap.
  return (
    <View style={styles.shell}>
      <StatusBar style="light" />
      {fontsLoaded && <Root />}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: SHELL_DARK,
  },
  loadingArea: {
    flex: 1,
    backgroundColor: SHELL_DARK,
  },
  loadingContent: {
    flexGrow: 1,
    paddingHorizontal: SPACE_6,
    paddingVertical: SPACE_8,
    flex: 1,
  },
  loadingInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
});
