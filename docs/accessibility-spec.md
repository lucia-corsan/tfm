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
- Los atributos desconocidos se enumeran individualmente debajo de la métrica
  de incertidumbre; la persona no tiene que deducir el significado de un
  porcentaje aislado.
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
regresión que exige paradas independientes y el idioma `es-ES`. Su utilidad
real debe confirmarse manualmente con TalkBack en el emulador y, posteriormente,
con una evaluación de usabilidad acotada.
