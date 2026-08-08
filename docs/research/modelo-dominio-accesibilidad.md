# Modelo de dominio para perfiles, rutas, evidencia e incertidumbre

Fecha de la decisión: 8 de agosto de 2026.

## 1. Propósito y alcance

Antes de implementar el algoritmo de recomendación se ha definido un modelo de
dominio común para representar, validar y comunicar los conceptos que intervienen
en la comparación de rutas. Este paso evita que el proveedor de rutas, el scoring,
la API y la aplicación móvil utilicen interpretaciones diferentes de términos
como «preferencia», «evidencia favorable» o «dato desconocido».

El modelo actual no decide todavía cuál es la mejor ruta. Su función es asegurar
que la información que recibirá el sistema de decisión sea explícita, coherente y
trazable:

```text
Perfil de movilidad
        ↓
Rutas candidatas generadas por fixture u ORS
        ↓
Características y evidencia de cada ruta
        ↓
Restricciones críticas
        ↓
Scoring, confianza e incertidumbre
        ↓
Comparación explicable en la aplicación
```

Los contratos se encuentran en `backend/domain/models.py`. Se implementan con
Pydantic v2 porque los mismos objetos se utilizarán en los límites entre módulos
y, posteriormente, en las peticiones y respuestas de FastAPI.

## 2. Validación estricta de los datos

Todos los contratos heredan de un modelo base configurado con
`extra="forbid"`. Por tanto, un campo no documentado provoca un error de
validación en vez de ser ignorado silenciosamente.

También se validan rangos y relaciones internas, entre otras:

- Latitud entre -90 y 90 y longitud entre -180 y 180.
- Distancia y duración estrictamente positivas.
- Porcentajes y coberturas entre cero y uno.
- Pendiente máxima entre cero y el límite técnico inicial del 30 %.
- Al menos dos puntos para formar la geometría de una ruta.
- El número de cruces semaforizados o complejos no puede superar el total.
- El número de giros no puede superar el número de instrucciones.

Esta decisión reduce errores silenciosos al integrar fuentes heterogéneas. Por
ejemplo, una incompatibilidad entre un nombre de campo enviado por la app y el
esperado por el backend se detectará en el límite de entrada, antes de afectar a
una recomendación.

## 3. Separación entre restricciones y preferencias

El perfil de movilidad (`MobilityProfile`) separa dos clases de decisiones que
no deben tener el mismo tratamiento.

### 3.1. Restricciones críticas

Las restricciones pueden descartar una alternativa cuando existe evidencia
confirmada de incumplimiento:

- `avoid_steps`: evitar escalones.
- `require_pedestrian_access`: exigir acceso peatonal.
- `avoid_incompatible_crossings`: evitar cruces incompatibles con el perfil.
- `maximum_slope_percent`: pendiente máxima, cuando la persona defina un límite.
- `maximum_detour_ratio`: máximo recorrido adicional aceptado respecto a la
  referencia más corta.

Los valores iniciales son conservadores: se evitan escalones, falta de acceso
peatonal y cruces incompatibles, mientras que la pendiente máxima permanece sin
definir hasta que el usuario establezca una. Un `maximum_detour_ratio` de 1,5
permite como máximo un recorrido un 50 % más largo que la referencia.

Estas restricciones permanecerán fuera del aprendizaje adaptativo. El modelo de
preferencias no podrá aprender a ignorar escalones prohibidos ni otras
condiciones consideradas críticas.

### 3.2. Preferencias graduables

Los pesos declarados (`PreferenceWeights`) expresan la importancia relativa de:

- Distancia.
- Cruces complejos.
- Evidencia sobre aceras.
- Escalones como coste graduable cuando no actúen como prohibición.
- Complejidad de orientación.
- Pendiente.
- Incertidumbre.

Todos los pesos deben ser no negativos y al menos uno debe ser mayor que cero.
Se normalizarán en la fase de scoring para que sumen uno. Esta normalización no
forma parte del contrato porque el modelo conserva la intención original del
usuario y el scoring es responsable de transformarla en coeficientes de cálculo.

