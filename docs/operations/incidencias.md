# Registro de incidencias técnicas

Estado: `En implementación`
Última actualización: 14 de agosto de 2026
Responsabilidad principal: `operations`

## Convención

Cada incidencia registra síntoma, causa, solución y consecuencia metodológica.
Las explicaciones extensas deben residir aquí o en el documento de la funcionalidad;
el journal solo enlaza la entrada.

## Incidencias registradas

| ID | Síntoma | Causa | Solución | Estado |
| --- | --- | --- | --- | --- |
| INC-001 | Overpass 406 | Identificación o formato de la petición | Cliente identificado y respuesta JSON explícita | Resuelta |
| INC-002 | Overpass 429/504 | Saturación y consultas pesadas | Reintentos, instancias alternativas y teselas con caché | Mitigada |
| INC-003 | Mapillary 500/502 | Volumen y disponibilidad externa | Teselas, paginación acotada y checkpoints | Mitigada |
| INC-004 | Credencial visible en una traza inicial | Token enviado en la URL | Autorización por cabecera y errores sanitizados; rotación requerida | Mitigada |
| INC-005 | `KeyError` en una métrica derivada | Orden incorrecto de cálculo | Construcción y validación explícitas antes del scoring | Resuelta |
| INC-006 | Auditoría npm con transitivas | Dependencias de Metro/Expo | No degradar Expo; revisar en actualización compatible | Aceptada |
| INC-007 | Advertencia de soporte de Python 3.9 | Versión fuera de soporte general | Mantener la decisión actual y documentar el riesgo | Aceptada |
| INC-008 | Instrucción «Gira a la derecha hacia -» | ORS entregó `-` como nombre de vía y superó la validación de cadena no vacía | Normalización común de referencias antes de narrar y exponer la API | Resuelta |
| INC-009 | La indicación oral era fragmentada y poco orientativa | Maniobra, distancia y evidencia se presentaban como bloques que la persona debía relacionar | Resumen operativo más eventos OSM y detalles accesibles independientes | Resuelta; revisión manual pendiente |
| INC-010 | Cruces repetidos y pasos aislados de 1–9 m | Doble representación nodo-vía en OSM y micromaniobras válidas de ORS | Agrupación de cruces coincidentes y composición de maniobras próximas | Resuelta; revisión manual pendiente |

## INC-008 — Referencia de vía sin significado en una instrucción

- **Fecha:** 14 de agosto de 2026.
- **Síntoma y mensaje sanitizado:** una ruta real mostraba y pronunciaba «Gira
  a la derecha hacia -» y «Referencia: -».
- **Contexto reproducible:** instrucción de giro procedente de ORS cuyo campo de
  nombre de vía contenía un guion en vez de un nombre real.
- **Causa:** el valor no estaba vacío, por lo que superaba la validación formal,
  aunque carecía de significado para la persona usuaria.
- **Solución:** se creó una normalización única para el texto narrado y el campo
  público de referencia. Los guiones, sus variantes tipográficas, `N/A`,
  `unknown`, `unnamed`, `null`, `none` y «sin nombre» se convierten en ausencia.
  La maniobra se conserva como «Gira a la derecha», sin inventar una calle.
- **Verificación:** las pruebas cubren todos los valores de relleno y las tres
  rutas reales no conservan ningún guion como referencia.
- **Consecuencia para la metodología:** validar el tipo de un dato no demuestra
  su utilidad semántica. Las entradas externas deben normalizarse antes de
  transformarse en lenguaje natural.
- **Trabajo pendiente:** comprobar con TalkBack la frase corregida en el
  emulador.

## INC-009 — Evidencia de accesibilidad sin ubicación dentro de la navegación

- **Fecha:** 14 de agosto de 2026.
- **Síntoma:** inicialmente la pantalla no indicaba en qué paso se encontraban
  los cruces, semáforos, señales acústicas o vibratorias, pavimento podotáctil,
  bordillos, rampas y escalones. Tras añadir esos datos, una segunda revisión
  mostró que «Gira a la derecha» seguía siendo poco orientativo: maniobra,
  distancia y evidencia aparecían en bloques separados y la persona debía
  reconstruir mentalmente una única indicación.
- **Causa:** los datos OSM alimentaban las restricciones, la puntuación y el
  resumen de incertidumbre de toda la ruta, pero todavía no existía una relación
  explícita entre cada objeto OSM y una instrucción de ORS.
