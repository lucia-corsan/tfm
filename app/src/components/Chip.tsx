import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import {
  type PresentationColors,
  radii,
  spacing,
  usePresentation,
} from '@/theme';

export type ChipTone = 'accent' | 'brand' | 'caution' | 'neutral' | 'unknown';

interface ChipProps {
  icon?: IconName;
  label: string;
  tone?: ChipTone;
}

/** Etiqueta breve de estado o procedencia, leída como una sola parada. */
export function Chip({ icon, label, tone = 'neutral' }: ChipProps) {
  const presentation = usePresentation();
  const textColors = toneTextColors(presentation.colors);
  return (
    <View
      accessible
      accessibilityLanguage="es-ES"
      accessibilityLabel={label}
      accessibilityRole="text"
      style={[styles.chip, backgrounds(presentation.colors)[tone]]}
    >
      {icon ? <Icon color={textColors[tone]} name={icon} size={16} /> : null}
      <Text
        accessible={false}
        style={[
          presentation.typography.meta,
          { color: textColors[tone] },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const toneTextColors = (
  palette: PresentationColors,
): Record<ChipTone, string> => ({
  accent: palette.brandOnSoft,
  caution: palette.cautionOnSoft,
  brand: palette.brandOnSoft,
  neutral: palette.inkMuted,
  unknown: palette.unknownOnSoft,
});

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
});

const backgrounds = (palette: PresentationColors) => StyleSheet.create({
  accent: {
    backgroundColor: palette.brandSoft,
  },
  caution: {
    backgroundColor: palette.cautionSoft,
  },
  brand: {
    backgroundColor: palette.brandSoft,
  },
  neutral: {
    backgroundColor: palette.surfaceSunken,
  },
  unknown: {
    backgroundColor: palette.unknownSoft,
  },
});
