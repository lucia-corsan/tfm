# Sistema de diseño de la aplicación móvil

Estado: `Vigente`  
Última actualización: 2026-08-21
Responsabilidad principal: `product`

## Problema que resuelve

La primera versión funcional de la aplicación cumplía los requisitos de
accesibilidad, pero su interfaz había crecido sin un sistema común: colores
elegidos caso por caso, tipografía del sistema, rótulos cortos en mayúsculas,
tarjetas anidadas dentro de otras tarjetas y una única pantalla muy larga que
concentraba búsqueda, perfil, resultados y descartes. Para una persona ciega o
con baja visión eso significa recorridos de lectura largos y una jerarquía
visual que no coincide con la importancia real de cada bloque.

## Requisitos

- Una sola escala de color, tipografía, espaciado y radios para toda la interfaz.
- Contraste WCAG 2.2 AA en todo texto e icono informativo.
- Destinos táctiles de 48 × 48 puntos como mínimo.
- Todos los recursos empaquetados con la aplicación: ni tipografías ni iconos
  descargados en tiempo de ejecución.
- Un dato desconocido nunca puede presentarse con el mismo tratamiento visual
  que uno favorable.
- El orden visual y el orden de lectura deben seguir coincidiendo.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Biblioteca de componentes externa (`react-native-paper`, `gluestack`) | Componentes ya resueltos | Dependencia pesada, temas de Material que no encajan con los avisos de incertidumbre y menos control del árbol de accesibilidad | Descartada |
| Tipografía del sistema | Sin peso adicional | No aporta legibilidad específica para baja visión y varía entre dispositivos | Descartada |
| Sistema propio de tokens y componentes con recursos locales | Control total del contraste, del árbol accesible y del peso | Requiere mantener los componentes | Adoptada |

## Decisión adoptada

Se ha creado `app/src/theme` con los tokens de color, espaciado, radios y
tipografía, y un conjunto reducido de componentes compartidos: `Screen`,
`TopBar`, `Card`, `Callout`, `Chip`, `SectionHeader`, `MetricItem`,
`PrimaryButton` e `Icon`.

- **Banda de acción inferior**: la acción principal de cada pantalla del flujo
  ocupa una banda fija al pie, de la misma altura y con el texto centrado en
  todas ellas. Es el destino táctil mayor de la pantalla y su posición se
  aprende una sola vez. Los pasos de configuración añaden sobre ella una barra
  de progreso por segmentos, que solo refuerza visualmente el «Paso X de 3» ya
  enunciado como texto.
- **Jerarquía tipográfica**: el rango de un texto lo marca su tamaño, no su
  grosor. La negrita queda reservada a los encabezados, que son estructura;
  ninguna descripción, ayuda ni etiqueta de control la usa. La escala del lienzo
  asignaba 700 al cuerpo destacado y a las notas de 13 px, lo que dejaba una
  etiqueta importante como «Aprender de mis elecciones» más pequeña que su
  propia explicación en negrita. La escala aplicada es: título de pantalla 34,
  título de sección 21, etiqueta destacada y texto de acción 19 sin negrita,
  encabezado dentro de tarjeta 17, cuerpo 15 y notas 13, estos dos últimos
  también sin negrita.
- **Tipografía**: Atkinson Hyperlegible Next, creada por el Braille Institute of
  America para mejorar la legibilidad con baja visión. Se distribuye bajo la
  licencia SIL Open Font License y se incluye en `app/assets/fonts` en cinco
  instancias estáticas, generadas a partir de la fuente variable oficial. Se
  cargan con `expo-font` en el arranque.
- **Iconos**: Phosphor, en su trazo «bold» y bajo licencia MIT. Los trazos se
  han copiado a `app/src/components/icons/paths.ts` y se dibujan con
  `react-native-svg`, de modo que no se añade ninguna dependencia de iconos ni
  ninguna descarga externa. Todos los iconos se ocultan al lector de pantalla:
  su significado viaja siempre en el texto o en la etiqueta del control.
- **Color**: la paleta procede del lienzo «Rumbo · Sistema y flujo de búsqueda»
  publicado en Claude Design. Fondo blanco, tinta casi negra y verde de marca
  `#17A55C`. La información favorable usa azul `#1D5FA0` para no confundirla con
  el verde de marca; la evidencia desfavorable, ámbar oscuro `#533B0C`; el error,
  granate `#441818`; y las rutas descartadas, un neutro cálido `#2C2927`. La
  distinción nunca depende solo del color, porque cada aviso lleva icono y
  texto.
- **Corrección de contraste**: el verde de marca `#17A55C` solo alcanza 3,19:1
  sobre blanco, por debajo del 4,5:1 exigido por WCAG 2.2 AA. Se reserva para el
  símbolo y los elementos gráficos, y todo lo que lleva texto —rellenos de
  botón, iconos informativos y enlaces— usa el verde oscuro `#0E7A43` del propio
  sistema, que llega a 5,41:1.
