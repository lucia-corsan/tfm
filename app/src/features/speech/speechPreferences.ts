export type SpeechRateId = 'slow' | 'normal' | 'fast' | 'very_fast';

export interface SpeechPreferences {
  automaticPlayback: boolean;
  rateId: SpeechRateId;
}

export interface SpeechRateOption {
  id: SpeechRateId;
  rate: number;
}

export const SPEECH_RATE_OPTIONS: SpeechRateOption[] = [
  { id: 'slow', rate: 0.8 },
  { id: 'normal', rate: 1 },
  { id: 'fast', rate: 1.25 },
  { id: 'very_fast', rate: 1.5 },
];

export const DEFAULT_SPEECH_PREFERENCES: SpeechPreferences = {
  automaticPlayback: false,
  rateId: 'normal',
};

export function getSpeechRate(rateId: SpeechRateId): number {
  return (
    SPEECH_RATE_OPTIONS.find((option) => option.id === rateId)?.rate ??
    SPEECH_RATE_OPTIONS[1].rate
  );
}
