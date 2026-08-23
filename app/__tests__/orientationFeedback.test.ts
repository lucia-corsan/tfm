import { AccessibilityInfo, Vibration } from 'react-native';
import * as Speech from 'expo-speech';

import { deliverOrientationFeedback } from '@/features/orientation/orientationFeedback';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
}));

describe('orientation feedback', () => {
  const announce = jest.spyOn(
    AccessibilityInfo,
    'announceForAccessibility',
  );
  const vibrate = jest.spyOn(Vibration, 'vibrate');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses TalkBack without starting a second application voice', async () => {
    await deliverOrientationFeedback({
      message: 'Orientación confirmada.',
      rate: 1,
      screenReaderStatus: 'enabled',
      speechEnabled: true,
    });

    expect(vibrate).toHaveBeenCalledWith(100);
    expect(announce).toHaveBeenCalledWith('Orientación confirmada.');
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  test('uses Spanish TTS at the saved rate when TalkBack is disabled', async () => {
    await deliverOrientationFeedback({
      message: 'Gira hacia la derecha.',
      rate: 1.25,
      screenReaderStatus: 'disabled',
      speechEnabled: true,
    });

    expect(vibrate).toHaveBeenCalledWith(100);
    expect(announce).not.toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith('Gira hacia la derecha.', {
      language: 'es-ES',
      pitch: 1,
      rate: 1.25,
    });
  });

  test('respects a profile that has disabled the application voice', async () => {
    await deliverOrientationFeedback({
      message: 'Resultado visible.',
      rate: 1,
      screenReaderStatus: 'disabled',
      speechEnabled: false,
    });

    expect(vibrate).toHaveBeenCalledWith(100);
    expect(Speech.speak).not.toHaveBeenCalled();
  });
});