- **Jerarquía**: se ha eliminado el rótulo corto en mayúsculas de todas las
  pantallas y se ha limitado la anidación a una sola superficie elevada. Dentro
  de una tarjeta solo hay filas, filetes y avisos planos. El contenido de cada
  pantalla, acciones incluidas, comparte un único desplazamiento; no hay barras
  fijas que oculten parte del contenido.
- **Foco de teclado**: `Pressable` ya es alcanzable con teclado y se activa con
  Intro, pero Android no dibuja ningún indicador de foco sobre las vistas de
  React Native, de modo que no había forma de saber dónde estaba el foco. Los
  controles pintan ahora un contorno ámbar mientras lo tienen.
- **Pantallas de una sola pregunta**: portada, destino, origen y tres pasos de
  configuración. Además de seguir el diseño,
  resuelve un problema real: en Android la propiedad `accessible` introduce cada
  párrafo en el recorrido del teclado, y con una pantalla larga la búsqueda de
  foco saltaba de forma errática sin alcanzar el botón de comparación.
- **Detalle desplegable**: «Saber más» abre la evidencia completa dentro de la
  propia tarjeta y declara su estado expandido o contraído, en lugar de abrir
  una pantalla aparte.
- **Marca**: la aplicación se llama Rumbo. El símbolo vive en
  `RumboLogo.tsx`, dibujado con los mismos trazos del archivo original, y va
  siempre acompañado del nombre como texto, de modo que se oculta al lector de
  pantalla para no duplicar la locución. En la portada verde, el punto aparece
  primero y el trazo se dibuja a continuación, siguiendo la animación de la
  identidad visual. El símbolo de la portada se representa a 160 puntos para
  que actúe como elemento principal de la composición, mientras que las barras
  superiores conservan el símbolo estático y reducido para no introducir
  movimiento repetitivo durante el uso. Si Android tiene activada la opción
  «reducir movimiento», la portada muestra directamente el logotipo completo
  sin ejecutar la animación.
- **Arranque de marca**: los recursos nativos ya no utilizan el símbolo azul de
  ejemplo de Expo. El icono general, el icono adaptativo de Android y la pantalla
  nativa de carga comparten el verde oscuro y el símbolo blanco de Rumbo. La
  pantalla nativa es necesariamente estática; al terminar la carga da paso a la
  portada React, que inicia la animación del mismo trazado. Expo Go puede seguir
  mostrando una transición propia porque funciona como aplicación contenedora;
  la experiencia nativa definitiva solo puede comprobarse en una compilación de
  previsualización o producción.
- **Presentación configurable**: un proveedor temático global aplica la
  preferencia elegida en el cuestionario o en Ajustes. «Texto más grande»
  incrementa un 25 % tamaños e interlineados sin desactivar el escalado de
  Android. «Contraste reforzado» utiliza texto negro sobre blanco, verde de
  acción `#005A2B` y bordes más visibles. Ambos modos pueden combinarse y no
  modifican el ranking.
- **Ajustes**: una pantalla sencilla de una columna permite revisar el perfil,
  cambiar la presentación, configurar el modo y velocidad de voz, pausar el
  aprendizaje y gestionar lugares guardados. Se abre a pantalla completa sin
  desmontar el flujo anterior. Su botón de retroceso usa una flecha verde sobre
  el fondo transparente de la cabecera. El engranaje permanece
  disponible en búsqueda, planificación, resultados, navegación y confirmación
  de redirección.
- **Edición coherente**: Ajustes muestra el valor vigente y un botón «Editar»;
  presentación, voz y aprendizaje reutilizan después la misma pregunta del
  formulario inicial, con guardado explícito. No se duplican radios ni
  interruptores en la pantalla principal de Ajustes.
- **Resultados sin cabeceras duplicadas**: «Alternativas ordenadas» aparece una
  sola vez en la barra superior. Bajo ella solo se presentan las tarjetas
  aceptadas y descartadas. La flecha de retorno es verde y transparente para no
  competir con el contenido; el mismo patrón se aplica a todas las pantallas
  para que el retroceso sea predecible.
- **Agrupación neutra**: los recuadros azules se eliminan de Ajustes y del
  resumen de resultados. Los colores informativos se reservan para significados
  reales, no para decorar o repetir la estructura de una pantalla.

## Datos de entrada y salida

### Entrada

- Textos de interfaz de `app/i18n/es.ts`.
- Preferencia local de presentación recuperada del cuestionario.
- Respuestas estructuradas del backend, sin cambios respecto a la versión
  anterior.

### Salida

- Interfaz renderizada con tema efectivo. Ningún componente visual transforma,
  calcula ni filtra datos de dominio.

## Implementación

- Módulos afectados: `app/src/theme`, `app/src/components`, `app/src/screens`,
  `app/src/app/_layout.tsx`, `app/i18n/es.ts` y `app/app.json`.
- `app/src/theme/presentation.tsx` concentra la paleta reforzada y la escala
  tipográfica; `SettingsScreen.tsx` permite modificarlas.
- Dependencia añadida: `react-native-svg`, incluida en Expo Go y necesaria solo
  para dibujar los trazos locales de los iconos.
