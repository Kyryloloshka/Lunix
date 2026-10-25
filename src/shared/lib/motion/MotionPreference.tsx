import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { isReducedMotion } from '../../theme/motion';

export interface MotionPreference {
  /** The player's explicit choice if any, otherwise the OS setting. Use this one. */
  reducedMotion: boolean;
  /** `null` until the player picks a value in settings. */
  gameReducedMotion: boolean | null;
  osReducedMotion: boolean;
}

const DEFAULT_PREFERENCE: MotionPreference = {
  reducedMotion: false,
  gameReducedMotion: null,
  osReducedMotion: false,
};

const MotionPreferenceContext = createContext<MotionPreference>(DEFAULT_PREFERENCE);

/** Subscribes to the OS "reduce motion" accessibility setting. Unsupported platforms report false. */
function useOsReducedMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let applyInitialRead = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (applyInitialRead) setEnabled(value === true);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      // A live change wins over the initial async read, even if that read resolves later.
      applyInitialRead = false;
      setEnabled(value === true);
    });
    return () => {
      applyInitialRead = false;
      subscription?.remove();
    };
  }, []);

  return enabled;
}

interface MotionPreferenceProviderProps {
  /**
   * The player's in-game "Reduce motion" choice (`null` = follow the OS). It lives in
   * `features/settings`, which `shared` must not import, so the app layer reads it and passes it here.
   */
  reducedMotion: boolean | null;
  children: ReactNode;
}

/** Mount once near the app root. Holds the single OS accessibility subscription. */
export function MotionPreferenceProvider({ reducedMotion, children }: MotionPreferenceProviderProps) {
  const osReducedMotion = useOsReducedMotion();
  const value = useMemo<MotionPreference>(
    () => ({
      reducedMotion: isReducedMotion(reducedMotion, osReducedMotion),
      gameReducedMotion: reducedMotion,
      osReducedMotion,
    }),
    [reducedMotion, osReducedMotion],
  );
  return <MotionPreferenceContext.Provider value={value}>{children}</MotionPreferenceContext.Provider>;
}

/**
 * Current motion preference: the player's explicit choice, otherwise the OS setting. Without a provider above it,
 * motion is enabled (reducedMotion false).
 */
export function useMotionPreference(): MotionPreference {
  return useContext(MotionPreferenceContext);
}
