import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@shared/theme';

export type GlyphName =
  | 'terminal'
  | 'git-commit'
  | 'git-branch'
  | 'cpu'
  | 'server'
  | 'database'
  | 'coffee'
  | 'bolt'
  | 'brain'
  | 'flame'
  | 'star'
  | 'lock'
  | 'check'
  | 'code'
  | 'network'
  | 'rank'
  | 'html'
  | 'javascript'
  | 'react'
  | 'docker'
  | 'system-design'
  | 'linkedin'
  | 'daily'
  | 'delegate'
  | 'gear';

interface DevGlyphProps {
  name: GlyphName;
  size?: number;
  color?: string;
}

const glyphSymbols: Record<GlyphName, string> = {
  terminal: '>_',
  'git-commit': '●',
  'git-branch': '⌥',
  cpu: '▣',
  server: '☲',
  database: '▤',
  coffee: '♨',
  bolt: '⚡',
  brain: '◈',
  flame: '▲',
  star: '★',
  lock: '⚿',
  check: '✓',
  code: '</>',
  network: '☊',
  rank: '❖',
  html: 'DIV',
  javascript: 'JS',
  react: '⚛',
  docker: 'YAML',
  'system-design': 'SYS',
  linkedin: 'NET',
  daily: 'SYNC',
  delegate: 'SUB',
  gear: '⚙',
};

export function DevGlyph({ name, size = 14, color = colors.text.primary }: DevGlyphProps) {
  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.symbol,
          {
            fontSize: size,
            color,
          },
        ]}
      >
        {glyphSymbols[name] || '•'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontFamily: typography.mono,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
