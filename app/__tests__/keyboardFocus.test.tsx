import { act, renderHook } from '@testing-library/react-native';

import { colors, focusRing, useFocusRing } from '@/theme';

/**
 * `Pressable` ya es alcanzable con teclado o conmutador, pero Android no dibuja
 * ningún indicador de foco sobre las vistas de React Native. La aplicación lo
 * pinta para cumplir el criterio 2.4.7 de WCAG 2.2.
 */
describe('indicador de foco de teclado', () => {
  test('el contorno usa un color visible sobre las superficies claras', () => {
    expect(focusRing.borderColor).toBe(colors.accent);
    expect(focusRing.borderWidth).toBeGreaterThanOrEqual(2);
  });

  test('el estado de foco sigue a las notificaciones del control', async () => {
    const { result } = await renderHook(() => useFocusRing());

    expect(result.current.focused).toBe(false);

    await act(async () => {
      result.current.focusProps.onFocus();
    });
    expect(result.current.focused).toBe(true);

    await act(async () => {
      result.current.focusProps.onBlur();
    });
    expect(result.current.focused).toBe(false);
  });
});
