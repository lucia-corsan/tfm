import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

interface RumboLogoProps {
  color?: string;
  size?: number;
}

/**
 * Marca de la aplicación.
 *
 * Es decorativa: el nombre siempre acompaña al símbolo como texto, así que se
 * oculta al lector de pantalla para no duplicar la locución.
 */
export function RumboLogo({ color = colors.brand, size = 32 }: RumboLogoProps) {
  return (
    <Svg
      accessibilityElementsHidden
      focusable={false}
      height={size}
      importantForAccessibility="no-hide-descendants"
      viewBox="0 0 40 40"
      width={size}
    >
      <Path
        d="M10 30 C10 12 26 12 26 30 C26 36 10 36 10 12"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={5}
      />
      <Circle cx={10} cy={12} fill={color} r={3.6} />
    </Svg>
  );
}
