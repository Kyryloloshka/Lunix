import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { GameScreen } from '@pages/game-screen';
import { useSettingsStore } from '@features/settings';
import { MotionPreferenceProvider } from '@shared/lib/motion';
import { colors } from '@shared/theme';
import { resetProgress } from './persistence/gamePersistence';
import { useGamePersistence } from './persistence/useGamePersistence';

export default function App() {
  const loadSettings = useSettingsStore((state) => state.load);
  const reducedMotionChoice = useSettingsStore((state) => state.reducedMotionChoice);
  const isGameLoaded = useGamePersistence();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <MotionPreferenceProvider reducedMotion={reducedMotionChoice}>
          <StatusBar style="light" />
          {isGameLoaded ? <GameScreen onResetProgress={resetProgress} /> : <View style={{ flex: 1, backgroundColor: colors.bg.app }} />}
        </MotionPreferenceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
