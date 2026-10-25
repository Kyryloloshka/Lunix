import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { BRAND_FONTS, FONT_LOAD_TIMEOUT_MS } from './brandFonts';

/**
 * Whether the app may render its UI. Fonts never block it for good: a load error or a slow load
 * past the timeout opens the gate and text falls back to the system font.
 */
export function isFontGateOpen(state: { loaded: boolean; error: Error | null; timedOut: boolean }): boolean {
  return state.loaded || state.error !== null || state.timedOut;
}

/** Loads the brand font at app start; returns true once the UI can render. */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts(BRAND_FONTS);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loaded || error) return undefined;
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loaded, error]);

  useEffect(() => {
    if (error && __DEV__) console.warn('[fonts] brand font failed to load, using system font', error);
  }, [error]);

  return isFontGateOpen({ loaded, error, timedOut });
}
