# Perfil inicial y preferencias de comparación

Estado: `Validado`
Última actualización: `21 de agosto de 2026`
Responsabilidad principal: `product`

## Problema que resuelve

Una misma ruta peatonal no resulta igual de adecuada para todas las personas.
La distancia, los escalones, la complejidad de los cruces, la pendiente, la
calidad de la documentación disponible o el número de giros pueden tener una
importancia distinta en cada caso. Por ello, la aplicación no debe deducir las
necesidades a partir de una etiqueta médica ni imponer un único perfil de
«persona ciega».

El cuestionario inicial recoge decisiones funcionales: qué debe excluirse, qué
desvío se acepta y qué factores deben pesar más al comparar alternativas. Las
respuestas se convierten en parámetros explícitos del mismo sistema de
clasificación que se describe en [Scoring explicable](../research/scoring-explicable.md).

## Requisitos

- Preguntar por situaciones concretas de movilidad, no por diagnósticos.
- Distinguir límites obligatorios de preferencias graduables.
- Explicar la consecuencia de cada respuesta en lenguaje cotidiano.
- Permitir omitir el cuestionario y obtener un perfil equilibrado válido.
- Mantener activas las restricciones críticas que no deben depender de una
  preferencia.
- No utilizar la ausencia de datos como evidencia favorable.
- Pedir consentimiento separado para el aprendizaje adaptativo y dejarlo
  desactivado de manera predeterminada.
- Guardar las respuestas solo en el dispositivo.
- No guardar nombre, diagnóstico, direcciones, coordenadas, audio ni trazas GPS
  como parte del perfil.
- Permitir revisar el cuestionario sin volver a escribir origen y destino.
- Mantener cada pregunta en una pantalla independiente y con controles
  recorribles mediante TalkBack y teclado.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Preguntar el grado o tipo de discapacidad | Cuestionario corto | Una etiqueta no determina las necesidades de movilidad y puede producir inferencias injustificadas | Descartada |
| Preguntar si se usa bastón, perro guía o una ayuda concreta | Aporta contexto | No permite deducir de forma fiable qué ruta prefiere la persona y recoge información innecesaria | Descartada |
| Ofrecer dos perfiles cerrados | Muy rápido | Oculta diferencias relevantes y limita la personalización | Se conserva solo como demostración cuando no existe perfil |
| Pedir números o porcentajes para cada factor | Gran precisión aparente | Exige comprender el modelo y genera una carga innecesaria | Descartada |
| Usar cuatro niveles verbales: ninguna, baja, media y alta | Comprensible, breve y traducible a pesos | La escala es ordinal, no una medición clínica | Adoptada |
| Tratar todas las respuestas como pesos | Implementación simple | Una ruta incompatible podría seguir apareciendo si compensa en otros factores | Descartada |
| Separar restricciones y pesos | Impide compensar barreras críticas y conserva preferencias flexibles | Requiere explicar dos comportamientos | Adoptada |
| Activar el aprendizaje por defecto | Produce personalización antes | No existe consentimiento explícito y puede empeorar un perfil inicial ya preciso | Descartada |
| Guardar el perfil en un servidor | Facilita sincronización entre dispositivos | Aumenta la exposición de datos y no es necesaria para el MVP | Descartada |
| Guardarlo en SQLite local | Funciona sin cuenta y minimiza datos | No se sincroniza entre dispositivos | Adoptada |

## Decisión adoptada

### Estructura del cuestionario

El flujo contiene catorce preguntas. Las dos primeras fijan el tratamiento de
los escalones y el desvío máximo; las ocho siguientes expresan prioridades del
ranking; y las cuatro últimas configuran la voz, la presentación y el
consentimiento del aprendizaje.

