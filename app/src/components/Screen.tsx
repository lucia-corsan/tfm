import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, usePresentation } from '@/theme';

interface ScreenProps {
  /** Banda de acción inferior, fija bajo el contenido desplazable. */
  band?: ReactNode;
  children: ReactNode;
  /** Cabecera fija, normalmente una `TopBar` y su progreso. */
  header?: ReactNode;
}

/**
 * Contenedor común de las pantallas.
 *
 * Fija el fondo, los márgenes seguros y una única columna de lectura, de modo
 * que el orden visual coincida con el orden de enfoque del lector de pantalla.
 * La banda de acción queda fuera del desplazamiento para ocupar siempre el
 * mismo lugar.
 */
export function Screen({ band, children, header }: ScreenProps) {
  const presentation = usePresentation();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: presentation.colors.canvas }]}
    >
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {band ? (
        <SafeAreaView
          edges={['bottom']}
          style={[styles.band, { backgroundColor: presentation.colors.brandInk }]}
        >
          {band}
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  band: {
    width: '100%',
  },
  content: {
    gap: spacing.lg,
    marginHorizontal: 'auto',
    maxWidth: 680,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
});
