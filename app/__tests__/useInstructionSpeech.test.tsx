import { Pressable, Text, View } from 'react-native';
import { act, render, userEvent, waitFor } from '@testing-library/react-native';
import type { SpeechOptions } from 'expo-speech';

import { useInstructionSpeech } from '@/features/speech/useInstructionSpeech';

const mockSpeak = jest.fn();
const mockStop = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-speech', () => ({
  speak: (...args: unknown[]) => mockSpeak(...args),
  stop: () => mockStop(),
}));

interface HarnessProps {
  automaticPlayback?: boolean;
  instructionKey?: string;
  rate?: number;
  screenReaderEnabled?: boolean;
  text?: string;
}

function SpeechHarness({
  automaticPlayback = false,
  instructionKey = 'route:1',
  rate = 1,
  screenReaderEnabled = false,
  text = 'Gira a la derecha y avanza 30 metros.',
}: HarnessProps) {
  const controller = useInstructionSpeech({
    automaticPlayback,
    instructionKey,
    rate,
    screenReaderEnabled,
    text,
  });

  return (
    <View>
      <Text>{text}</Text>
      <Text>{controller.isSpeaking ? 'speaking' : 'silent'}</Text>
      <Text>{controller.error ? 'error' : 'ok'}</Text>
      <Pressable accessibilityRole="button" onPress={() => void controller.speak()}>
        <Text>speak</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void controller.stop()}>
        <Text>stop</Text>
      </Pressable>
    </View>
  );
}

function latestSpeechOptions(): SpeechOptions {
  return mockSpeak.mock.calls.at(-1)?.[1] as SpeechOptions;
}

describe('useInstructionSpeech', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStop.mockResolvedValue(undefined);
  });

  test('uses the Spanish locale and the selected rate after stopping old audio', async () => {
    const screen = await render(<SpeechHarness rate={1.25} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'speak' }));
    await waitFor(() => expect(mockSpeak).toHaveBeenCalledTimes(1));

    expect(mockStop.mock.invocationCallOrder[0]).toBeLessThan(
      mockSpeak.mock.invocationCallOrder[0],
    );
    expect(mockSpeak).toHaveBeenCalledWith(
      'Gira a la derecha y avanza 30 metros.',
      expect.objectContaining({ language: 'es-ES', pitch: 1, rate: 1.25 }),
    );
  });

  test('never speaks with the app voice while a screen reader is enabled', async () => {
    const screen = await render(
      <SpeechHarness automaticPlayback screenReaderEnabled />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'speak' }));
    await waitFor(() => expect(mockStop).toHaveBeenCalled());
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  test('speaks automatically only after an explicit preference enables it', async () => {
    const screen = await render(<SpeechHarness automaticPlayback={false} />);
    await waitFor(() => expect(mockStop).toHaveBeenCalled());
    expect(mockSpeak).not.toHaveBeenCalled();

    await screen.rerender(
      <SpeechHarness automaticPlayback instructionKey="route:2" />,
    );
    await waitFor(() => expect(mockSpeak).toHaveBeenCalledTimes(1));
  });

  test('updates speaking and error states from the native callbacks', async () => {
    const screen = await render(<SpeechHarness />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'speak' }));
    await waitFor(() => expect(mockSpeak).toHaveBeenCalledTimes(1));
    await act(async () => latestSpeechOptions().onStart?.());
    screen.getByText('speaking');

    await act(async () =>
      latestSpeechOptions().onError?.(new Error('TTS unavailable')),
    );
    screen.getByText('silent');
    screen.getByText('error');
  });

  test('keeps the instruction available when the native speech engine fails', async () => {
    const screen = await render(<SpeechHarness />);
    const user = userEvent.setup();
    await waitFor(() => expect(mockStop).toHaveBeenCalled());
    mockStop.mockRejectedValueOnce(new Error('TTS unavailable'));

    await user.press(screen.getByRole('button', { name: 'speak' }));
    await waitFor(() => screen.getByText('error'));
    expect(mockSpeak).not.toHaveBeenCalled();
    screen.getByText('Gira a la derecha y avanza 30 metros.');
  });

  test('stops queued speech when the instruction changes and on unmount', async () => {
    const screen = await render(<SpeechHarness automaticPlayback />);
    await waitFor(() => expect(mockSpeak).toHaveBeenCalled());
    const callsBeforeChange = mockSpeak.mock.calls.length;

    await screen.rerender(
      <SpeechHarness
        automaticPlayback
        instructionKey="route:2"
        text="Continúa recto durante 100 metros."
      />,
    );
    await waitFor(() =>
      expect(mockSpeak.mock.calls.length).toBeGreaterThan(callsBeforeChange),
    );
    expect(mockSpeak.mock.calls.at(-1)?.[0]).toBe(
      'Continúa recto durante 100 metros.',
    );

    const callsBeforeUnmount = mockStop.mock.calls.length;
    await screen.unmount();
    expect(mockStop.mock.calls.length).toBeGreaterThan(callsBeforeUnmount);
  });
});
