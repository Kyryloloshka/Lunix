import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useCurrencyStore } from '@entities/currency';

/**
 * Drives live income while the app is in the foreground. The loop stops in background;
 * time spent away is granted once through offline progress, not by a giant first tick.
 */
export function useGameLoop(tickIntervalMs = 200) {
  const tick = useCurrencyStore((state) => state.tick);

  useEffect(() => {
    let lastTime = Date.now();
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval !== null) return;
      lastTime = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = (now - lastTime) / 1000;
        lastTime = now;
        tick(deltaSeconds);
      }, tickIntervalMs);
    };

    const stop = () => {
      if (interval === null) return;
      clearInterval(interval);
      interval = null;
    };

    if (AppState.currentState !== 'background') start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [tick, tickIntervalMs]);
}
