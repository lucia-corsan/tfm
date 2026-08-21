import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
} from 'react';
import type { TextStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

/** Preferencia visual elegida durante la configuración o desde Ajustes. */
export type PresentationMode =
  | 'both'
  | 'highContrast'
  | 'largeText'
  | 'system';

export type PresentationColors = {
  [Key in keyof typeof colors]: string;
};
export type PresentationTypography = typeof typography;

interface PresentationContextValue {
  colors: PresentationColors;
  highContrast: boolean;
  largeText: boolean;
  mode: PresentationMode;
  typography: PresentationTypography;
}

interface PresentationProviderProps {
  children: ReactNode;
  mode: PresentationMode;
}

/**
 * Paleta reforzada de alto contraste.
 *
 * Usa blanco y negro para contenido y separadores, y conserva un verde oscuro
 * para que las acciones sigan siendo reconocibles como parte de Rumbo.
 */
const highContrastColors: PresentationColors = {
  ...colors,
  canvas: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSunken: '#FFFFFF',
  border: '#000000',
  borderStrong: '#005A2B',
  ink: '#000000',
  inkMuted: '#202020',
  inkSubtle: '#303030',
  brand: '#008542',
  brandInk: '#005A2B',
  brandPressed: '#003D1D',
  brandDisabled: '#40564A',
  brandSoft: '#F1FFF7',
  brandOnSoft: '#003D1D',
  positiveSoft: '#F1F7FF',
  positiveOnSoft: '#003D73',
  cautionSoft: '#FFF8E5',
  cautionOnSoft: '#3D2900',
  cautionBorder: '#6B4500',
  unknownSoft: '#F5F5F5',
  unknownOnSoft: '#171717',
  unknownBorder: '#333333',
  dangerSoft: '#FFF2F2',
  dangerOnSoft: '#360000',
  dangerBorder: '#6E0000',
  neutralSoft: '#F5F5F5',
  neutralOnSoft: '#111111',
  scrim: 'rgba(0, 0, 0, 0.78)',
};

const LARGE_TEXT_SCALE = 1.25;

function scaleTextStyle<T extends TextStyle>(style: T, scale: number): T {
  return {
    ...style,
    ...(typeof style.fontSize === 'number'
      ? { fontSize: Math.round(style.fontSize * scale) }
      : {}),
    ...(typeof style.lineHeight === 'number'
      ? { lineHeight: Math.round(style.lineHeight * scale) }
      : {}),
  };
}

function buildTypography(largeText: boolean): PresentationTypography {
  if (!largeText) {
    return typography;
  }
  return {
    display: scaleTextStyle(typography.display, LARGE_TEXT_SCALE),
    section: scaleTextStyle(typography.section, LARGE_TEXT_SCALE),
    action: scaleTextStyle(typography.action, LARGE_TEXT_SCALE),
    subheading: scaleTextStyle(typography.subheading, LARGE_TEXT_SCALE),
    emphasis: scaleTextStyle(typography.emphasis, LARGE_TEXT_SCALE),
    body: scaleTextStyle(typography.body, LARGE_TEXT_SCALE),
    meta: scaleTextStyle(typography.meta, LARGE_TEXT_SCALE),
    instruction: scaleTextStyle(typography.instruction, LARGE_TEXT_SCALE),
    metric: scaleTextStyle(typography.metric, LARGE_TEXT_SCALE),
  } as PresentationTypography;
}

const defaultValue: PresentationContextValue = {
  colors,
  highContrast: false,
  largeText: false,
  mode: 'system',
  typography,
};

const PresentationContext = createContext<PresentationContextValue>(defaultValue);

/** Aplica de forma reactiva las preferencias visuales a toda la aplicación. */
export function PresentationProvider({
  children,
  mode,
}: PresentationProviderProps) {
  const highContrast = mode === 'both' || mode === 'highContrast';
  const largeText = mode === 'both' || mode === 'largeText';
  const value = useMemo<PresentationContextValue>(
    () => ({
      colors: highContrast ? highContrastColors : colors,
      highContrast,
      largeText,
      mode,
      typography: buildTypography(largeText),
    }),
    [highContrast, largeText, mode],
  );

  return (
    <PresentationContext.Provider value={value}>
      {children}
    </PresentationContext.Provider>
  );
}

/** Devuelve la presentación efectiva sin duplicar decisiones en componentes. */
export function usePresentation(): PresentationContextValue {
  return useContext(PresentationContext);
}