| N.º | Pregunta resumida | Efecto real |
| ---: | --- | --- |
| 1 | Tratamiento de escalones confirmados | «Excluir» activa `avoid_steps`; «dar menos prioridad» aplica un coste alto sin excluir; «solo informar» deja el peso de escalones a cero, aunque conserva el aviso |
| 2 | Recorrido adicional aceptable | Fija un límite de 1,10, 1,25, 1,50 o 2,00 veces la distancia de referencia |
| 3 | Recorrer la menor distancia | Peso de `distance` |
| 4 | Evitar cruces numerosos o complejos | Peso de `complex_crossings` |
| 5 | Preferir ayudas confirmadas en cruces | Peso de `crossing_support` |
| 6 | Preferir aceras y acceso bien documentados | Peso de `sidewalk_evidence` |
| 7 | Preferir información sobre superficie | Peso de `surface` |
| 8 | Preferir menos giros y cambios de dirección | Peso de `orientation_complexity` |
| 9 | Evitar pendientes pronunciadas | Peso de `slope` |
| 10 | Evitar alternativas con datos desconocidos | Peso de `uncertainty` |
| 11 | Uso de la voz propia de Rumbo | Lectura automática, lectura al pulsar «Escuchar» o voz desactivada |
| 12 | Velocidad de la voz propia | 0,8; 1,0; 1,25 o 1,5. Se omite si TalkBack está activo o si se desactiva la voz propia |
| 13 | Presentación visual | Conserva la preferencia por ajustes del sistema, texto mayor, contraste reforzado o ambos; nunca influye en el ranking |
| 14 | Aprendizaje de elecciones | Consentimiento explícito para el modelo adaptativo local; comienza desactivado |

Las preguntas de cruce se justifican porque la literatura documenta dificultades
específicas en intersecciones complejas y la utilidad de señales peatonales
accesibles. Las preguntas sobre distancia, complejidad, aceras, superficie,
pendiente y referencias cartográficas proceden de trabajos de planificación de
rutas adaptadas que muestran que la ruta más corta no siempre es la más
adecuada. La presentación y el audio se consultan por separado: son ajustes de
interfaz, no propiedades de movilidad ni señales de aprendizaje.

### Traducción de las prioridades

Los cuatro niveles verbales se transforman en una escala ordinal sencilla:

| Respuesta | Valor inicial |
| --- | ---: |
| No es una prioridad | 0 |
| Prioridad baja | 1 |
| Prioridad media | 2 |
| Prioridad alta | 3 |

Estos números no son porcentajes. Antes de calcular una puntuación, el sistema
los normaliza dividiendo cada valor entre la suma total. Por ejemplo, si solo se
marcan dos prioridades con valores 3 y 1, sus pesos normalizados son 0,75 y
0,25. Si todas las prioridades quedan a cero y los escalones se dejan solo como
aviso, la aplicación recupera automáticamente nueve pesos iguales. De esta
forma, nunca envía al backend un perfil matemáticamente inválido.

### Restricciones que no son negociables

El perfil mantiene siempre `require_pedestrian_access=true` y
`avoid_incompatible_crossings=true`. Una ruta que incumpla esas condiciones se
descarta antes de puntuar y antes de aprender. Los escalones también se
convierten en restricción si la persona responde «Excluir siempre». El
aprendizaje solo puede reordenar las rutas que hayan superado este filtro.

### Relación con el aprendizaje

Si el consentimiento está desactivado, el ranking utiliza únicamente las
preferencias declaradas. Si está activado, las tres primeras elecciones son de
observación y después los pesos efectivos mezclan gradualmente las preferencias
declaradas con las aprendidas. La influencia aprendida está limitada y nunca
modifica restricciones críticas ni convierte la incertidumbre en una ventaja.
Si se edita el cuestionario y cambian los pesos declarados, un estado aprendido
incompatible se descarta y vuelve a partir del nuevo perfil.

## Datos de entrada y salida

### Entrada

- Una respuesta cerrada por pregunta.
- Estado del lector de pantalla para decidir si se pregunta por la velocidad de
  la voz propia.
- Consentimiento explícito, separado del resto del perfil.

### Salida

