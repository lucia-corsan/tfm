import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { RumboLogo } from '@/components/RumboLogo';
import {
  colors,
  focusRing,
  MINIMUM_TOUCH_TARGET,
  radii,
  spacing,
  typography,
  useFocusRing,
} from '@/theme';

interface TopBarProps {
  backHint?: string;
  /** Muestra el símbolo de la marca junto al título. */
  brand?: boolean;
  /** Etiqueta accesible del botón de retroceso; si falta, no se muestra. */
  backLabel?: string;
  onBack?: () => void;
  title: string;
}

/**
 * Barra superior de altura fija.
 *
 * Solo cambia lo que va a la izquierda: la marca al abrir un tramo del flujo o
 * el retroceso dentro de él. La altura y la posición del título no varían de
 * una pantalla a otra.
 */
export function TopBar({
  backHint,
  backLabel,
  brand = false,
  onBack,
  title,
}: TopBarProps) {
  const { focused, focusProps } = useFocusRing();
  const hasBack = Boolean(backLabel && onBack);

  return (
    <View style={styles.bar}>
      {hasBack ? (
        <Pressable
          accessibilityHint={backHint}
          accessibilityLabel={backLabel}
          accessibilityLanguage="es-ES"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [
            styles.back,
            pressed && styles.backPressed,
            focused && focusRing,
          ]}
          {...focusProps}
        >
          <Icon color={colors.ink} name="arrowLeft" size={26} />
        </Pressable>
      ) : null}
      {!hasBack || brand ? <RumboLogo size={30} /> : null}
      <Text
        accessible
        accessibilityLanguage="es-ES"
        accessibilityRole="header"
        style={styles.title}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: MINIMUM_TOUCH_TARGET,
    justifyContent: 'center',
    marginLeft: -spacing.md,
    width: MINIMUM_TOUCH_TARGET,
  },
  backPressed: {
    backgroundColor: colors.brandSoft,
  },
  bar: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: 'auto',
    maxWidth: 680,
    minHeight: 64,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  title: {
    ...typography.section,
    color: colors.ink,
    flex: 1,
  },
});
