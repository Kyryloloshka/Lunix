import { getCareerPhase, type CareerPhase } from '@entities/career-rank';
import type { TapResource } from '@entities/currency';
import type { GlyphName } from '@shared/ui';

/**
 * What the Console editor shows while the player taps (T-009). The text is "code", not UI copy, so it is
 * i18n-independent; it is parody content (no real brands, see `.agents/rules/product.md`).
 * Each tap mode has its own look: study = docs/tutorial, work = code, network = chat/post.
 */
export type EditorMode = 'study' | 'work' | 'network';

export interface EditorSnippet {
  /** Stable id; the typing cursor restarts when it changes (rank-up or mode switch). */
  id: string;
  fileName: string;
  /** Short language tag shown in the editor header. */
  language: string;
  glyph: GlyphName;
  lines: readonly string[];
}

const MODE_BY_RESOURCE: Record<TapResource, EditorMode> = {
  cognitive: 'study',
  capital: 'work',
  influence: 'network',
};

/** The editor look for the resource a tap produces right now. */
export function getEditorMode(resource: TapResource): EditorMode {
  return MODE_BY_RESOURCE[resource] ?? 'study';
}

const MODE_GLYPH: Record<EditorMode, GlyphName> = {
  study: 'brain',
  work: 'code',
  network: 'network',
};

type SnippetSource = Omit<EditorSnippet, 'id' | 'glyph'>;

/** Phase 1: Trainee..Junior (HTML), phase 2: Middle..Senior (components, git), phase 3: Lead+ (infra, design docs). */
const SNIPPET_SOURCES: Record<EditorMode, Record<CareerPhase, SnippetSource>> = {
  study: {
    1: {
      fileName: 'lesson-01.md',
      language: 'MD',
      lines: [
        '# Lesson 1: HTML tags',
        '<p> is a paragraph.',
        '<a href="..."> is a link.',
        '<img> needs an alt text.',
        'TODO: why does <div> not center?',
        '> Practice: a page about your cat.',
      ],
    },
    2: {
      fileName: 'notes/git-day-3.md',
      language: 'MD',
      lines: [
        '## Git, day 3',
        'git checkout -b feature/login',
        'git add -p   # review every hunk',
        'git rebase main',
        'NEVER: git push --force on main',
        'Q: what is a detached HEAD?',
      ],
    },
    3: {
      fileName: 'design-review.md',
      language: 'MD',
      lines: [
        '# Design review: feed service',
        'Goal: p99 < 200 ms at 50k rps',
        '- Cache hot feeds (LRU, 5 min TTL)',
        '- Shard by user_id % 64',
        '- Async fan-out via queue',
        'Risk: thundering herd on deploy',
        'Decision: ship behind a flag',
      ],
    },
  },
  work: {
    1: {
      fileName: 'index.html',
      language: 'HTML',
      lines: [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '  <title>My first page</title>',
        '  <link rel="stylesheet" href="style.css">',
        '</head>',
        '<body>',
        '  <h1>Hello, world!</h1>',
        '  <button class="cta">Hire me</button>',
        '</body>',
        '</html>',
      ],
    },
    2: {
      fileName: 'Cart.tsx',
      language: 'TSX',
      lines: [
        "import { useState } from 'reakt';",
        '',
        'export function Cart({ items }: Props) {',
        '  const [open, setOpen] = useState(false);',
        '  const total = sum(items.map((i) => i.price));',
        '  if (!items.length) return <Empty />;',
        '  return (',
        '    <Panel onPress={() => setOpen(!open)}>',
        '      {formatPrice(total)}',
        '    </Panel>',
        '  );',
        '}',
      ],
    },
    3: {
      fileName: 'deploy.yaml',
      language: 'YAML',
      lines: [
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: payments-api',
        'spec:',
        '  replicas: 12',
        '  template:',
        '    spec:',
        '      containers:',
        '        - name: api',
        '          image: dokker.io/payments:v4.2',
        '          resources:',
        '            limits: { cpu: "2", memory: 4Gi }',
      ],
    },
  },
  network: {
    1: {
      fileName: '#intro',
      language: 'CHAT',
      lines: [
        'you: hi all, first week here!',
        'mentor: welcome, ask anything',
        'you: where is the coffee?',
        'mentor: 3rd floor, next to prod',
        'you: thanks :)',
      ],
    },
    2: {
      fileName: '#frontend',
      language: 'CHAT',
      lines: [
        'you: shipped the new cart today',
        'pm: conversion +4%!',
        'lead: nice, write it up?',
        'you: posting a thread now',
        'designer: love the button',
      ],
    },
    3: {
      fileName: 'post.md',
      language: 'POST',
      lines: [
        "I deleted our cache. Here's why.",
        '1/ Most "slow" code is waiting.',
        '2/ Measure before you optimize.',
        '3/ Boring tech wins.',
        'Agree? Repost for reach.',
        '#engineering #leadership',
      ],
    },
  },
};

export const EDITOR_SNIPPETS: Record<EditorMode, Record<CareerPhase, EditorSnippet>> = Object.fromEntries(
  (Object.keys(SNIPPET_SOURCES) as EditorMode[]).map((mode) => [
    mode,
    Object.fromEntries(
      (Object.keys(SNIPPET_SOURCES[mode]) as unknown as CareerPhase[]).map((phase) => [
        phase,
        { ...SNIPPET_SOURCES[mode][phase], id: `${mode}-${phase}`, glyph: MODE_GLYPH[mode] },
      ]),
    ),
  ]),
) as Record<EditorMode, Record<CareerPhase, EditorSnippet>>;

/** Snippet for a tap mode at a career rank (by the rank's phase; invalid ranks are clamped). */
export function getEditorSnippet(mode: EditorMode, rank: number): EditorSnippet {
  const byPhase = EDITOR_SNIPPETS[mode] ?? EDITOR_SNIPPETS.study;
  return byPhase[getCareerPhase(rank)] ?? byPhase[1];
}
