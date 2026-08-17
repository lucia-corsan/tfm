import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export type ScreenReaderStatus = 'checking' | 'disabled' | 'enabled';

export function useScreenReaderStatus(): ScreenReaderStatus {
  const [status, setStatus] = useState<ScreenReaderStatus>('checking');

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        if (active) {
          setStatus(enabled ? 'enabled' : 'disabled');
        }
      },
    );

    void AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (active) {
          setStatus(enabled ? 'enabled' : 'disabled');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('checking');
        }
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return status;
}
