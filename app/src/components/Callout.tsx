import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { Icon, type IconName } from '@/components/icons';
import {
  type PresentationColors,
  radii,
  spacing,
  usePresentation,
} from '@/theme';

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
  const presentation = usePresentation();
  const textColors = toneTextColors(presentation.colors);
  const label = title ? `${title}. ${text}` : text;
  const textColor = { color: textColors[tone] };

  return (
    <View
      accessible
      accessibilityLanguage="es-ES"
      accessibilityLabel={label}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityRole={role}
      style={[
        styles.container,
        containerTones(presentation.colors)[tone],
        presentation.highContrast && styles.highContrast,
      ]}
    >
      <Icon color={textColors[tone]} name={toneIcons[tone]} size={22} />
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
  highContrast: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
  },
});

const containerTones = (palette: PresentationColors) => StyleSheet.create({
  caution: {
    backgroundColor: palette.cautionSoft,
    borderLeftColor: palette.cautionBorder,
    borderColor: palette.cautionBorder,
  },
  danger: {
    backgroundColor: palette.dangerSoft,
    borderLeftColor: palette.dangerBorder,
    borderColor: palette.dangerBorder,
  },
  info: {
    backgroundColor: palette.surfaceSunken,
    borderLeftColor: palette.border,
    borderColor: palette.border,
  },
  positive: {
    backgroundColor: palette.positiveSoft,
    borderLeftColor: palette.brandInk,
    borderColor: palette.brandInk,
  },
  unknown: {
    backgroundColor: palette.unknownSoft,
    borderLeftColor: palette.unknownBorder,
    borderColor: palette.unknownBorder,
  },
});

const toneTextColors = (
  palette: PresentationColors,
): Record<CalloutTone, string> => ({
  caution: palette.cautionOnSoft,
  danger: palette.dangerOnSoft,
  info: palette.ink,
  positive: palette.positiveOnSoft,
  unknown: palette.unknownOnSoft,
});
