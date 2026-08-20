import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { colors, radii, spacing, typography } from '@/theme';

export type ChipTone = 'accent' | 'brand' | 'caution' | 'neutral' | 'unknown';

interface ChipProps {
  icon?: IconName;
  label: string;
  tone?: ChipTone;
}

/** Etiqueta breve de estado o procedencia, leída como una sola parada. */
export function Chip({ icon, label, tone = 'neutral' }: ChipProps) {
  return (
    <View
      accessible
      accessibilityLanguage="es-ES"
      accessibilityLabel={label}
      accessibilityRole="text"
      style={[styles.chip, backgrounds[tone]]}
    >
      {icon ? <Icon color={toneTextColors[tone]} name={icon} size={16} /> : null}
      <Text
        accessible={false}
        style={[styles.label, { color: toneTextColors[tone] }]}
      >
        {label}
      </Text>
    </View>
  );
}

const toneTextColors: Record<ChipTone, string> = {
  accent: colors.brandOnSoft,
  caution: colors.cautionOnSoft,
  brand: colors.brandOnSoft,
  neutral: colors.inkMuted,
  unknown: colors.unknownOnSoft,
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  label: {
    ...typography.meta,
  },
});

const backgrounds = StyleSheet.create({
  accent: {
    backgroundColor: colors.brandSoft,
  },
  caution: {
    backgroundColor: colors.cautionSoft,
  },
  brand: {
    backgroundColor: colors.brandSoft,
  },
  neutral: {
    backgroundColor: colors.surfaceSunken,
  },
  unknown: {
    backgroundColor: colors.unknownSoft,
  },
});