La separación permite distinguir dos efectos:

```text
Restricción crítica → puede eliminar una ruta
Preferencia gradual → modifica su posición relativa
```

Esta distinción también protege el aprendizaje futuro: solo los pesos graduables
podrán actualizarse a partir del feedback.

El `profile_id` es un identificador técnico local. No es necesario almacenar el
nombre real de la persona, direcciones frecuentes ni coordenadas de navegación
para representar sus preferencias.

## 4. Evidencia trivaluada

Cada atributo de accesibilidad utiliza tres estados (`EvidenceState`):

- `favorable`: existe evidencia a favor de la condición analizada.
- `unfavorable`: existe evidencia de una barrera o condición negativa.
- `unknown`: la información disponible no permite determinar el estado.

Se descarta un modelo booleano porque `false` no distingue entre la presencia
confirmada de una barrera y la ausencia de datos. Esta diferencia es crítica al
trabajar con OpenStreetMap: la ausencia de una etiqueta no demuestra la ausencia
física del elemento.

Por ejemplo, para el atributo `step_free`:

```text
favorable   → existe evidencia de ausencia de escalones
unfavorable → se han identificado escalones
unknown     → no se puede confirmar ninguna de las dos situaciones
```

Un estado favorable se refiere únicamente al atributo evaluado. No permite
afirmar que toda la ruta sea «accesible» o «segura».

## 5. Separación entre estado, cobertura y procedencia

`AccessibilityEvidence` contiene cuatro elementos:

- Estado trivaluado.
- `coverage_ratio`: proporción del recorrido respaldada por la evidencia.
- Fuentes utilizadas.
- Nota opcional que explica la limitación o condición observada.

La cobertura no es una probabilidad de que el dato sea verdadero. Expresa qué
parte de la ruta dispone de información suficiente. Si solo existe información
sobre aceras para el 35 % del recorrido, no se extrapola al 65 % restante.

Ejemplo conceptual:

```json
{
  "state": "unknown",
  "coverage_ratio": 0.35,
  "sources": ["osm"],
  "note": "La cobertura de etiquetas de acera es insuficiente."
}
```

Las procedencias previstas son:

- `fixture`: dato sintético para el desarrollo y las pruebas.
- `osm`: atributo derivado de OpenStreetMap.
- `ors`: información de la respuesta de OpenRouteService.
- `mapillary_metadata`: disponibilidad de metadatos o cobertura fotográfica.
- `manual_review`: comprobación manual documentada.

Conservar la procedencia permitirá estimar posteriormente la confianza y
explicar por qué se conoce o desconoce una característica. Mapillary no se
considerará una fuente de verdad automática: sus metadatos indican cobertura y
una eventual revisión visual aporta evidencia limitada, no una garantía.

## 6. Dimensiones iniciales de accesibilidad

El MVP comienza con cinco dimensiones temáticas (`AccessibilityAttribute`):

1. `sidewalk`: evidencia sobre aceras.
2. `step_free`: ausencia o presencia de escalones.
3. `pedestrian_access`: acceso peatonal permitido y conocido.
4. `crossing_compatibility`: adecuación de los cruces al perfil.
5. `slope`: información sobre pendiente.

El conjunto es deliberadamente reducido. Permite implementar, explicar y
evaluar las invariantes de seguridad antes de añadir superficie, pavimento
táctil, señales acústicas, vados u otras características OSM. Ampliar el número
de atributos sin validar primero su significado y cobertura produciría una
apariencia de precisión difícil de justificar.

## 7. Características de una ruta

`RouteFeatures` combina magnitudes numéricas con evidencia temática.

### 7.1. Magnitudes numéricas

- Distancia en metros y duración en segundos.
- Proporción de desvío respecto a la ruta de referencia.
- Número total de cruces.
- Cruces semaforizados y cruces complejos.
- Número de instrucciones y de giros.
- Proporción conocida de aceras, cuando puede calcularse.
- Pendiente máxima, cuando existe evidencia suficiente.

