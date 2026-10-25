import { fireEvent, screen } from '@testing-library/react-native';
import { setLocale } from '@shared/i18n';
import en from '@shared/i18n/locales/en.json';
import { renderWithProviders } from '@shared/lib/testing/renderWithProviders';
import { BottomDock } from '../ui/BottomDock';

describe('BottomDock', () => {
  beforeEach(() => setLocale('en'));
  afterAll(() => setLocale('uk'));

  it('exposes five labelled tabs and marks only the active one as selected', async () => {
    await renderWithProviders(<BottomDock activeTab="career" onChangeTab={() => undefined} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    const selected = tabs.filter((tab) => tab.props.accessibilityState.selected === true);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe(en.nav.career);
  });

  it('reports the pressed tab to its parent', async () => {
    const onChangeTab = jest.fn();
    await renderWithProviders(<BottomDock activeTab="work" onChangeTab={onChangeTab} />);

    await fireEvent.press(screen.getByRole('tab', { name: en.nav.leaders }));

    expect(onChangeTab).toHaveBeenCalledTimes(1);
    expect(onChangeTab).toHaveBeenCalledWith('leaders');
  });
});
