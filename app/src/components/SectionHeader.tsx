import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { Icon, type IconName } from '@/components/icons';
import { spacing, usePresentation } from '@/theme';

interface SectionHeaderProps {
  description?: string;
  icon?: IconName;
  title: string;
}

/** Encabezado de sección con icono y, si aporta contexto, una entradilla. */
export function SectionHeader({ description, icon, title }: SectionHeaderProps) {
  const presentation = usePresentation();
  return (
    <View style={styles.container}>
      <View style={styles.line}>
        {icon ? (
          <Icon color={presentation.colors.brandInk} name={icon} size={24} />
        ) : null}
        <AccessibleText
          accessibilityRole="header"
          style={styles.title}
          variant="section"
        >
          {title}
        </AccessibleText>
      </View>
      {description ? (
        <AccessibleText style={{ color: presentation.colors.inkMuted }}>
          {description}
        </AccessibleText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  line: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
});