- `MobilityProfile` con restricciones, desvío máximo y nueve pesos declarados.
- Preferencias locales de voz y presentación.
- Indicador local de consentimiento para el aprendizaje adaptativo.
- Estado persistido `onboarding:v1:answers`, versionado para poder rechazar
  datos antiguos o incompletos sin bloquear la aplicación.

## Flujo de uso e integración

```text
Respuestas del cuestionario
        ↓
Validación y guardado local
        ↓
Restricciones críticas ──→ descarte previo de rutas incompatibles
        ↓
Pesos declarados 0–3 ──→ normalización ──→ clasificación explicable
        ↓                                      ↓
Consentimiento opcional ──→ aprendizaje ──→ pesos efectivos graduales
                                               ↓
                                  alternativas válidas ordenadas
```

Al reiniciar la aplicación se recupera el perfil local y no se repite el
cuestionario. «Editar mis preferencias» permite abrirlo de nuevo conservando
las respuestas. Si se omite, se guarda el perfil equilibrado para que la
omisión también sea una decisión estable y no reaparezca en cada arranque.

## Implementación

- `app/src/features/onboarding/questions.ts`: define las catorce preguntas y su
  orden.
- `app/src/features/onboarding/answers.ts`: tipos, valores iniciales y
  traducción a perfil y voz.
- `app/src/features/onboarding/storage.ts`: validación y persistencia local.
- `app/src/features/onboarding/useOnboarding.ts`: avance, retroceso y omisión
  de preguntas no aplicables.
- `app/src/screens/OnboardingIntroScreen.tsx` y
  `OnboardingQuestionScreen.tsx`: pantallas accesibles.
- `app/src/features/route-comparison/useRouteComparison.ts`: envía el perfil
  configurado al backend.
- `app/src/screens/RouteComparisonScreen.tsx`: utiliza el mismo perfil para el
  ranking fijo y para el aprendizaje, y sincroniza el consentimiento.
- `app/src/app/index.tsx`: carga, guarda y permite editar el perfil.

La preferencia visual se guarda junto al perfil para no volver a preguntarla.
La interfaz ya respeta el escalado de texto del sistema y utiliza una paleta que
cumple WCAG 2.2 AA. La aplicación específica de los modos adicionales «texto
más grande» y «contraste reforzado» queda separada del ranking y debe validarse
visualmente antes de considerarse cerrada.

## Pruebas

- Existencia de las catorce preguntas y orden estable.
- Primera pantalla, progreso, selección y navegación accesibles.
- Omisión de la velocidad cuando TalkBack está activo o la voz está desactivada.
- Traducción exacta de prioridades a 0, 1, 2 y 3.
- Traducción de escalones y desvío a restricciones.
- Recuperación equilibrada si todos los pesos son cero.
- Conversión de las respuestas de voz.
- Guardado y carga completos sin coordenadas, direcciones, audio ni GPS.
- Rechazo seguro de un estado local incompleto.
- Envío del perfil configurado en lugar del perfil de demostración.
- Separación de pesos declarados y efectivos.
- Sincronización en ambos sentidos del consentimiento del aprendizaje.

## Resultados

La implementación supera la comprobación de tipos, el análisis estático y la
suite automatizada de la aplicación. Las pruebas verifican que el perfil enviado
al backend conserva las restricciones críticas y que cada nivel verbal produce
el valor previsto. La evaluación con participantes ciegos o con baja visión
sigue pendiente; por tanto, no se afirma que las preguntas sean definitivas ni
que su redacción esté validada con población usuaria.

## Riesgos y limitaciones

- La escala 0–3 expresa orden e importancia relativa, no una medida clínica.
- Preguntar muchos factores mejora la trazabilidad, pero añade carga inicial.
  Se mitiga con una pregunta por pantalla, opciones preseleccionadas y omisión
  completa.
- El máximo de pendiente no se pregunta como restricción porque todavía no se
  dispone de una forma comprensible y validada de expresarlo; la pendiente se
  utiliza como prioridad y se muestra con incertidumbre cuando falta evidencia.
