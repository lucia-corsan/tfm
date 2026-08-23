import { AccessibilityInfo, Vibration } from 'react-native';
import * as Speech from 'expo-speech';

import type { ScreenReaderStatus } from '@/features/speech/useScreenReaderStatus';

interface OrientationFeedbackOptions {
  message: string;
  rate: number;
  screenReaderStatus: ScreenReaderStatus;
  speechEnabled: boolean;
}

/**
 * Comunica el resultado sin superponer la voz de la aplicación a TalkBack.
 *
 * La vibración solo confirma que la comprobación ha terminado; no codifica una
 * dirección y, por tanto, siempre utiliza el mismo pulso breve.
 */
export async function deliverOrientationFeedback({
  message,
  rate,
  screenReaderStatus,
  speechEnabled,
}: OrientationFeedbackOptions): Promise<void> {
  Vibration.vibrate(100);
  if (screenReaderStatus === 'enabled') {
    AccessibilityInfo.announceForAccessibility(message);
    return;
  }
  if (screenReaderStatus !== 'disabled' || !speechEnabled) {
    return;
  }

  try {
    await Speech.stop();
    Speech.speak(message, {
      language: 'es-ES',
      pitch: 1,
      rate,
    });
  } catch {
    // El mensaje visible y la vibración siguen disponibles si falla el TTS.
  }
}
