import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { GameScreen } from '@pages/game-screen';
import { useSettingsStore } from '@features/settings';
import { colors } from '@shared/theme';
import { useGamePersistence } from './persistence/useGamePersistence';

export default function App() {
  const loadSettings = useSettingsStore((state) => state.load);
  const isGameLoaded = useGamePersistence();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {isGameLoaded ? <GameScreen /> : <View style={{ flex: 1, backgroundColor: colors.bg.app }} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
