import { getCareerPhase } from '@entities/career-rank';
import type { OfflineEarnings } from '@entities/currency';
import type { Decimal } from '@shared/lib/decimal';
import { MODAL_PRIORITY, useModalQueue } from '@shared/lib/modal-queue';

/** Shorter absences are not worth a screen: the balance just grew a little. */
export const MIN_OFFLINE_REPORT_SECONDS = 60;
export const OFFLINE_REPORT_KIND = 'offline-report';
export const OFFLINE_REPORT_ID = 'offline-report';

/** What the "While you were away" screen shows. Amounts are exactly what was added to the balance. */
export interface OfflineReport {
  /** Time that was paid for (already clamped to the storage cap). */
  seconds: number;
  /** The storage was full: time past the cap earned nothing more. */
  capped: boolean;
  earned: { capital: Decimal; cognitive: Decimal; influence: Decimal };
  /** Career phase (1 study, 2 first jobs, 3 career); picks the joke line. */
  phase: 1 | 2 | 3;
}

export type ReportResource = keyof OfflineReport['earned'];
export const REPORT_RESOURCES: readonly ReportResource[] = ['capital', 'cognitive', 'influence'];

/** Seconds of absence per "item" in the joke line, per phase (docs read, bugs fixed, tickets closed). */
const SECONDS_PER_ITEM = { 1: 300, 2: 240, 3: 180 } as const;

/** Pure: the report for an already applied offline grant. */
export function buildOfflineReport(earnings: OfflineEarnings, rank: number): OfflineReport {
  return {
    seconds: earnings.seconds,
    capped: earnings.capped,
    earned: { capital: earnings.capital, cognitive: earnings.cognitive, influence: earnings.influence },
    phase: getCareerPhase(rank),
  };
}

/** Shown only after a real absence that earned something visible. */
export function shouldShowOfflineReport(report: OfflineReport): boolean {
  if (!Number.isFinite(report.seconds) || report.seconds < MIN_OFFLINE_REPORT_SECONDS) return false;
  return REPORT_RESOURCES.some((resource) => report.earned[resource].gt(0));
}

/** The resources to list: only those that actually earned something, in a stable order. */
export function getReportedResources(report: OfflineReport): ReportResource[] {
  return REPORT_RESOURCES.filter((resource) => report.earned[resource].gt(0));
}

/** Joke line of the report: i18n key and the count placed into it (never below 1). */
export function getReportLine(report: OfflineReport): { key: string; count: number } {
  const count = Math.max(1, Math.floor(report.seconds / SECONDS_PER_ITEM[report.phase]));
  return { key: `welcomeBack.line.phase${report.phase}`, count };
}

/** Whole hours and minutes of the absence, for display. */
export function splitDuration(seconds: number): { hours: number; minutes: number } {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return { hours: Math.floor(safe / 3600), minutes: Math.floor((safe % 3600) / 60) };
}

/**
 * Hands a finished offline grant to the shared modal queue. Returns whether a screen was queued.
 * The grant itself was already applied and saved by the caller; this never touches balances.
 */
export function showOfflineReport(earnings: OfflineEarnings | null, rank: number): boolean {
  if (!earnings) return false;
  const report = buildOfflineReport(earnings, rank);
  if (!shouldShowOfflineReport(report)) return false;
  useModalQueue.getState().enqueue({
    id: OFFLINE_REPORT_ID,
    kind: OFFLINE_REPORT_KIND,
    priority: MODAL_PRIORITY.offlineReport,
    payload: report,
  });
  return true;
}
