import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PressStart2P_400Regular,
} from '@expo-google-fonts/press-start-2p';
import { HomeScreen } from './src/screens/HomeScreen';

export default function App(): React.ReactElement | null {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  if (!fontsLoaded) {
    // Hold the splash until fonts are ready; the native splash stays visible.
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <HomeScreen />
    </View>
  );
}
