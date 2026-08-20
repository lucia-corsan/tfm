import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  /** Atkinson Hyperlegible Next se distribuye con la aplicación, sin red. */
  const [fontsLoaded, fontError] = useFonts({
    'AtkinsonHyperlegibleNext-Bold': require('../../assets/fonts/AtkinsonHyperlegibleNext-Bold.ttf'),
    'AtkinsonHyperlegibleNext-ExtraBold': require('../../assets/fonts/AtkinsonHyperlegibleNext-ExtraBold.ttf'),
    'AtkinsonHyperlegibleNext-Medium': require('../../assets/fonts/AtkinsonHyperlegibleNext-Medium.ttf'),
    'AtkinsonHyperlegibleNext-Regular': require('../../assets/fonts/AtkinsonHyperlegibleNext-Regular.ttf'),
    'AtkinsonHyperlegibleNext-SemiBold': require('../../assets/fonts/AtkinsonHyperlegibleNext-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.canvas },
          headerShown: false,
        }}
      />
    </>
  );
}
