import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { TapResource } from '@entities/currency';
import { useMotionPreference, timingConfig } from '@shared/lib/motion';
import { DevGlyph } from '@shared/ui';
import { colors, durations, radii, resources, spacing, springs, typography, type RankTheme } from '@shared/theme';
import { t } from '@shared/i18n';
import { getEditorMode, getEditorSnippet } from '../model/editorSnippets';
import { INITIAL_CURSOR, getCharsPerTap, getVisibleLines, advanceCursor, pickKeyIndex, type TypingCursor } from '../model/typing';

// Adaptive editor: full width on phones (minus gutters), capped so it doesn't look stretched on tablets/web
const EDITOR_MAX_WIDTH = 420;
// The editor grows to fill the tab's free height, but not into a giant empty slab on tall screens
const EDITOR_MAX_HEIGHT = 380;
/** Lines kept on screen; the code area clips from the top on short screens. */
const VISIBLE_LINES = 6;
const KEY_COUNT = 15;
const WIDE_KEY_INDEX = 12;
const PRESSED_SCALE = 0.98;
/** Crit shake: small horizontal steps, one `instant`-ish beat each. */
const SHAKE_STEPS = [-4, 4, -3, 2, 0];
const SHAKE_STEP_MS = Math.round(durations.fast / 4);
const CODE_LINE_HEIGHT = 22;
/** The flash tints the frame without hiding the code under it. */
const CRIT_FLASH_PEAK_OPACITY = 0.6;

/** What the editor needs to know about one tap; mirrors the model's tap result. */
export interface EditorTapFeedback {
  isCritical: boolean;
  /** Flow/crit output multiplier the model applied (1 = none). */
  multiplier: number;
}

export interface CodeEditorHandle {
  onTap: (feedback: EditorTapFeedback) => void;
}

export interface CodeEditorProps {
  rank: number;
  tapResource: TapResource;
  rankTheme: RankTheme;
  flowActive: boolean;
  flowMultiplier: number;
  pressed: boolean;
  tapHint: string;
  ref?: Ref<CodeEditorHandle>;
}

interface TypingState {
  snippetId: string;
  cursor: TypingCursor;
}

/**
 * The editor in the middle of the Console tap zone (T-009): taps type the snippet for the current tap mode
 * and career phase, a key lights up, crits shake and flash, Flow turns the frame amber. All motion runs on
 * the UI thread (Reanimated shared values); React only re-renders when text changes (once per tap).
 * Purely visual: it never handles touches (the parent's tap zone does).
 */
