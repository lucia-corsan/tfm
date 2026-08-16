import { useRef } from 'react';
import type { ComponentRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ES } from '../../i18n/es';

interface RerouteConfirmationDialogProps {
  onConfirm: () => void;
  onKeepCurrentRoute: () => void;
  visible: boolean;
}

export function RerouteConfirmationDialog({
  onConfirm,
  onKeepCurrentRoute,
  visible,
}: RerouteConfirmationDialogProps) {
  const titleRef = useRef<ComponentRef<typeof Text>>(null);

  const focusTitle = () => {
    const node = findNodeHandle(titleRef.current);
    if (node !== null) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onKeepCurrentRoute}
      onShow={focusTitle}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text
            accessible
            accessibilityLanguage="es-ES"
            accessibilityRole="header"
            ref={titleRef}
            style={styles.title}
          >
            {ES.navigation.rerouteDialogTitle}
          </Text>
          <Text
            accessible
            accessibilityLanguage="es-ES"
            style={styles.description}
          >
            {ES.navigation.rerouteDialogDescription}
          </Text>
          <PrimaryButton
            accessibilityHint={ES.navigation.keepRouteHint}
            label={ES.navigation.keepRouteButton}
            onPress={onKeepCurrentRoute}
          />
          <PrimaryButton
            accessibilityHint={ES.navigation.confirmRerouteHint}
            label={ES.navigation.confirmRerouteButton}
            onPress={onConfirm}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  description: {
    color: '#343B50',
    fontSize: 17,
    lineHeight: 25,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderColor: '#7A5BD1',
    borderRadius: 20,
    borderWidth: 2,
    gap: 16,
    maxWidth: 540,
    padding: 24,
    width: '100%',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(23, 33, 58, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#17213A',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 31,
  },
});