- **Solución:** cada cruce o barrera confirmada se proyecta sobre la geometría de
  la ruta, se asigna al tramo correspondiente y se ordena por distancia. La frase
  principal combina acción, distancia posterior al giro, posición del primer
  evento y características favorables o desfavorables confirmadas. La API
  conserva además los eventos estructurados y la aplicación muestra cada detalle
  como un foco independiente de TalkBack.
- **Criterio de seguridad:** una etiqueta favorable permite comunicar una
  característica declarada; una negativa genera un aviso; una etiqueta ausente
  mantiene el estado desconocido. No encontrar una etiqueta de señal acústica
  nunca permite afirmar que el semáforo carece de ella. Se utiliza «próximo»
  porque la proximidad espacial no demuestra el lado exacto de la calle.
- **Verificación:** las tres rutas reales contienen 32, 49 y 27 eventos, con
  192, 294 y 162 detalles independientes. Las pruebas comprueban el orden, los
  estados, la procedencia OSM y la lectura separada. La validación completa
  alcanza 229 pruebas del backend y 53 de la aplicación, sin errores de Ruff,
  TypeScript ni ESLint.
- **Consecuencia para la metodología:** la puntuación global y la asistencia
  durante el recorrido son responsabilidades diferentes. Una característica
  solo resulta útil durante la navegación si se conserva su posición, su
  procedencia y su incertidumbre.
- **Trabajo pendiente:** recorrer manualmente los nuevos eventos con TalkBack y
  valorar si su cantidad debe resumirse para evitar sobrecarga informativa. Los
  rumbos cardinales se estudiarán con el GPS y la brújula, pues pueden resultar
  inestables en tramos cortos y no deben añadirse sin evaluación de uso.

## INC-010 — Cruces repetidos y micromaniobras aisladas

- **Fecha:** 14 de agosto de 2026.
- **Síntoma:** la calle de Tutor mostraba cinco cruces adicionales a 80, 80, 94,
  94 y 164 m. Otras pantallas pedían avanzar solo 1, 2 o 3 m antes de pasar a la
  siguiente instrucción.
- **Contexto reproducible:** primera ruta ORS del recorrido Moncloa–Príncipe Pío,
  con la instantánea OSM local y corredor de asociación de 5 m.
- **Causa de los cruces:** en las posiciones de 80 y 94 m había un nodo OSM y un
  tramo OSM con la misma proyección longitudinal. Eran dos geometrías que
  describían el mismo cruce físico, no cuatro cruces diferentes.
- **Causa de las distancias cortas:** ORS conserva decisiones geométricas
  próximas y devolvió segmentos de 1,2 a 9,9 m entre maniobras. El backend los
  mostraba uno por pantalla, aunque para la escucha formaban una secuencia.
- **Solución:** las representaciones de cruce situadas como máximo a un metro en
  la dirección del recorrido se agrupan sin perder sus etiquetas. Las
  maniobras separadas por menos de 10 m se conservan, pero se anuncian junto con
  la siguiente acción mediante una frase secuencial. Los eventos OSM se
  recolocan a su distancia acumulada dentro de la nueva indicación.
- **Verificación:** el tramo de la calle de Tutor muestra ahora cuatro cruces
  distintos a 10, 80, 94 y 164 m. Las tres rutas reales pasan de 32, 49 y 27
  registros iniciales a 27, 38 y 23 cruces navegacionales. Sus instrucciones
  pasan de 32, 40 y 29 pasos ORS a 23, 30 y 21 indicaciones compuestas, sin
  segmentos inferiores a 10 m aislados. Dos pruebas específicas y la suite de
  231 pruebas del backend verifican la agrupación y la conservación de la
  evidencia.
- **Consecuencia para la metodología:** un objeto cartográfico no equivale
  necesariamente a un elemento físico, y una instrucción del motor no equivale
  necesariamente a una unidad cognitiva adecuada. La transformación debe
  conservar trazabilidad y seguridad, pero adaptar la granularidad al canal
  auditivo.
- **Trabajo pendiente:** validar con TalkBack la longitud de las frases
  compuestas y revisar los umbrales con GPS y personas usuarias. No se deben
  fusionar automáticamente cruces de fases distintas en un refugio central.

## Evidencia relacionada

Las incidencias de adquisición relevantes para la metodología se sintetizan en
[selección del área piloto](../research/seleccion-area-piloto.md#retos-principales-encontrados-y-soluciones).
La resolución básica de problemas y las decisiones superadas se conservan únicamente en
las notas privadas locales.

## Plantilla

### INC-XXX — Título

- Fecha:
- Síntoma y mensaje sanitizado:
- Contexto reproducible:
- Causa:
- Solución o mitigación:
- Verificación:
- Consecuencia para la metodología:
- Trabajo pendiente:
