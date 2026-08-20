import Svg, { Path } from 'react-native-svg';

import { ICON_PATHS, ICON_VIEW_BOX, type IconName } from '@/components/icons/paths';
import { colors } from '@/theme';

interface IconProps {
  color?: string;
  name: IconName;
  size?: number;
}

/**
 * Icono decorativo dibujado con trazos locales.
 *
 * Siempre se oculta al lector de pantalla: el significado debe estar en el
 * texto acompañante o en la etiqueta del control que lo contiene.
 */
export function Icon({ color = colors.ink, name, size = 24 }: IconProps) {
  return (
    <Svg
      accessibilityElementsHidden
      focusable={false}
      height={size}
      importantForAccessibility="no-hide-descendants"
      viewBox={ICON_VIEW_BOX}
      width={size}
    >
      <Path d={ICON_PATHS[name]} fill={color} />
    </Svg>
  );
}