- El flujo de comparación se ha repartido en tres pantallas, descritas en
  [Comparación de rutas en la aplicación](comparacion-rutas-app.md).
- No se ha modificado el backend, el índice de adecuación ni la narración. El
  aprendizaje solo ha recibido una identidad local más precisa para separar
  configuraciones de restricciones; su fórmula no cambia.

## Pruebas

- `npm test`: 162 pruebas, incluidas las de accesibilidad de las pantallas, el
  recorrido por pasos y el estado del indicador de foco.
- Recorrido con teclado comprobado en el emulador leyendo el nodo enfocado en
  cada tabulación: los tres pasos se completan con el tabulador y la tecla
  Intro.
- `npm run lint` y `npm run typecheck` sin avisos.
- Contraste comprobado por cálculo sobre cada pareja de color de los tokens: el
  mínimo entre los textos es 5,82:1 y el de un control desactivado, 5,12:1.
- Comprobación manual en el emulador de Android con TalkBack activo y con
  TalkBack desactivado.
- Pruebas automáticas de aumento de tamaño, paleta reforzada y actualización
  local desde Ajustes.

## Resultados

La reducción de superficies anidadas y el reparto en tres pantallas acortan el
recorrido de lectura de la comparación. La medida del efecto en personas
usuarias reales está pendiente de la evaluación de usabilidad.

## Trabajo no implementado del diseño

Dos elementos del lienzo no tienen soporte todavía. Solo se mantienen en los
puntos donde su presencia resulta comprensible:

- **Dictado por voz**. `expo-speech` solo sintetiza voz; el reconocimiento
  exigiría una dependencia nativa fuera de Expo Go o un servicio externo, con las
  implicaciones de privacidad que eso conlleva. Se eliminó la pantalla previa
  que obligaba a escoger entre hablar o teclear porque añadía un paso para
  anunciar una función todavía no disponible. El micrófono de cada buscador se
  conserva como indicación contextual y, al activarlo, explica que el dictado no
  está disponible en esta versión.
- **Nombre de calle de la ubicación actual**. El diseño muestra «Calle de Ferraz
  22»; el backend no expone geocodificación inversa y traducir las coordenadas
  con un servicio del dispositivo enviaría la ubicación a un tercero. La
  aplicación usa la ubicación real y la presenta como coordenadas aproximadas.

Queda pendiente comprobar visualmente en el emulador las dos variantes de la
portada: animación completa con la configuración habitual y símbolo estático con
«reducir movimiento» activado. La implementación consulta esa preferencia del
sistema y reacciona también si cambia mientras la pantalla está abierta.

## Limitación conocida del recorrido con teclado

En las pantallas cuyo contenido desplazable solo tiene un par de controles
contiguos, la búsqueda de foco hacia delante de Android (la tecla de tabulación)
alterna entre ellos y no sale del contenedor, de modo que no alcanza la banda de
acción. La banda sí se alcanza con las flechas de dirección, donde figura como
última parada, y forma parte del árbol de accesibilidad que recorre TalkBack.
Es un comportamiento del propio `ScrollView` de Android, no del marcado de la
aplicación: `accessible` y el foco de teclado comparten propiedad en esta
plataforma, como ya se documenta en la especificación de accesibilidad.

## Riesgos y limitaciones

- Las cinco instancias tipográficas suman unos 240 kilobytes en el paquete.
- Mantener los componentes propios exige revisar el contraste al añadir colores.
- La mejora de legibilidad de Atkinson Hyperlegible está documentada por su
  autor, pero no se ha medido en este trabajo.
- La ampliación interna puede combinarse con el tamaño máximo del sistema y
  alargar mucho las pantallas; se permite desplazamiento, pero falta una
  revisión visual exhaustiva.

## Texto base para la memoria

La interfaz del MVP se ha unificado en un sistema de diseño propio con recursos
íntegramente locales. La tipografía Atkinson Hyperlegible Next, creada para
personas con baja visión, y un conjunto de iconos vectoriales copiados al
repositorio evitan cualquier dependencia externa en ejecución. La paleta asigna
un color y un icono propios a cada estado de la evidencia, de modo que un
atributo desconocido nunca comparte tratamiento visual con uno favorable, y
todos los pares de color superan el contraste 4,5:1 exigido por WCAG 2.2 AA. La
jerarquía se ha aplanado a una sola superficie elevada por bloque para que el
orden visual siga coincidiendo con el orden de lectura de TalkBack.

## Trabajo pendiente

- [ ] Medir el efecto del rediseño en la evaluación de usabilidad.
- [ ] Revisar el comportamiento con el tamaño de fuente del sistema al máximo.
- [ ] Validar los cuatro modos de presentación con personas usuarias.

## Referencias y evidencias

- Atkinson Hyperlegible Next, Braille Institute of America, SIL Open Font
  License: `app/assets/fonts/OFL.txt`.
- Phosphor Icons, licencia MIT: `app/src/components/icons/paths.ts`.
- Tokens: `app/src/theme/tokens.ts`.
- Expo, [Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/):
  configuración nativa y limitaciones de comprobación en Expo Go.

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
