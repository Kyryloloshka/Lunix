import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOnboardingStore } from '@features/onboarding';
import { useMotionPreference } from '@shared/lib/motion';
import { MIN_TOUCH_TARGET, TEXT_MAX_FONT_SCALE } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import {
  INTRO_LINE_KEYS,
  TYPING_TICK_MS,
  getIntroTapAction,
  nextVisibleLength,
} from '../model/introScript';

const PROMPT = 'student@laptop:~$';
const CURSOR = '█';

/**
 * First-launch intro (T-018): three terminal screens, text typed out, one tap skips it for good.
 * Shown when the intro was never completed, or when the player replays it from settings. Covers the
 * game below it; the game loop keeps running but a new game has no income to lose.
 * Reduced motion: no per-character typing, every line appears at once.
 */
export function IntroSequence() {
  useLocale();
  const visible = useOnboardingStore((state) => !state.introDone || state.replayingIntro);
  const completeIntro = useOnboardingStore((state) => state.completeIntro);
  const { reducedMotion } = useMotionPreference();
  const [lineIndex, setLineIndex] = useState(0);
  const [shown, setShown] = useState(0);

  const fullText = t(INTRO_LINE_KEYS[lineIndex]);
  const isLineComplete = shown >= fullText.length;

  // A replay starts from the first line again.
  useEffect(() => {
    if (visible) {
      setLineIndex(0);
      setShown(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    if (reducedMotion) {
      setShown(fullText.length);
      return undefined;
    }
    const timer = setInterval(() => {
      setShown((current) => nextVisibleLength(current, fullText.length, false));
    }, TYPING_TICK_MS);
    return () => clearInterval(timer);
  }, [visible, reducedMotion, fullText, lineIndex]);

  const advance = useCallback(() => {
    const action = getIntroTapAction(lineIndex, INTRO_LINE_KEYS.length, isLineComplete);
    if (action === 'reveal') setShown(fullText.length);
    else if (action === 'next') {
      setLineIndex(lineIndex + 1);
      setShown(0);
    } else completeIntro();
  }, [completeIntro, fullText.length, isLineComplete, lineIndex]);

  if (!visible) return null;

  const isLast = lineIndex === INTRO_LINE_KEYS.length - 1;
  const actionLabel = isLineComplete
    ? t(isLast ? 'onboarding.intro.start' : 'onboarding.intro.next')
    : t('onboarding.intro.next');

  return (
    <View style={styles.root} accessibilityViewIsModal accessibilityLabel={t('onboarding.intro.a11yRegion')}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${fullText}. ${actionLabel}`}
        accessibilityHint={t('onboarding.intro.step', { current: lineIndex + 1, total: INTRO_LINE_KEYS.length })}
        onPress={advance}
        style={styles.surface}
        testID="intro-surface"
      >
        <View style={styles.terminal}>
          {INTRO_LINE_KEYS.slice(0, lineIndex).map((key) => (
            <Text key={key} style={styles.doneLine} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
              <Text style={styles.prompt}>{PROMPT} </Text>
              {t(key)}
            </Text>
          ))}
          <Text style={styles.line} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
            <Text style={styles.prompt}>{PROMPT} </Text>
            {fullText.slice(0, shown)}
            {isLineComplete ? '' : CURSOR}
          </Text>
        </View>
        <Text style={styles.continue} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
          {isLineComplete ? `${isLast ? '▶ ' : ''}${actionLabel}` : ' '}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.intro.skipA11y')}
        onPress={completeIntro}
        style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
        testID="intro-skip"
      >
        <Text style={styles.skipText} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
          {t('onboarding.intro.skip')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
    backgroundColor: colors.surface.base,
  },
  surface: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: MIN_TOUCH_TARGET + spacing.lg,
    paddingBottom: spacing.xl,
  },
  terminal: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.inset,
  },
  prompt: {
    color: colors.accent.phosphorDim,
  },
  line: {
    ...typography.roles.title,
    color: colors.accent.phosphorBright,
  },
  doneLine: {
    ...typography.roles.body,
    color: colors.text.muted,
  },
  continue: {
    ...typography.roles.label,
    marginTop: spacing.lg,
    textAlign: 'center',
    color: colors.accent.amberBright,
  },
  skip: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.raised,
  },
  skipPressed: {
    backgroundColor: colors.surface.inset,
  },
  skipText: {
    ...typography.roles.label,
    color: colors.text.secondary,
  },
});
