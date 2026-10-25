import { CAREER_RANKS } from '@entities/career-rank';
import { EDITOR_SNIPPETS, getEditorMode, getEditorSnippet, type EditorMode } from '../model/editorSnippets';

// Parody guard for snippet text (mirrors the locale guard in application/__tests__/parodyContent.test.ts)
const FORBIDDEN = /(?<![\p{L}\p{N}])(React|Kubernetes|Docker|TypeScript|Node\.js|GitHub|Google|Microsoft|Apple|Amazon|LinkedIn|Tailwind|Vercel|OpenAI)(?![\p{L}\p{N}])/iu;

const MODES: EditorMode[] = ['study', 'work', 'network'];

describe('editor snippets (T-009)', () => {
  it('maps each tap resource to its editor look', () => {
    expect(getEditorMode('cognitive')).toBe('study');
    expect(getEditorMode('capital')).toBe('work');
    expect(getEditorMode('influence')).toBe('network');
  });

  it('has a non-empty snippet with a unique id for every mode and phase', () => {
    const ids = MODES.flatMap((mode) => ([1, 2, 3] as const).map((phase) => EDITOR_SNIPPETS[mode][phase]));
    expect(ids.every((snippet) => snippet.lines.length >= 4 && snippet.fileName.length > 0)).toBe(true);
    expect(new Set(ids.map((snippet) => snippet.id)).size).toBe(ids.length);
  });

  it('picks the snippet by the rank phase: HTML for the trainee, YAML for leads', () => {
    expect(getEditorSnippet('work', 0).language).toBe('HTML');
    expect(getEditorSnippet('work', 3).id).toBe('work-2');
    const lead = CAREER_RANKS.find((rank) => rank.phase === 3)!;
    expect(getEditorSnippet('work', lead.id).language).toBe('YAML');
    expect(getEditorSnippet('study', 0).id).toBe('study-1');
    expect(getEditorSnippet('network', CAREER_RANKS.length - 1).id).toBe('network-3');
  });

  it('clamps invalid ranks to a valid snippet', () => {
    expect(getEditorSnippet('work', -5).id).toBe('work-1');
    expect(getEditorSnippet('work', 999).id).toBe('work-3');
    expect(getEditorSnippet('study', Number.NaN).lines.length).toBeGreaterThan(0);
  });

  it('keeps snippets parody-only and short enough for one editor line', () => {
    const texts = MODES.flatMap((mode) => Object.values(EDITOR_SNIPPETS[mode]).flatMap((snippet) => [snippet.fileName, ...snippet.lines]));
    expect(texts.filter((text) => FORBIDDEN.test(text))).toEqual([]);
    expect(texts.filter((text) => text.length > 48)).toEqual([]);
  });
});
