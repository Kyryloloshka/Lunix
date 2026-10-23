export type PluralCategory = 'one' | 'few' | 'many' | 'other';

/**
 * Slavic / Ukrainian pluralization rules:
 * - 1, 21, 31, 41... => 'one' (1 клік, 21 рядок)
 * - 2-4, 22-24, 32-34... => 'few' (2 кліки, 24 рядки)
 * - 0, 5-20, 25-30... => 'many' (5 кліків, 20 рядків)
 */
export function getUkrainianPluralCategory(count: number): PluralCategory {
  const abs = Math.abs(Math.floor(count));
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod100 >= 11 && mod100 <= 19) return 'many';
  if (mod10 === 1) return 'one';
  if (mod10 >= 2 && mod10 <= 4) return 'few';
  return 'many';
}

export function getEnglishPluralCategory(count: number): PluralCategory {
  return Math.abs(count) === 1 ? 'one' : 'other';
}
