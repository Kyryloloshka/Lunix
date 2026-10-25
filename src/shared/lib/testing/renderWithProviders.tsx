import type { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Test-only: renders with the same root providers the app layer mounts (gestures, safe areas). */
export async function renderWithProviders(ui: ReactElement) {
  return render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>{ui}</SafeAreaProvider>
    </GestureHandlerRootView>,
  );
}
