import { useEffect } from 'react';
import { useCurrencyStore } from '@entities/currency';

export function useGameLoop(tickIntervalMs = 200) {
  const tick = useCurrencyStore((state) => state.tick);

  useEffect(() => {
    let lastTime = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastTime) / 1000;
      lastTime = now;
      tick(deltaSeconds);
    }, tickIntervalMs);

    return () => clearInterval(interval);
  }, [tick, tickIntervalMs]);
}