El número de instrucciones y giros se utilizará como aproximación inicial a la
complejidad de orientación. Esta medida se evaluará por separado de la distancia,
porque una ruta corta puede resultar más difícil de seguir.

### 7.2. Evidencia temática

Cada ruta incorpora un objeto `AccessibilityEvidence` para aceras, ausencia de
escalones, acceso peatonal, compatibilidad de cruces y pendiente. Así se evita
que una cifra aislada, como una pendiente máxima, aparezca sin indicar la
cobertura y procedencia que la respaldan.

La característica `sidewalk_coverage_ratio` describe la proporción física del
recorrido para la que se ha identificado una acera. En cambio, el
`coverage_ratio` de la evidencia describe cuánto recorrido ha podido evaluarse.
Si la evidencia disponible es insuficiente, la primera puede ser `null` aunque
la segunda indique que existe información parcial.

## 8. Representación inicial de la incertidumbre

`UncertaintySummary` contiene:

- Lista de atributos desconocidos.
- Limitaciones expresadas en lenguaje comprensible.
- Proporción temática de atributos desconocidos calculada automáticamente.

Para una ruta \(r\), el cálculo inicial es:

```text
U(r) = número de atributos desconocidos / número total de atributos modelados
```

Como inicialmente existen cinco dimensiones:

| Atributos desconocidos | Incertidumbre temática |
| ---: | ---: |
| 0 | 0 % |
| 1 | 20 % |
| 2 | 40 % |
| 5 | 100 % |

El porcentaje no se introduce manualmente; se deriva de la lista para evitar
contradicciones. Además:

- Los atributos desconocidos no pueden repetirse.
- Todo atributo desconocido exige al menos una limitación explicativa.
- La lista debe coincidir exactamente con los objetos de evidencia cuyo estado
  es `unknown`.

Esta última invariante impide ocultar incertidumbre en la respuesta de la API.
Si la pendiente está marcada como desconocida, la ruta no puede declarar una
lista de incertidumbres vacía.

La fórmula actual es una aproximación temática, no la confianza final del
sistema. En la fase de scoring se estudiará una estimación que considere también
la cobertura y calidad de las fuentes. Adecuación, confianza e incertidumbre se
mantendrán como salidas separadas para no presentar una cifra única con un
significado ambiguo.

## 9. Ruta candidata y escenario de comparación

`RouteCandidate` representa una alternativa todavía no puntuada. Incluye:

- Identificador y nombre legible.
- Proveedor de origen (`fixture` u `ors`).
- Papel de la alternativa en la comparación.
- Indicador de dato sintético.
- Geometría WGS84.
- Características.
- Resumen de incertidumbre.

Toda ruta procedente de un fixture debe incluir `is_synthetic=true`. Esta regla
evita confundir escenarios creados para las pruebas con mediciones reales.

Se definen inicialmente tres papeles de comparación:

1. Alternativa equilibrada.
2. Alternativa con menos cruces complejos.
3. Alternativa más sencilla de seguir o más corta.

`RouteScenario` agrupa un origen, un destino y entre una y tres alternativas.
Exige identificadores y categorías únicas. Limitar la presentación a tres rutas
reduce la carga cognitiva y permite que cada opción responda a una diferencia
comprensible, en lugar de mostrar variantes casi idénticas.

ORS no asignará directamente estas categorías. El backend generará candidatos,
aplicará restricciones y scoring y seleccionará después qué alternativa cumple
mejor cada papel.

## 10. Fixture Moncloa–Príncipe Pío

El archivo `backend/routing/fixture_data/moncloa_principe_pio.json` define un
escenario determinista con tres rutas. Las coordenadas sitúan el ejercicio en el
corredor piloto, pero las características son sintéticas y no deben citarse como
observaciones reales.

