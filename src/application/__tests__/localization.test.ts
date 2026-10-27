// @types/node is not installed (Expo project); this test only needs a tiny slice of Node.
declare const require: (module: string) => any;
declare const __dirname: string;
interface DirEntry {
  name: string;
  isDirectory(): boolean;
}
const fs = require('fs');
const path = require('path');

import { NPC_LEADERS } from '@widgets/simulated-leaderboard';
import en from '@shared/i18n/locales/en.json';
import uk from '@shared/i18n/locales/uk.json';
import es from '@shared/i18n/locales/es.json';

/**
 * T-005: no player-facing text outside i18n, and every key the code asks for exists in all locales.
 * Both checks are static scans of the sources, so a new hardcoded label or a typo in a key fails here
 * before a player sees "skills.items.foo.name" on screen.
 */
type Tree = { [key: string]: unknown };

const SRC = path.resolve(__dirname, '../..');
const UI_ROOTS = ['widgets', 'pages', 'application'].map((dir) => path.join(SRC, dir));

function sourceFiles(dir: string, pattern: RegExp): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: DirEntry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full, pattern);
    return pattern.test(entry.name) ? [full] : [];
  });
}

function lookup(tree: Tree, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (
    node && typeof node === 'object' ? (node as Tree)[part] : undefined
  ), tree);
}

/** Drops block and line comments so documentation prose is not mistaken for UI text. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const LETTERS = /[A-Za-zА-Яа-яІіЇїЄє]{2,}/;

/** Strings that are technical on purpose and therefore stay outside i18n. */
const TECHNICAL = new Set(['UTF-8 LF']);

describe('no hardcoded player-facing text in UI code', () => {
  const files = UI_ROOTS.flatMap((dir) => sourceFiles(dir, /\.tsx$/));

  it('scans a non-trivial set of files', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it('has no literal text inside JSX', () => {
    const offenders = files.flatMap((file) => {
      const source = stripComments(fs.readFileSync(file, 'utf8'));
      const found: string[] = [];
      // `>text<` between tags; generics (`Array<string>`) never sit directly after `>` with letters.
      for (const match of source.matchAll(/>\s*([^<>{}=;()\n][^<>{}\n]*)\s*<\//g)) {
        const text = match[1].trim();
        if (LETTERS.test(text) && !TECHNICAL.has(text)) found.push(text);
      }
      return found.map((text) => `${path.relative(SRC, file)}: ${text}`);
    });
    expect(offenders).toEqual([]);
  });

  it('has no literal text in label-like props or option objects', () => {
    const labelProp = /\b(?:label|title|subtitle|placeholder|accessibilityLabel|accessibilityHint|onText|offText|eyebrow|description)\s*[=:]\s*(?:"([^"]*)"|'([^']*)')/g;
    const offenders = files.flatMap((file) => {
      const source = stripComments(fs.readFileSync(file, 'utf8'));
      const found: string[] = [];
      for (const match of source.matchAll(labelProp)) {
        const text = match[1] ?? match[2] ?? '';
        if (LETTERS.test(text) && !TECHNICAL.has(text)) found.push(text);
      }
      return found.map((text) => `${path.relative(SRC, file)}: ${text}`);
    });
    expect(offenders).toEqual([]);
  });
});

describe('every translation key used by the code exists in every locale', () => {
  const files = ['widgets', 'pages', 'application', 'features', 'entities', 'shared']
    .flatMap((dir) => sourceFiles(path.join(SRC, dir), /\.tsx?$/));

  it('resolves each literal t(...) / labelKey key in uk, en and es', () => {
    const missing: string[] = [];
    files.forEach((file) => {
      const source = stripComments(fs.readFileSync(file, 'utf8'));
      const keys = [
        ...[...source.matchAll(/\bt\(\s*'([\w.-]+)'/g)].map((match) => match[1]),
        ...[...source.matchAll(/\b(?:\w*Key)\s*:\s*'([a-z][\w.-]*\.[\w.-]+)'/g)].map((match) => match[1]),
      ];
      keys.forEach((key) => {
        [['uk', uk], ['en', en], ['es', es]].forEach(([locale, tree]) => {
          if (typeof lookup(tree as Tree, key) !== 'string') missing.push(`${locale}:${key} (${path.relative(SRC, file)})`);
        });
      });
    });
    expect(missing).toEqual([]);
  });

  it('has a name and a role for every simulated leaderboard entry', () => {
    NPC_LEADERS.forEach((leader) => {
      [en, uk, es].forEach((locale) => {
        expect(typeof lookup(locale as Tree, `leaderboard.entries.${leader.id}.name`)).toBe('string');
        expect(typeof lookup(locale as Tree, `leaderboard.entries.${leader.id}.role`)).toBe('string');
      });
    });
  });
});
