# Especificación inicial de accesibilidad

## Principios

- No afirmar que una ruta es accesible de forma absoluta.
- Mostrar adecuación, confianza e incertidumbre por separado.
- Mantener al usuario como responsable de la elección final.
- No depender únicamente del mapa, el color, el GPS o la voz.
- Ofrecer siempre controles manuales y estados de error comprensibles.

## Interfaz

- Compatibilidad prioritaria con TalkBack.
- Rol, etiqueta y estado accesibles en cada control.
- `accessibilityHint` cuando aclare el resultado de una acción.
- Objetivos táctiles de al menos 44 por 44 puntos.
- Orden de foco lógico.
- Cada encabezado y párrafo informativo relevante debe constituir una parada de
  lectura independiente; no se agruparán tarjetas completas ni se dependerá de
  que TalkBack descubra por sí solo texto estático intermedio.
- Los elementos accesibles en español declaran el idioma BCP 47 `es-ES` para
  que el lector de pantalla pueda solicitar una voz compatible al sistema.
- Contraste mínimo WCAG 2.2 AA.
- Anuncios no intrusivos para carga, errores y rerouting.

La preferencia visual elegida en el perfil inicial también puede modificarse
desde «Ajustes». El modo de texto grande incrementa en un 25 % el tamaño y el
interlineado de la escala tipográfica propia, sin ampliar iconos ni depender del
zoom del sistema. El contraste reforzado sustituye los tonos secundarios por
blanco, negro y verde oscuro y conserva texto e iconos para comunicar cada
estado. El modo combinado aplica ambas transformaciones. Los cambios son
inmediatos, se guardan localmente y no alteran la puntuación de las rutas.

La pantalla «Ajustes» presenta una única columna, encabezados claros y controles
de tamaño táctil suficiente. Su flecha de retroceso es verde sobre el fondo
blanco y transparente de la cabecera; no depende de un bloque relleno ajeno al
sistema visual de la aplicación.
Se abre sobre el flujo actual para que volver no borre el origen, el destino ni
los resultados. La edición del perfil, la presentación, la voz y el
consentimiento del aprendizaje están disponibles. «Lugares guardados» permite
añadir, consultar y eliminar direcciones locales y después elegirlas como
origen o destino.

El engranaje se separa del borde derecho de la barra superior. En el emulador,
el acceso flotante de TalkBack puede ocupar esa esquina y ocultar un control de
la aplicación; reservar espacio permite conservar simultáneamente el botón del
sistema y el acceso a Ajustes de Rumbo.

Durante la navegación también se puede abrir «Ajustes» para aumentar el texto o
reforzar el contraste. La ruta activa permanece intacta. Si se modifica el
perfil de movilidad, un aviso aclara que la nueva configuración se aplicará en
la siguiente comparación, nunca mediante un recálculo silencioso.

## Datos

Cada atributo se clasificará como favorable, desfavorable o desconocido. Un
valor desconocido reducirá la confianza, aumentará la incertidumbre o producirá
un aviso; nunca sumará como evidencia positiva.

La cobertura de una fuente se registrará separadamente del estado observado.
Así se evita confundir «no se han encontrado escalones» con «se ha confirmado
que no hay escalones». Los porcentajes estarán acotados entre cero y uno y todo
atributo `unknown` deberá aparecer en el resumen de incertidumbre de la ruta.

El perfil separará:

- Restricciones críticas que pueden descartar una alternativa.
- Preferencias graduables que influyen en su orden.
- Máximo desvío aceptado respecto a la ruta más corta.

Los pesos graduables serán no negativos y deberán contener al menos una
preferencia activa. Se normalizarán al calcular el scoring; no sustituirán las
restricciones críticas.

La evidencia conservará por separado pasos de peatones, semáforos, ayudas
acústicas o vibratorias, pavimento podotáctil, bordillos, aceras, rampas,
escalones, superficie y pendiente. Los atributos relacionados de un mismo cruce
se agruparán en pocas preferencias comprensibles para evitar doble conteo y una
interfaz excesivamente compleja. El detalle seguirá disponible para avisos y
explicaciones accesibles.

## Navegación