export const CodeEditor = memo(function CodeEditor({
  rank,
  tapResource,
  rankTheme,
  flowActive,
  flowMultiplier,
  pressed,
  tapHint,
  ref,
}: CodeEditorProps) {
  const { reducedMotion } = useMotionPreference();
  const snippet = useMemo(() => getEditorSnippet(getEditorMode(tapResource), rank), [rank, tapResource]);
  const [typing, setTyping] = useState<TypingState>({ snippetId: snippet.id, cursor: INITIAL_CURSOR });
  // A new snippet (rank-up, mode switch) starts on an empty editor
  const cursor = typing.snippetId === snippet.id ? typing.cursor : INITIAL_CURSOR;
  const visibleLines = getVisibleLines(snippet.lines, cursor, VISIBLE_LINES);

  const modeColor = resources[tapResource].color;
  const flowColor = resources.flow.color;

  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const critFlash = useSharedValue(0);
  const litKey = useSharedValue(-1);
  const keyGlow = useSharedValue(0);
  const cursorOpacity = useSharedValue(1);
  const lastKey = useRef(-1);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(pressed ? PRESSED_SCALE : 1, springs.press);
  }, [pressed, reducedMotion, scale]);

  const startBlink = useCallback((delayMs: number) => {
    if (reducedMotion) {
      cancelAnimation(cursorOpacity);
      cursorOpacity.value = 1;
      return;
    }
    const half = durations.slow + durations.fast;
    cursorOpacity.value = withDelay(
      delayMs,
      withRepeat(withSequence(withTiming(0, { duration: half }), withTiming(1, { duration: half })), -1),
    );
  }, [cursorOpacity, reducedMotion]);

  useEffect(() => {
    startBlink(0);
    return () => cancelAnimation(cursorOpacity);
  }, [cursorOpacity, startBlink]);

  const onTap = useCallback((feedback: EditorTapFeedback) => {
    const chars = getCharsPerTap(feedback.multiplier);
    setTyping((previous) => {
      const from = previous.snippetId === snippet.id ? previous.cursor : INITIAL_CURSOR;
      return { snippetId: snippet.id, cursor: advanceCursor(snippet.lines, from, chars) };
    });

    // Key light is a color change, so it stays (shortened) under reduced motion
    const key = pickKeyIndex(Math.random(), KEY_COUNT, lastKey.current);
    lastKey.current = key;
    litKey.value = key;
    keyGlow.value = 1;
    keyGlow.value = withTiming(0, timingConfig('base', reducedMotion, { kind: 'fade', easing: 'decelerate' }));

    // Typing keeps the cursor solid; it resumes blinking once the player pauses
    cancelAnimation(cursorOpacity);
    cursorOpacity.value = 1;
    startBlink(durations.slow);

    if (feedback.isCritical) {
      critFlash.value = 1;
      critFlash.value = withTiming(0, timingConfig('slow', reducedMotion, { kind: 'fade', easing: 'decelerate' }));
      if (!reducedMotion) {
        shakeX.value = withSequence(...SHAKE_STEPS.map((offset) => withTiming(offset, { duration: SHAKE_STEP_MS })));
      }
    }
  }, [critFlash, cursorOpacity, keyGlow, litKey, reducedMotion, shakeX, snippet, startBlink]);

  useImperativeHandle(ref, () => ({ onTap }), [onTap]);

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: critFlash.value * CRIT_FLASH_PEAK_OPACITY }));
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }));

  const keyLitColor = flowActive ? flowColor : modeColor;
  const statusColor = flowActive ? flowColor : colors.accent.phosphor;

  return (
    <>
      <View pointerEvents="none" style={styles.statusRow}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]} testID="workspace-editor-status">
            {flowActive ? t('status.zone', { multiplier: flowMultiplier }) : t('status.prod')}
          </Text>
        </View>
        <Text style={styles.sessionText}>{t('app.session')}</Text>
      </View>

      <View pointerEvents="none" style={styles.editorWrap}>
        <View style={styles.touchSurface}>
          <Animated.View
            style={[
              styles.laptopButton,
              { borderColor: rankTheme.border, backgroundColor: rankTheme.surfaceTint },
              flowActive && [styles.laptopButtonFlow, { borderColor: flowColor, shadowColor: flowColor }],
              frameStyle,
            ]}
          >
            <View style={styles.editorHeader}>
              <View style={styles.fileTab}>
                <DevGlyph name={snippet.glyph} size={13} color={modeColor} />
                <Text style={styles.fileName} numberOfLines={1}>{snippet.fileName}</Text>
              </View>
              <Text style={styles.fileMeta}>{`${snippet.language}  UTF-8`}</Text>
            </View>

            <View style={styles.codeArea}>
              {visibleLines.map((line) => (
                <View key={line.number} style={styles.codeRow}>
                  <Text style={styles.lineNumber}>{String(line.number).padStart(2, '0')}</Text>
                  {line.isCurrent ? (
                    <View style={styles.currentLine}>
                      <Text style={[styles.codeText, styles.currentLineText, { color: modeColor }]} numberOfLines={1}>
                        {line.text}
                      </Text>
                      <Animated.View style={[styles.cursor, { backgroundColor: modeColor }, cursorStyle]} />
                    </View>
                  ) : (
                    <Text style={[styles.codeText, styles.codeLine, { color: modeColor }]} numberOfLines={1}>{line.text}</Text>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.editorFooter}>
              <View style={styles.branchRow}>
                <DevGlyph name="git-branch" size={14} color={colors.accent.amber} />
                <Text style={styles.branchText}>{t('app.branch')}</Text>
              </View>
              <Text style={styles.commitText}>{`Ln ${cursor.line + 1}, Col ${cursor.column + 1}`}</Text>
            </View>

            <View style={styles.keyboard}>
              {Array.from({ length: KEY_COUNT }, (_, index) => (
                <KeyCap key={index} index={index} litKey={litKey} glow={keyGlow} litColor={keyLitColor} />
              ))}
            </View>

            <Text style={styles.tapPrompt}>{t('workspace.prompt')}</Text>
            <Text style={styles.tapSub}>{tapHint}</Text>

            {/* Crit flash: a color fade over the frame, kept (short) under reduced motion */}
            <Animated.View style={[styles.critFlash, flashStyle]} />
          </Animated.View>
        </View>
      </View>
    </>
  );
});

const KEY_COLOR = colors.border.active;

const KeyCap = memo(function KeyCap({
  index,
  litKey,
  glow,
  litColor,
}: {
  index: number;
  litKey: SharedValue<number>;
  glow: SharedValue<number>;
  litColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: litKey.value === index ? interpolateColor(glow.value, [0, 1], [KEY_COLOR, litColor]) : KEY_COLOR,
  }));
  return <Animated.View style={[styles.key, index === WIDE_KEY_INDEX && styles.keyWide, animatedStyle]} />;
});

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', width: '100%', maxWidth: EDITOR_MAX_WIDTH, paddingHorizontal: spacing.xs, justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: radii.full },
  statusText: { fontFamily: typography.mono, fontSize: typography.sizes.xs, fontWeight: '900', letterSpacing: 1 },
  sessionText: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xs, fontWeight: '700', letterSpacing: 0.7 },
  // Shrinks on short screens: the Console tab has no scroll, so the editor must fit between HUD and dock
  editorWrap: { marginTop: spacing.md, width: '100%', maxWidth: EDITOR_MAX_WIDTH, flexGrow: 1, flexShrink: 1, minHeight: 0, maxHeight: EDITOR_MAX_HEIGHT },
  touchSurface: { position: 'relative', width: '100%', flexGrow: 1 },
  laptopButton: {
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.active,
    borderRadius: radii.lg,
    flexGrow: 1,
    padding: spacing.md,
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 7,
  },
  // Flow: accent frame and a soft glow (static, no pulsing)
  laptopButtonFlow: { borderWidth: 2, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 0 }, shadowRadius: 18 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, paddingBottom: spacing.sm },
  fileTab: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  fileName: { color: colors.text.secondary, fontFamily: typography.mono, fontSize: typography.sizes.xs, flexShrink: 1 },
  fileMeta: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xs },
  codeArea: {
    backgroundColor: colors.surface.inset,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 104,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    // New lines appear at the bottom; older ones scroll out of the top on short screens
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  codeRow: { flexDirection: 'row', gap: spacing.sm, height: CODE_LINE_HEIGHT, alignItems: 'center' },
  lineNumber: { width: 24, textAlign: 'right', color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xs, lineHeight: CODE_LINE_HEIGHT },
  codeText: { fontFamily: typography.mono, fontSize: typography.sizes.xs, lineHeight: CODE_LINE_HEIGHT },
  codeLine: { flex: 1, minWidth: 0 },
  currentLine: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  // Content-sized (no flex-basis 0, which collapses to zero width on web), shrinks before the cursor
  currentLineText: { flexShrink: 1, minWidth: 0 },
  cursor: { width: 7, height: 14, marginLeft: 1, borderRadius: 1 },
  editorFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface.inset, paddingHorizontal: spacing.xs, paddingBottom: spacing.sm },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchText: { color: colors.accent.amber, fontFamily: typography.mono, fontSize: typography.sizes.xs },
  commitText: { color: colors.text.muted, fontFamily: typography.mono, fontSize: typography.sizes.xs },
  keyboard: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  key: { width: 17, height: 8, borderRadius: 2, backgroundColor: KEY_COLOR },
  keyWide: { width: 48 },
  tapPrompt: { color: colors.text.primary, fontFamily: typography.mono, fontWeight: '900', fontSize: typography.sizes.sm, letterSpacing: 1.2, marginTop: spacing.md },
  tapSub: { color: colors.text.secondary, fontSize: typography.sizes.xs, marginTop: 4 },
  critFlash: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.accent.amberBright,
    backgroundColor: colors.accent.amberBg,
  },
});
