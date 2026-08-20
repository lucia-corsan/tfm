import { useEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccessibleText } from '@/components/AccessibleText';
import { Icon } from '@/components/icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radii, spacing, typography } from '@/theme';
import { ES } from '../../i18n/es';

interface RerouteNoticeScreenProps {
  onConfirm: () => void;
  onKeepCurrentRoute: () => void;
  routeName: string;
}

/**
 * Aviso a pantalla completa de una posible desviación.
 *
 * Ocupa toda la pantalla en lugar de superponerse a la navegación para que el
 * recorrido con TalkBack no arrastre el contenido anterior. La decisión es
 * explícita: la posición solo se envía al servidor si se confirma el recálculo,
 * de modo que ninguna de las dos opciones queda preseleccionada.
 */
export function RerouteNoticeScreen({
  onConfirm,
  onKeepCurrentRoute,
  routeName,
}: RerouteNoticeScreenProps) {
  const titleRef = useRef<ComponentRef<typeof Text>>(null);

  useEffect(() => {
    const node = findNodeHandle(titleRef.current);
    if (node !== null) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityViewIsModal style={styles.content}>
        <View style={styles.notice}>
          <Icon color={colors.cautionOnSoft} name="warning" size={32} />
          <Text
            accessible
            accessibilityLanguage="es-ES"
            accessibilityLiveRegion="assertive"
            accessibilityRole="header"
            ref={titleRef}
            style={styles.title}
          >
            {ES.navigation.rerouteDialogTitle}
          </Text>
          <AccessibleText style={styles.description}>
            {ES.navigation.rerouteDialogDescription}
          </AccessibleText>
        </View>

        <AccessibleText style={styles.routeName} variant="meta">
          {ES.navigation.routeLabel(routeName)}
        </AccessibleText>

        <View style={styles.actions}>
          <PrimaryButton
            accessibilityHint={ES.navigation.confirmRerouteHint}
            icon="arrowsClockwise"
            label={ES.navigation.confirmRerouteButton}
            onPress={onConfirm}
          />
          <PrimaryButton
            accessibilityHint={ES.navigation.keepRouteHint}
            icon="path"
            label={ES.navigation.keepRouteButton}
            onPress={onKeepCurrentRoute}
            variant="secondary"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  content: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
    marginHorizontal: 'auto',
    maxWidth: 680,
    padding: spacing.xl,
    width: '100%',
  },
  description: {
    color: colors.cautionOnSoft,
  },
  notice: {
    backgroundColor: colors.cautionSoft,
    borderLeftColor: colors.cautionBorder,
    borderLeftWidth: 5,
    borderRadius: radii.large,
    gap: spacing.md,
    padding: spacing.xxl,
  },
  routeName: {
    color: colors.inkMuted,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  title: {
    ...typography.display,
    color: colors.ink,
  },
});