| Alternativa | Compromiso representado | Incertidumbre inicial |
| --- | --- | ---: |
| Equilibrada | Distancia intermedia y buena cobertura, pero pendiente desfavorable | 0 % |
| Cruces más sencillos | Mayor distancia, menos cruces y pendiente desconocida | 20 % |
| Más sencilla de seguir | Menos instrucciones, pero cruces desfavorables y falta de evidencia sobre aceras y escalones | 40 % |

Los contrastes son intencionados. El fixture no pretende anticipar cuál debe
ganar, sino crear conflictos útiles para verificar el algoritmo:

- La ruta más corta no debe ganar necesariamente.
- Una ruta con información completa puede contener una barrera conocida.
- Una ruta con menos cruces puede implicar mayor distancia e incertidumbre.
- La falta de datos nunca debe convertirse en una ventaja.

El cargador de `backend/routing/fixtures.py` lee el JSON y lo valida como un
`RouteScenario`. Por tanto, un escenario incoherente falla antes de llegar al
scoring.

## 11. Relación con los datos reales

Los fixtures permanecerán en el proyecto incluso después de integrar datos
reales, porque permiten pruebas rápidas, deterministas y sin servicios externos.
La transición prevista es:

```text
ORS genera rutas peatonales reales
        ↓
La geometría se cruza con datos OSM precargados del área piloto
        ↓
Se construyen RouteFeatures y AccessibilityEvidence
        ↓
La cobertura Mapillary apoya la estimación de evidencia disponible
        ↓
El mismo scoring probado con fixtures compara las rutas reales
```

Los datos OSM descargados para el interior de la M-30 se recortarán al corredor
de cada ruta real. La ausencia de una etiqueta se conservará como desconocida
cuando no exista evidencia suficiente. Los metadatos Mapillary se utilizarán
para medir cobertura o seleccionar revisiones limitadas, no para declarar por sí
solos que una ruta es accesible.

## 12. Pruebas implementadas

Las pruebas de `tests/domain/test_models.py` y
`tests/routing/test_fixtures.py` verifican actualmente:

- Rechazo de coordenadas inválidas y campos no documentados.
- Existencia de al menos una preferencia activa.
- Coherencia entre conteos de cruces e instrucciones.
- Imposibilidad de ocultar un atributo desconocido.
- Marcado obligatorio de los fixtures como sintéticos.
- Presencia de tres alternativas distintas.
- Cálculo de incertidumbre del 0 %, 20 % y 40 %.
- Inclusión del porcentaje calculado en el contrato serializado para la app.

Estas pruebas no demuestran todavía que el ranking sea correcto. Construyen la
base para las siguientes pruebas: restricciones críticas, normalización de costes,
`unknown` sin beneficio positivo, confianza, explicaciones y orden esperado para
distintos perfiles.

## 13. Estado actual y limitaciones

El trabajo completado define y valida el dominio, pero todavía no incluye:

- Persistencia del perfil en SQLite.
- Formulario móvil de preferencias.
- Proveedor real de ORS.
- Enriquecimiento de rutas con el dataset OSM.
- Fórmula de adecuación al perfil.
- Estimación final de confianza.
- Aplicación efectiva de restricciones críticas.
- Aprendizaje online de pesos.

Mantener explícita esta frontera evita presentar un contrato de datos como si ya
fuera un sistema de recomendación completo. La siguiente fase implementará las
restricciones y el scoring como funciones puras y demostrará mediante pruebas que
un atributo desconocido nunca mejora una alternativa.

## 14. Síntesis para la memoria

La decisión central consiste en separar la calidad de una alternativa en tres
conceptos: adecuación al perfil, confianza de la evidencia e incertidumbre. El
sistema no deduce accesibilidad a partir de la ausencia de etiquetas, sino que
representa cada atributo como favorable, desfavorable o desconocido, conservando
su cobertura y procedencia. Paralelamente, el perfil distingue restricciones de
seguridad de preferencias graduables; solo estas últimas podrán adaptarse con el
aprendizaje. Esta arquitectura permite construir un ranking personalizado sin
otorgar al componente aprendido capacidad para ocultar incertidumbre o eliminar
condiciones críticas.
