import type { FontFamilyDefinition } from 'expo-font';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { JetBrainsMono_800ExtraBold } from '@expo-google-fonts/jetbrains-mono/800ExtraBold';
import { BRAND_MONO_FAMILY } from '@shared/theme';

/**
 * JetBrains Mono (SIL Open Font License 1.1) from the official Expo Google Fonts package, loaded
 * as one family so `fontWeight` selects the face. Only the weights the typography tokens use are
 * imported, so the other faces are not bundled.
 */
export const BRAND_FONTS: FontFamilyDefinition[] = [
  {
    fontFamily: BRAND_MONO_FAMILY,
    fontDefinitions: [
      { path: JetBrainsMono_400Regular, weight: 400 },
      { path: JetBrainsMono_700Bold, weight: 700 },
      { path: JetBrainsMono_800ExtraBold, weight: 800 },
    ],
  },
];

/** Never hold the first frame longer than this for a font; the system font is the fallback. */
export const FONT_LOAD_TIMEOUT_MS = 3000;