La narración será determinista y compartirá una única fuente estructurada con
la interfaz y TTS. Con TalkBack activo se evitarán locuciones automáticas que
puedan solaparse con el lector de pantalla.

La voz propia de la aplicación utiliza velocidad normal por defecto y no se
reproduce automáticamente hasta que la persona lo solicite. El modo puede ser
automático, bajo demanda o desactivado, y puede elegirse
entre cuatro multiplicadores relativos —0,8; 1,0; 1,25 y 1,5— y detener la
locución desde un control accesible. Estos valores no se presentan como palabras
por minuto, porque el resultado depende de la voz y del dispositivo. Si el
estado del lector de pantalla es activo o todavía no se conoce, la app bloquea
su segunda voz; la velocidad de TalkBack continúa bajo el control de Android.
La preferencia de TTS es local, no participa en la recomendación y no se envía
al backend.

Cuando TalkBack está activo, el control operativo de la voz propia se oculta en
lugar de mostrarse deshabilitado. El modo y la velocidad se administran en
Ajustes y quedan disponibles para un uso posterior sin lector. Cada nueva instrucción es
la única región dinámica moderada de ese bloque; el contador de progreso no se
anuncia por separado para evitar duplicados. Los estados críticos de desviación,
recálculo o error conservan una región prioritaria y se usan de forma puntual.

El estado del GPS se presenta como texto y como región dinámica moderada. La
solicitud del permiso solo aparece después de pulsar un botón que explica su
alcance durante la navegación. El
permiso denegado, la precisión insuficiente y la posible desviación mantienen
disponibles los controles manuales. El avance automático no puede saltar más de
una instrucción por muestra y nunca elimina la posibilidad de avanzar o
retroceder mediante botones accesibles.

La confirmación de una desviación se presenta como una pantalla completa que
sitúa el foco inicial en su título.
La explicación aclara que la ubicación solo se enviará si se confirma. Las
acciones «Mantener la ruta actual» y «Calcular una nueva ruta» tienen nombres y
ayudas independientes. Durante el recálculo se anuncia un estado ocupado; el
éxito y los fallos se anuncian de forma prioritaria. Un error mantiene las
instrucciones anteriores y ofrece un botón explícito de reintento.

La instrucción de orientación y el contexto de accesibilidad serán paradas de
lectura separadas. Para un cruce próximo, TalkBack permitirá recorrer de forma
independiente el resumen del cruce y los detalles sobre semáforo, señal acústica
o vibratoria, pavimento podotáctil, bordillo y rampa. Un detalle desconocido se
leerá como falta de información, nunca como ausencia del elemento. Las frases
indicarán su procedencia cuando una afirmación dependa de OSM.

## Comparación móvil implementada

La primera pantalla funcional aplica los principios anteriores de esta manera:

- Los perfiles se exponen como botones de opción con nombre, ayuda y estado de
  selección.
- El botón de comparación comunica su estado desactivado mientras espera la
  respuesta, evitando envíos duplicados.
- La carga usa una región dinámica moderada y estado ocupado.
- Los errores usan un aviso prioritario y conservan un botón de reintento.
- El resumen anuncia únicamente el número de rutas disponibles y descartadas;
  el resto permanece navegable para no producir una locución automática larga.
- Adecuación, confianza e incertidumbre se muestran con nombre y porcentaje, no
  solo mediante posición o color.
- Razones, advertencias y descartes proceden de la misma respuesta estructurada
  del backend.
- La procedencia de las rutas se comunica mediante texto, no únicamente con una
  insignia visual.
- Si no queda ninguna alternativa compatible, se anuncia de forma explícita y
  no se utiliza lenguaje que presuponga la existencia de una ruta recomendada.
- Los atributos desconocidos, la evidencia desfavorable y la procedencia
  detallada se agrupan tras «Saber más», un control desplegable dentro de la
  propia tarjeta que declara su estado expandido o contraído. La persona no
  tiene que deducir el significado de un porcentaje aislado.
- Cuando una alternativa tiene evidencia desfavorable, la tarjeta lo indica con
  una etiqueta visible aunque el detalle esté contraído. Un aviso de seguridad
  no puede depender de que alguien despliegue una sección.