- No se pregunta por bastón, perro guía, diagnóstico o teclado: el sistema no
  necesita esos datos para puntuar y no debe inferir necesidades a partir de
  ellos.
- La calidad de las respuestas puede variar. El aprendizaje es opcional porque
  los experimentos muestran que ayuda cuando el perfil inicial es impreciso,
  pero puede perjudicar si ya representa muy bien a la persona.
- La preferencia visual explícita necesita una validación manual posterior; no
  afecta a la seguridad ni al ranking.

## Texto base para la memoria

> La personalización inicial se diseñó como un cuestionario funcional y no como
> una clasificación diagnóstica. Se distinguieron restricciones que descartan
> alternativas antes del cálculo —acceso peatonal, compatibilidad de cruces,
> escalones cuando así se solicita y desvío máximo— de preferencias graduables
> que intervienen en una suma ponderada explicable. Las respuestas verbales se
> tradujeron a una escala ordinal 0–3 y se normalizaron antes del ranking. Este
> diseño permite inspeccionar la contribución de cada criterio y evita que una
> puntuación favorable compense una incompatibilidad crítica. El perfil y el
> consentimiento del aprendizaje se almacenan localmente y no incluyen
> identidad, direcciones ni trazas de ubicación. El aprendizaje permanece
> desactivado por defecto y, cuando se autoriza, solo modifica de manera gradual
> el orden de las alternativas previamente aceptadas.

## Trabajo pendiente

- [ ] Validar comprensión, carga y suficiencia de las preguntas con personas
  ciegas o con baja visión y profesionales de orientación y movilidad.
- [ ] Aplicar y validar visualmente los modos adicionales de texto y contraste.
- [ ] Estudiar si conviene preguntar por referencias auditivas o táctiles cuando
  exista evidencia cartográfica suficientemente fiable para puntuarlas.
- [ ] Incorporar una acción explícita para borrar todo el perfil local desde
  ajustes, además de poder editarlo o restablecer el equilibrado al omitirlo.

## Referencias y evidencias

- Cohen, A. y Dalyot, S. (2021). «Route planning for blind pedestrians using
  OpenStreetMap». *Environment and Planning B: Urban Analytics and City
  Science*, 48(6). <https://doi.org/10.1177/2399808320933907>.
- Kammoun, S., Dramas, F., Oriola, B. y Jouffrais, C. (2010). «Route selection
  algorithm for blind pedestrian». *International Conference on Control,
  Automation and Systems*. <https://doi.org/10.1109/ICCAS.2010.5669846>.
- Barlow, J. M., Bentzen, B. L. y Bond, T. (2005). «Blind Pedestrians and the
  Changing Technology and Geometry of Signalized Intersections: Safety,
  Orientation, and Independence». *Journal of Visual Impairment & Blindness*,
  99(10), 587–598. <https://doi.org/10.1177/0145482X0509901003>.
- Barlow, J. M., Scott, A. C. y Bentzen, B. L. (2009). «Audible Beaconing with
  Accessible Pedestrian Signals». *AER Journal: Research and Practice in Visual
  Impairment and Blindness*, 2(4), 149–158.
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC2901122/>.
- El-Taher, F. E.-Z., Taha, A., Courtney, J. y Mckeever, S. (2021). «A
  Systematic Review of Urban Navigation Systems for Visually Impaired People».
  *Sensors*, 21(9), 3103.
  <https://doi.org/10.3390/s21093103>.
- Amershi, S. y otros (2019). «Guidelines for Human-AI Interaction». *CHI 2019*,
  artículo 3, 1–13. <https://doi.org/10.1145/3290605.3300233>.
- W3C (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*.
  <https://www.w3.org/TR/WCAG22/>.
- Pruebas: `app/__tests__/onboarding.test.tsx` y
  `app/__tests__/useRouteComparison.test.ts`.

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado los anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
