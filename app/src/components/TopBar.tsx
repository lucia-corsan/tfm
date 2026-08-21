import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { RumboLogo } from '@/components/RumboLogo';
import {
  focusRing,
  MINIMUM_TOUCH_TARGET,
  radii,
  spacing,
  useFocusRing,
  usePresentation,
} from '@/theme';

interface TopBarProps {
  actionHint?: string;
  actionIcon?: IconName;
  actionLabel?: string;
  backHint?: string;
  /** Muestra el símbolo de la marca junto al título. */
  brand?: boolean;
  /** Etiqueta accesible del botón de retroceso; si falta, no se muestra. */
  backLabel?: string;
  onAction?: () => void;
  onBack?: () => void;
  title: string;
}

/** Barra superior común, con flecha de retroceso verde y una acción opcional. */
export function TopBar({
  actionHint,
  actionIcon = 'gear',
  actionLabel,
  backHint,
  backLabel,
  brand = false,
  onAction,
  onBack,
  title,
}: TopBarProps) {
  const backFocus = useFocusRing();
  const actionFocus = useFocusRing();
  const presentation = usePresentation();
  const hasBack = Boolean(backLabel && onBack);
  const hasAction = Boolean(actionLabel && onAction);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: presentation.colors.canvas,
          borderBottomColor: presentation.colors.border,
        },
      ]}
    >
      {hasBack ? (
        <Pressable
          accessibilityHint={backHint}
          accessibilityLabel={backLabel}
          accessibilityLanguage="es-ES"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: 'transparent' },
            pressed && { backgroundColor: presentation.colors.brandSoft },
            backFocus.focused && focusRing,
          ]}
          {...backFocus.focusProps}
        >
          <Icon
            color={presentation.colors.brandInk}
            name="arrowLeft"
            size={26}
          />
        </Pressable>
      ) : null}
      {!hasBack || brand ? <RumboLogo size={30} /> : null}
      <Text
        accessible
        accessibilityLanguage="es-ES"
        accessibilityRole="header"
        style={[
          presentation.typography.section,
          styles.title,
          hasAction && styles.titleWithAction,
          { color: presentation.colors.ink },
        ]}
      >
        {title}
      </Text>
      {hasAction ? (
        <Pressable
          accessibilityHint={actionHint}
          accessibilityLabel={actionLabel}
          accessibilityLanguage="es-ES"
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { borderColor: presentation.colors.brandInk },
            pressed && { backgroundColor: presentation.colors.brandSoft },
            actionFocus.focused && focusRing,
          ]}
          {...actionFocus.focusProps}
        >
          <Icon
            color={presentation.colors.brandInk}
            name={actionIcon}
            size={24}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 2,
    height: MINIMUM_TOUCH_TARGET,
    justifyContent: 'center',
    // Se reserva la esquina al control flotante «Tools» del entorno de prueba.
    position: 'absolute',
    right: spacing.xxxl + spacing.xl,
    width: MINIMUM_TOUCH_TARGET,
  },
  back: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: MINIMUM_TOUCH_TARGET,
    justifyContent: 'center',
    marginLeft: -spacing.md,
    width: MINIMUM_TOUCH_TARGET,
  },
  bar: {
    alignItems: 'center',
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
    flex: 1,
  },
  titleWithAction: {
    marginRight: MINIMUM_TOUCH_TARGET + spacing.xxxl + spacing.xl,
  },
});
