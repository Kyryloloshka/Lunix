import { Decimal } from '@shared/lib/decimal';
import type { GlyphName } from '@shared/ui';

export interface NpcLeader {
  /** Also the i18n key under leaderboard.entries.<id>. Fictional characters only, never real people. */
  id: string;
  capital: Decimal;
  icon: GlyphName;
}

/** Simulated, fixed peer list shown with the "simulated" disclaimer. */
export const NPC_LEADERS: NpcLeader[] = [
  { id: 'vibe-ceo', capital: Decimal.from(1e11), icon: 'rank' },
  { id: 'monolith-ceo', capital: Decimal.from(8.5e10), icon: 'server' },
  { id: 'meme-ceo', capital: Decimal.from(7e10), icon: 'bolt' },
  { id: 'alex-arch', capital: Decimal.from(1.5e7), icon: 'system-design' },
  { id: 'dima-lead', capital: Decimal.from(450000), icon: 'git-branch' },
  { id: 'katya-senior', capital: Decimal.from(180000), icon: 'cpu' },
  { id: 'vasya-middle', capital: Decimal.from(65000), icon: 'coffee' },
  { id: 'petya-jun', capital: Decimal.from(12000), icon: 'code' },
  { id: 'olex-trainee', capital: Decimal.from(2000), icon: 'terminal' },
];
