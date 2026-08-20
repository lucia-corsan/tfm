import { useCallback, useState } from 'react';

import { colors } from '@/theme/tokens';

/**
 * Contorno del elemento con el foco del teclado.
 *
 * Android no dibuja ningún indicador propio sobre las vistas de React Native,
 * así que la aplicación lo pinta para cumplir el criterio 2.4.7 de WCAG 2.2.
 */
export const focusRing = {
  borderColor: colors.accent,
  borderWidth: 3,
} as const;

interface FocusRingState {
  /** Verdadero mientras el control tiene el foco del teclado. */
  focused: boolean;
  /** Propiedades que hay que aplicar al control. */
  focusProps: {
    onBlur: () => void;
    onFocus: () => void;
  };
}

/**
 * Expone el estado de foco de un control.
 *
 * `Pressable` ya es alcanzable con teclado o conmutador, pero Android no dibuja
 * ningún indicador sobre las vistas de React Native, así que hace falta seguir
 * el estado para pintarlo.
 */
export function useFocusRing(): FocusRingState {
  const [focused, setFocused] = useState(false);
  const onBlur = useCallback(() => setFocused(false), []);
  const onFocus = useCallback(() => setFocused(true), []);

  return {
    focused,
    focusProps: { onBlur, onFocus },
  };
}
