import { SETTINGS_VERSION, parseStoredSettings, serializeSettings } from '../model/settingsSnapshot';

describe('settings snapshot', () => {
  it('round-trips v2 values including the tri-state motion choice', () => {
    for (const reducedMotionChoice of [null, true, false]) {
      const values = { hapticsEnabled: false, reducedMotionChoice, notation: 'scientific' as const, locale: 'es' as const };
      const raw = serializeSettings(values);
      expect(JSON.parse(raw).version).toBe(SETTINGS_VERSION);
      expect(JSON.parse(raw)).not.toHaveProperty('soundEnabled');
      expect(parseStoredSettings(raw, 'en')).toEqual(values);
    }
  });

  it('migrates v1: drops soundEnabled, keeps only an explicit reduce-motion "on"', () => {
    const v1 = (reducedMotion: boolean) =>
      JSON.stringify({ soundEnabled: false, hapticsEnabled: false, reducedMotion, notation: 'scientific', locale: 'uk' });

    expect(parseStoredSettings(v1(true), 'en')).toEqual({
      hapticsEnabled: false,
      reducedMotionChoice: true,
      notation: 'scientific',
      locale: 'uk',
    });
    // v1 defaulted to false and saved every field, so false was not a real choice: follow the OS.
    expect(parseStoredSettings(v1(false), 'en')?.reducedMotionChoice).toBeNull();
    expect(parseStoredSettings(v1(false), 'en')).not.toHaveProperty('soundEnabled');
  });

  it('sanitizes invalid fields to safe defaults', () => {
    const raw = JSON.stringify({ version: SETTINGS_VERSION, hapticsEnabled: 'yes', reducedMotionChoice: 1, notation: 'roman', locale: 'xx' });
    expect(parseStoredSettings(raw, 'en')).toEqual({
      hapticsEnabled: true,
      reducedMotionChoice: null,
      notation: 'compact',
      locale: 'en',
    });
  });

  it('returns null for missing, corrupt or unknown data', () => {
    expect(parseStoredSettings(null, 'en')).toBeNull();
    expect(parseStoredSettings('', 'en')).toBeNull();
    expect(parseStoredSettings('{nope', 'en')).toBeNull();
    expect(parseStoredSettings('[1,2]', 'en')).toBeNull();
    expect(parseStoredSettings('42', 'en')).toBeNull();
    expect(parseStoredSettings(JSON.stringify({ version: 99, hapticsEnabled: false }), 'en')).toBeNull();
  });
});
