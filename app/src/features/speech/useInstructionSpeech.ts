import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';

interface InstructionSpeechOptions {
  automaticPlayback: boolean;
  instructionKey: string;
  rate: number;
  screenReaderEnabled: boolean;
  text: string;
}

interface InstructionSpeechController {
  error: boolean;
  isSpeaking: boolean;
  speak: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useInstructionSpeech({
  automaticPlayback,
  instructionKey,
  rate,
  screenReaderEnabled,
  text,
}: InstructionSpeechOptions): InstructionSpeechController {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(false);
  const active = useRef(true);
  const requestId = useRef(0);
  const rateRef = useRef(rate);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const stop = useCallback(async () => {
    requestId.current += 1;
    try {
      await Speech.stop();
    } catch {
      if (active.current) {
        setError(true);
      }
    }
    if (active.current) {
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(async () => {
    if (screenReaderEnabled) {
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    try {
      await Speech.stop();
    } catch {
      if (active.current && requestId.current === currentRequest) {
        setError(true);
        setIsSpeaking(false);
      }
      return;
    }
    if (!active.current || requestId.current !== currentRequest) {
      return;
    }
    setError(false);

    Speech.speak(text, {
      language: 'es-ES',
      pitch: 1,
      rate: rateRef.current,
      onDone: () => {
        if (active.current && requestId.current === currentRequest) {
          setIsSpeaking(false);
        }
      },
      onError: () => {
        if (active.current && requestId.current === currentRequest) {
          setError(true);
          setIsSpeaking(false);
        }
      },
      onStart: () => {
        if (active.current && requestId.current === currentRequest) {
          setIsSpeaking(true);
        }
      },
      onStopped: () => {
        if (active.current && requestId.current === currentRequest) {
          setIsSpeaking(false);
        }
      },
    });
  }, [screenReaderEnabled, text]);

  useEffect(() => {
    if (automaticPlayback && !screenReaderEnabled) {
      void speak();
      return;
    }
    void stop();
  }, [automaticPlayback, instructionKey, screenReaderEnabled, speak, stop]);

  useEffect(
    () => () => {
      active.current = false;
      requestId.current += 1;
      void Speech.stop().catch(() => undefined);
    },
    [],
  );

  return { error, isSpeaking, speak, stop };
}
