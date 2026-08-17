import { AccessibilityInfo, Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

import {
  type ScreenReaderStatus,
  useScreenReaderStatus,
} from '@/features/speech/useScreenReaderStatus';

function StatusHarness() {
  const status = useScreenReaderStatus();
  return <Text>{status}</Text>;
}

describe('useScreenReaderStatus', () => {
  let listener: ((enabled: boolean) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    listener = undefined;
    remove.mockClear();
    jest
      .spyOn(AccessibilityInfo as never, 'addEventListener')
      .mockImplementation((eventName: string, handler: unknown) => {
        if (eventName === 'screenReaderChanged') {
          listener = handler as (enabled: boolean) => void;
        }
        return { remove } as never;
      });
  });

  test.each<[boolean, ScreenReaderStatus]>([
    [false, 'disabled'],
    [true, 'enabled'],
  ])('maps the initial platform value %s to %s', async (enabled, expected) => {
    jest
      .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
      .mockResolvedValue(enabled);
    const screen = await render(<StatusHarness />);

    await waitFor(() => screen.getByText(expected));
  });

  test('reacts to changes and removes the native listener on unmount', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
      .mockResolvedValue(false);
    const screen = await render(<StatusHarness />);
    await waitFor(() => screen.getByText('disabled'));

    await act(async () => listener?.(true));
    screen.getByText('enabled');
    await screen.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
