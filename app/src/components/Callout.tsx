import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { Icon, type IconName } from '@/components/icons';
import { colors, radii, spacing } from '@/theme';

export type CalloutTone =
  | 'caution'
  | 'danger'
  | 'info'
  | 'positive'
  | 'unknown';

interface CalloutProps {
  accessibilityLiveRegion?: ComponentProps<typeof View>['accessibilityLiveRegion'];
  /** Contenido adicional bajo el texto principal. */
  children?: ReactNode;
  /** Se expone como una alerta cuando el aviso es de seguridad. */
  role?: 'alert' | 'text';
  text: string;
  title?: string;
  tone: CalloutTone;
}

const toneIcons: Record<CalloutTone, IconName> = {
  caution: 'warning',
  danger: 'warningCircle',
  info: 'info',
  positive: 'checkCircle',
  unknown: 'sealQuestion',
};

/**
 * Aviso plano de una sola capa.
 *
 * Sustituye a las tarjetas anidadas: distingue el estado por color, icono y
 * filete lateral, sin volver a encerrar el contenido en otra superficie.
 */
export function Callout({
  accessibilityLiveRegion,
  children,
  role = 'text',
  text,
  title,
  tone,
}: CalloutProps) {
  const label = title ? `${title}. ${text}` : text;
  const textColor = { color: toneTextColors[tone] };

  return (
    <View
      accessible
      accessibilityLanguage="es-ES"
      accessibilityLabel={label}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityRole={role}
      style={[styles.container, containerTones[tone]]}
    >
      <Icon color={toneTextColors[tone]} name={toneIcons[tone]} size={22} />
      <View style={styles.copy}>
        {title ? (
          <AccessibleText
            accessible={false}
            style={textColor}
            variant="emphasis"
          >
            {title}
          </AccessibleText>
        ) : null}
        <AccessibleText accessible={false} style={textColor} variant="body">
          {text}
        </AccessibleText>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 5,
    borderRadius: radii.field,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
});

const containerTones = StyleSheet.create({
  caution: {
    backgroundColor: colors.cautionSoft,
    borderLeftColor: colors.cautionBorder,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderLeftColor: colors.dangerBorder,
  },
  info: {
    backgroundColor: colors.surfaceSunken,
    borderLeftColor: colors.border,
  },
  positive: {
    backgroundColor: colors.positiveSoft,
    borderLeftColor: colors.brandInk,
  },
  unknown: {
    backgroundColor: colors.unknownSoft,
    borderLeftColor: colors.unknownBorder,
  },
});

const toneTextColors: Record<CalloutTone, string> = {
  caution: colors.cautionOnSoft,
  danger: colors.dangerOnSoft,
  info: colors.ink,
  positive: colors.positiveOnSoft,
  unknown: colors.unknownOnSoft,
};
