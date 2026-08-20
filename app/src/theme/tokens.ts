/** Design tokens compartidos por toda la interfaz. */

/**
 * Paleta del sistema visual de Rumbo.
 *
 * Sigue el diseño «Rumbo · Sistema y flujo de búsqueda» con una corrección: el
 * verde de marca `#17A55C` solo alcanza 3,19:1 sobre blanco, por debajo del
 * 4,5:1 que exige WCAG 2.2 AA. Se reserva para el símbolo y los elementos
 * gráficos, y todo lo que lleva texto usa el verde oscuro `#0E7A43`, que llega
 * a 5,41:1. La información favorable usa azul para no confundirla con el verde
 * de marca, y ningún estado depende solo del color: todos llevan icono y texto.
 */
export const colors = {
  /** Fondo de pantalla. */
  canvas: '#FFFFFF',
  /** Superficie de una tarjeta sobre el fondo. */
  surface: '#FFFFFF',
  /** Superficie hundida para agrupar sin dibujar otra tarjeta. */
  surfaceSunken: '#F5F7F5',
  /** Línea divisoria. */
  border: '#D8DFDA',
  /** Línea divisoria de un elemento seleccionado o destacado. */
  borderStrong: '#0E7A43',

  /** Texto principal y barra superior. */
  ink: '#14181B',
  /** Texto secundario. */
  inkMuted: '#4A534E',
  /** Texto terciario, solo para notas legales o de procedencia. */
  inkSubtle: '#5A635E',
  /** Texto sobre superficies oscuras. */
  inkInverse: '#FFFFFF',

  /** Verde de marca. Solo para el símbolo y elementos gráficos sin texto. */
  brand: '#17A55C',
  /** Verde de acción: rellenos con texto, iconos informativos y enlaces. */
  brandInk: '#0E7A43',
  brandPressed: '#0B5E34',
  brandDisabled: '#5A736C',
  /** Superficie verde suave. */
  brandSoft: '#E4F7EC',
  /** Texto sobre `brandSoft`. */
  brandOnSoft: '#0E7A43',

  /** Acento cálido para el foco de teclado. */
  accent: '#FFC53D',

  /** Información favorable. Azul, para no confundirla con el verde de marca. */
  positiveSoft: '#E6EEF7',
  positiveOnSoft: '#1D5FA0',

  /** Evidencia desfavorable declarada. */
  cautionSoft: '#FBF0DA',
  cautionOnSoft: '#533B0C',
  cautionBorder: '#A97818',

  /** Información no confirmada; nunca se presenta como favorable. */
  unknownSoft: '#F0F2F1',
  unknownOnSoft: '#3F4A44',
  unknownBorder: '#8C948F',

  /** Error de la aplicación o del servidor. */
  dangerSoft: '#FBEAEA',
  dangerOnSoft: '#441818',
  dangerBorder: '#B98686',

  /** Rutas descartadas. */
  neutralSoft: '#F2F0EF',
  neutralOnSoft: '#2C2927',

  /** Velo de los diálogos modales. */
  scrim: 'rgba(20, 24, 27, 0.66)',
} as const;

/** Escala de espaciado del sistema visual. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

/** Radios de esquina. */
export const radii = {
  /** Campos de texto. */
  field: 12,
  /** Botones. */
  button: 14,
  /** Tarjetas. */
  card: 16,
  /** Tarjetas grandes y bandas. */
  large: 20,
  pill: 999,
} as const;

/** Familias tipográficas Atkinson Hyperlegible Next incluidas en la aplicación. */
export const fonts = {
  regular: 'AtkinsonHyperlegibleNext-Regular',
  medium: 'AtkinsonHyperlegibleNext-Medium',
  semiBold: 'AtkinsonHyperlegibleNext-SemiBold',
  bold: 'AtkinsonHyperlegibleNext-Bold',
  extraBold: 'AtkinsonHyperlegibleNext-ExtraBold',
} as const;

export const typography = {
  /**
   * Escala tipográfica.
   *
   * Los tamaños se mantienen próximos entre sí para que ninguna pantalla salte
   * de escala: la jerarquía la marca el tamaño, no el grosor. La negrita queda
   * reservada a los encabezados y al texto de acción, que son estructura y
   * control; ninguna descripción, ayuda ni etiqueta corriente la usa.
   *
   * Se usan familias con peso propio en lugar de `fontWeight` porque Android
   * sintetiza la negrita cuando ambas propiedades se combinan.
   */

  /** Título de pantalla. */
  display: {
    fontFamily: fonts.bold,
    fontSize: 26,
    letterSpacing: -0.3,
    lineHeight: 33,
  },
  /** Título de sección. */
  section: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 27,
  },
  /** Texto de la banda de acción inferior. */
  action: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 28,
  },
  /** Encabezado dentro de una tarjeta o un bloque. */
  subheading: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 24,
  },
  /** Etiqueta destacada: resalta por tamaño, sin negrita. */
  emphasis: {
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 26,
  },
  /** Cuerpo de texto y descripciones. */
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
  },
  /** Meta, ayudas y pies de nota. */
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  /** Instrucción de navegación, el texto de mayor rango de la aplicación. */
  instruction: {
    fontFamily: fonts.bold,
    fontSize: 26,
    letterSpacing: -0.2,
    lineHeight: 34,
  },
  /** Cifra de una métrica. */
  metric: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
} as const;

/** Altura mínima de cualquier destino táctil, según WCAG 2.2 AA. */
export const MINIMUM_TOUCH_TARGET = 44;

/** Altura de los botones principales, por encima del mínimo táctil. */
export const BUTTON_HEIGHT = 52;

/**
 * Altura de la banda de acción inferior, sin contar el margen seguro.
 *
 * Es idéntica en todas las pantallas del flujo: la acción principal siempre
 * ocupa el mismo sitio y el mismo tamaño, de modo que su posición se aprende
 * una sola vez.
 */
export const ACTION_BAND_HEIGHT = 96;
