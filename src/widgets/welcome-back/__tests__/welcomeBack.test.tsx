import { act, fireEvent, screen } from '@testing-library/react-native';
import { Decimal } from '@shared/lib/decimal';
import { setLocale } from '@shared/i18n';
import en from '@shared/i18n/locales/en.json';
import es from '@shared/i18n/locales/es.json';
import uk from '@shared/i18n/locales/uk.json';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import {
  MIN_OFFLINE_REPORT_SECONDS,
  buildOfflineReport,
  getReportLine,
  getReportedResources,
  shouldShowOfflineReport,
  splitDuration,
} from '../model/offlineReport';
import { WelcomeBackModal } from '../ui/WelcomeBackModal';

const earnings = (over: Partial<{ seconds: number; capped: boolean; capital: number; cognitive: number; influence: number }> = {}) => ({
  seconds: over.seconds ?? 3600,
  capped: over.capped ?? false,
  capital: Decimal.from(over.capital ?? 0),
  cognitive: Decimal.from(over.cognitive ?? 500),
  influence: Decimal.from(over.influence ?? 0),
});

describe('offline report model', () => {
  it('copies the exact earnings and picks the phase from the rank', () => {
    const e = earnings({ capital: 12 });
    const report = buildOfflineReport(e, 4);
    expect(report.earned.capital).toBe(e.capital);
    expect(report.seconds).toBe(3600);
    expect(report.phase).toBe(2);
  });

  it('shows only for 60 s or more with something earned', () => {
    expect(shouldShowOfflineReport(buildOfflineReport(earnings({ seconds: MIN_OFFLINE_REPORT_SECONDS - 1 }), 0))).toBe(false);
    expect(shouldShowOfflineReport(buildOfflineReport(earnings({ seconds: MIN_OFFLINE_REPORT_SECONDS }), 0))).toBe(true);
    expect(shouldShowOfflineReport(buildOfflineReport(earnings({ cognitive: 0 }), 0))).toBe(false);
    expect(shouldShowOfflineReport(buildOfflineReport(earnings({ seconds: Number.NaN }), 0))).toBe(false);
  });

  it('lists only resources that earned something', () => {
    const report = buildOfflineReport(earnings({ cognitive: 5, capital: 0, influence: 3 }), 6);
    expect(getReportedResources(report)).toEqual(['cognitive', 'influence']);
  });

  it('keeps the joke count at 1 or more and grows with time', () => {
    const short = getReportLine(buildOfflineReport(earnings({ seconds: 60 }), 0));
    const long = getReportLine(buildOfflineReport(earnings({ seconds: 8 * 3600 }), 0));
    expect(short.count).toBe(1);
    expect(long.count).toBeGreaterThan(short.count);
    expect(short.key).toBe('welcomeBack.line.phase1');
    expect(getReportLine(buildOfflineReport(earnings(), 8)).key).toBe('welcomeBack.line.phase3');
  });

  it('splits a duration into hours and minutes safely', () => {
    expect(splitDuration(3725)).toEqual({ hours: 1, minutes: 2 });
    expect(splitDuration(-5)).toEqual({ hours: 0, minutes: 0 });
    expect(splitDuration(Number.NaN)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('offline report copy', () => {
  const keys = ['eyebrow', 'title', 'durationHm', 'durationM', 'capped', 'collect', 'collectA11y'] as const;
  it.each(Object.entries({ uk, en, es }))('has every string in %s', (_name, locale) => {
    for (const key of keys) expect(typeof locale.welcomeBack[key]).toBe('string');
    for (const phase of ['phase1', 'phase2', 'phase3'] as const) {
      expect(locale.welcomeBack.line[phase]).toContain('{count}');
    }
  });
});

describe('WelcomeBackModal', () => {
  beforeEach(() => setLocale('en'));
  afterAll(() => setLocale('uk'));

  it('shows the time away, each earned resource, the capped note, and closes on Collect', async () => {
    const onDismiss = jest.fn();
    const report = buildOfflineReport(earnings({ seconds: 8 * 3600, capped: true, capital: 1500, cognitive: 0 }), 4);
    await renderWithProviders(<WelcomeBackModal report={report} onDismiss={onDismiss} />);

    expect(screen.getByText('You were gone for 8h 0m')).toBeOnTheScreen();
    expect(screen.getByTestId('welcome-back-capital')).toBeOnTheScreen();
    expect(screen.queryByTestId('welcome-back-cognitive')).toBeNull();
    expect(screen.getByLabelText(/Capital$/)).toBeOnTheScreen();
    expect(screen.getByText(en.welcomeBack.capped)).toBeOnTheScreen();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: en.welcomeBack.collectA11y }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has no capped note for a normal absence', async () => {
    const report = buildOfflineReport(earnings({ seconds: 600 }), 0);
    await renderWithProviders(<WelcomeBackModal report={report} onDismiss={() => undefined} />);
    expect(screen.queryByText(en.welcomeBack.capped)).toBeNull();
    expect(screen.getByText('You were gone for 10 min')).toBeOnTheScreen();
  });
});
