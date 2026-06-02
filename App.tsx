import React, { useCallback } from 'react';
import { View, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PressStart2P_400Regular,
} from '@expo-google-fonts/press-start-2p';
import { HomeScreen } from './src/screens/HomeScreen';
import { PetSelectionScreen } from './src/screens/PetSelectionScreen';
import { DeviceFrame } from './src/components/DeviceFrame';
import { PixelText } from './src/components/PixelText';
import { usePet } from './src/hooks/usePet';
import type { PetType } from './src/game/types';
import { LCD_SHADE2, SHELL_DARK, SPACE_6, SPACE_8 } from './src/theme';

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
