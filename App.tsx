import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PressStart2P_400Regular,
} from '@expo-google-fonts/press-start-2p';
import { HomeScreen } from './src/screens/HomeScreen';
import { SHELL_DARK } from './src/theme';

export default function App(): React.ReactElement {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  // Always render a full-bleed dark shell so the screen never flashes white.
  // Fonts load in <200 ms on device; the dark background bridges that gap.
  return (
    <View style={{ flex: 1, backgroundColor: SHELL_DARK }}>
      <StatusBar style="light" />
      {fontsLoaded && <HomeScreen />}
    </View>
  );
}
