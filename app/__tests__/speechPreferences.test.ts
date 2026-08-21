import {
  DEFAULT_SPEECH_PREFERENCES,
  getSpeechRate,
  SPEECH_RATE_OPTIONS,
} from '@/features/speech/speechPreferences';

describe('speech preferences', () => {
  test('start with a normal rate and no automatic audio', () => {
    expect(DEFAULT_SPEECH_PREFERENCES).toEqual({
      automaticPlayback: false,
      enabled: true,
      rateId: 'normal',
    });
  });

  test('offer ordered, bounded and distinct rates', () => {
    expect(SPEECH_RATE_OPTIONS.map((option) => option.rate)).toEqual([
      0.8, 1, 1.25, 1.5,
    ]);
    expect(new Set(SPEECH_RATE_OPTIONS.map((option) => option.id)).size).toBe(
      SPEECH_RATE_OPTIONS.length,
    );
  });

  test('resolve every supported identifier and fall back safely', () => {
    expect(getSpeechRate('slow')).toBe(0.8);
    expect(getSpeechRate('normal')).toBe(1);
    expect(getSpeechRate('fast')).toBe(1.25);
    expect(getSpeechRate('very_fast')).toBe(1.5);
    expect(getSpeechRate('unsupported' as never)).toBe(1);
  });
});