- La comparación se reparte en tres pantallas: búsqueda, alternativas ordenadas
  y detalle. Cada una tiene un único encabezado de nivel superior y un botón de
  retroceso con nombre explícito, de modo que el recorrido con TalkBack avanza
  por pasos cortos.
- Los ajustes de la voz propia de la aplicación no se muestran mientras hay un
  lector de pantalla activo: las instrucciones ya se locutan mediante TalkBack y
  la sección solo alargaría el recorrido de la pantalla.
- La aplicación no propone ningún origen ni destino de partida: ambos extremos
  se eligen de forma explícita, de modo que nadie compare un trayecto que no ha
  pedido.
- En la navegación, la pantalla solo mantiene la instrucción actual y sus
  controles de paso. La información de accesibilidad del tramo, los avisos de la
  ruta, el seguimiento por GPS y los ajustes de voz se agrupan tras un «Saber
  más» dentro de la propia tarjeta, con su estado expandido o contraído.
- En la última instrucción, la banda inferior deja de ofrecer el paso siguiente y
  pasa a terminar la navegación, para que no quede una acción sin efecto.
- El flujo se recorre en pantallas de una sola pregunta: portada, elección
  entre hablar y teclear, destino, origen y tres pasos de configuración
  —confirmación del trayecto, perfil y personalización—. Cada pantalla cabe sin
  desplazamiento y termina en una sola acción.
- El alcance del área piloto y el recordatorio de que la decisión final es de la
  persona se anuncian en la portada, de modo que la pantalla de elección entre
  hablar y teclear presente solo la pregunta y sus dos respuestas.
- El dictado por voz todavía no está implementado. La opción se conserva en la
  interfaz, pero declara su estado con un aviso prioritario en lugar de simular
  una función inexistente.
- Los controles se alcanzan con un teclado externo o con acceso por
  conmutadores, y se activan con Intro o con la tecla central. El control con el
  foco dibuja un contorno propio, porque Android no dibuja ninguno sobre las
  vistas de React Native y sin él no es posible saber dónde está el foco.
- En Android, `accessible` es la misma propiedad que gobierna el foco del
  teclado: `ReactTextViewManager` y `ReactViewManager` la traducen a
  `isFocusable`. Cada párrafo que se expone como parada de lectura ocupa también
  una parada de tabulación, de modo que una pantalla larga vuelve errática la
  búsqueda de foco de Android y puede dejar un botón fuera del recorrido. Los
  pasos cortos son la razón principal por la que el recorrido resulta
  predecible.
- La tipografía, los iconos y los colores proceden del sistema de diseño
  descrito en [Sistema de diseño de la aplicación](product/sistema-diseno-app.md),
  con contraste WCAG 2.2 AA comprobado en todas las parejas de color y con
  estados de la evidencia distinguidos por icono y texto, nunca solo por color.
- La presentación puede respetar el modo normal, aumentar la tipografía,
  reforzar el contraste o combinar ambas medidas. Esta preferencia procede del
  cuestionario inicial y puede cambiarse después desde «Ajustes» sin repetirlo.
- La evidencia desconocida y la desfavorable se presentan en secciones
  diferentes para evitar que TalkBack comunique ambas como si representaran el
  mismo riesgo.
- El orden de lectura coincide con el orden visual; no se utiliza la API
  experimental para forzar el foco.
- La introducción de resultados, los encabezados de sección y cada razón o
  advertencia se exponen como nodos independientes. De este modo pueden
  recorrerse párrafo por párrafo y no se salta directamente desde las métricas
  a la advertencia siguiente.
- Los nodos accesibles declaran `es-ES`. Esta propiedad comunica el idioma del
  contenido, pero no instala ni sustituye la voz de síntesis configurada en
  Android; el dispositivo debe disponer de una voz española.

Estas propiedades están cubiertas por pruebas de componentes, incluida una
regresión que exige paradas independientes y el idioma `es-ES`. Su utilidad se
ha confirmado manualmente con TalkBack en el emulador para el flujo disponible.
La generalización de estos resultados todavía requiere una evaluación de
usabilidad acotada con personas usuarias.
