# Generación y diversidad de rutas candidatas

Estado: `En implementación`
Última actualización: 10 de agosto de 2026
Responsabilidad principal: `research`

## Problema que resuelve

El sistema de decisión solo puede recomendar rutas que hayan sido generadas
previamente. Aunque el ranking represente correctamente preferencias,
restricciones e incertidumbre, no puede seleccionar una alternativa mejor si el
proveedor nunca la incluyó entre las candidatas.

La primera integración solicita a OpenRouteService (ORS) hasta tres rutas. Este
número permite validar el flujo real, pero no representa todos los caminos
posibles entre origen y destino. En una red urbana pueden existir muchas
combinaciones y alguna ruta inicialmente omitida podría presentar mejores
condiciones de accesibilidad después del enriquecimiento OSM.

Por tanto, el problema se divide en dos etapas diferentes:

1. **Generación de candidatas:** encontrar un conjunto pequeño pero diverso de
   recorridos razonables.
2. **Filtrado y ranking:** enriquecerlos, aplicar restricciones críticas y
   ordenarlos según el perfil.

El ranking no corrige una falta de diversidad en la primera etapa. Esta
limitación se denomina, en este proyecto, limitación de cobertura del conjunto
de candidatas.

## Requisitos

- No describir las rutas de ORS como «todas las rutas posibles».
- Mantener separadas la generación del proveedor y la decisión propia del TFM.
- Analizar internamente más rutas de las que se muestran en la interfaz cuando
  resulte necesario.
- Mostrar como máximo tres alternativas para evitar sobrecarga visual y
  cognitiva, especialmente durante la navegación con TalkBack.
- Transmitir las restricciones críticas conocidas a todas las consultas ORS.
- No relajar una restricción de seguridad para completar artificialmente tres
  resultados.
- Enriquecer todas las candidatas con la misma versión de OSM y las mismas
  reglas antes de compararlas.
- Eliminar rutas idénticas o casi idénticas para que el número de candidatas no
  exagere la diversidad real.
- Limitar el número de peticiones, la latencia, el consumo de cuota y los
  desvíos excesivos.
- Conservar respuestas en caché para que los experimentos sean reproducibles.
- Evaluar el beneficio de ampliar candidatas frente a su coste técnico.

## Qué representa el número de instrucciones

ORS divide una ruta en segmentos y pasos de navegación. Cada paso contiene
texto, distancia, duración, tipo de maniobra e índices de la geometría a la que
se refiere. Los tipos oficiales distinguen, entre otros, giro a la izquierda o
derecha, giro pronunciado o leve, avance recto, entrada o salida de glorieta,
cambio de sentido, salida y llegada.

El backend conserva dos medidas:

- `instruction_count`: número total de pasos devueltos por ORS, incluidas la
  salida, la llegada y las indicaciones de continuación.
- `turn_count`: número de pasos que requieren una decisión direccional; excluye
  salida, avance recto y llegada.

La prueba real produjo 32, 40 y 29 instrucciones en las tres rutas. Estas cifras
no significan automáticamente que la tercera sea más fácil. Una glorieta puede
representar una sola instrucción y exigir más orientación que varios giros
sencillos; un tramo recto puede incluir cruces complejos; y el modo en que ORS
segmenta las instrucciones no equivale a carga cognitiva observada.

Por ello, instrucciones y giros son indicadores técnicos de complejidad, no
etiquetas de accesibilidad. Se combinarán con cruces, semáforos y demás
evidencias OSM, y su normalización se someterá a análisis de sensibilidad.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Analizar solo las tres rutas de una petición | Menor latencia, cuota y complejidad | Puede omitir una alternativa más adecuada y dejar cero o una ruta tras el filtrado | Se mantiene como sistema de referencia |
| Solicitar muchas variantes en todas las comparaciones | Mayor diversidad potencial | Aumenta siempre coste y latencia, incluso cuando las primeras rutas son suficientes | Descartada para producción |
| Ampliación escalonada cuando faltan candidatas compatibles | Equilibra diversidad y coste | Requiere deduplicación y una segunda fase condicional | Adoptada como objetivo |
| Mostrar todas las rutas generadas | Transparencia total del conjunto | Sobrecarga la interfaz y TalkBack; varias pueden ser redundantes | Descartada |
| Analizar una colección interna y mostrar hasta tres | Permite una búsqueda más amplia sin trasladar su complejidad al usuario | Exige separar claramente conjunto interno y respuesta pública | Adoptada |
| Modelo personalizado de ORS | Podría introducir preferencias durante la generación | Es experimental y no está disponible para perfiles de la API pública de ORS | Fuera del MVP |
| Implementar un motor propio de caminos sobre OSM | Control completo de generación y costes | Cambio de arquitectura y esfuerzo desproporcionado para cuatro semanas | Fuera del MVP |

## Decisión adoptada

Se implementará una estrategia escalonada, con límites configurables:

```text
Consulta ORS inicial: hasta 3 rutas
                 ↓
Eliminación de duplicados
                 ↓
Enriquecimiento OSM y restricciones críticas
                 ↓
¿Hay suficientes alternativas compatibles y diversas?
       ├── sí → ranking y selección final
       └── no → consultas ORS adicionales controladas
                          ↓
                 nueva deduplicación
                          ↓
                 enriquecimiento y restricciones
                          ↓
                 ranking de la colección completa
                          ↓
                 mostrar como máximo 3 rutas
```

La ampliación explorará configuraciones que produzcan recorridos distintos, por
ejemplo otra preferencia de recorrido admitida por ORS y una configuración más
permisiva de diversidad. Los valores definitivos no se fijarán sin un
experimento: variar parámetros sin medir el resultado podría aumentar las
peticiones y devolver rutas repetidas.

El límite inicial propuesto es de ocho candidatas únicas y tres consultas ORS
por comparación. Son valores de diseño pendientes de calibración, no resultados
validados. La aplicación seguirá recibiendo un máximo de tres rutas ordenadas.
Si ninguna supera las restricciones críticas, se informará de que no se ha
encontrado una alternativa compatible; no se rebajarán las reglas de seguridad.
El máximo de tres es una decisión inicial de diseño, no un umbral de usabilidad
ya demostrado, y deberá revisarse en las pruebas accesibles con TalkBack.

### Diversidad y eliminación de duplicados

La primera fase elimina respuestas exactamente iguales mediante una huella
canónica de su geometría. La segunda proyecta las rutas a ETRS89 / UTM zona 30N
y mide simétricamente qué proporción de cada línea queda dentro de un corredor
alrededor de la otra.

La hipótesis inicial de 10 metros, 85 % de solapamiento y 5 % de diferencia de
longitud se descartó después de calibrar 90 configuraciones: tolerancias de 8 y
10 metros produjeron falsos positivos. La regla integrada utiliza 2 metros, 98 %
de solapamiento y 3 % de diferencia máxima de longitud. Obtuvo 100 % sobre diez
casos sintéticos etiquetados y cero falsos positivos, pero este resultado no se
generaliza fuera de dicho banco. La metodología, las 900 predicciones y la
figura se conservan en
[Calibración de la deduplicación espacial](../evaluation/calibracion-deduplicacion-espacial.md).

Ambas fases conservan la primera candidata. Seleccionar en el futuro una ruta
equivalente por su evidencia requeriría enriquecer antes de deduplicar y se
mantiene fuera de este incremento.

### Relación con las restricciones

Las opciones críticas que ORS pueda comprender, como evitar escalones conocidos,
se enviarán desde la primera consulta. Aun así, se aplicarán nuevamente las
restricciones del TFM después del enriquecimiento, porque ORS depende de la
información existente en su propio grafo.

La ampliación nunca deberá generar rutas omitiendo deliberadamente una
restricción declarada. Si una ruta contiene una incompatibilidad confirmada, se
descartará antes del ranking final.

## Justificación

La propuesta mantiene un alcance realista y corrige la principal limitación del
enfoque de tres rutas. Una consulta inicial minimiza latencia y cuota. La
ampliación condicional concentra el coste en los casos donde el filtrado deja
pocas alternativas o donde las geometrías son prácticamente iguales.

Separar colección interna y presentación también responde a accesibilidad de
interfaz. El usuario no necesita explorar ocho opciones redundantes mediante
TalkBack; necesita recibir pocas alternativas diferenciadas, con razones,
confianza e incertidumbre. Analizar más rutas internamente no obliga a mostrar
más resultados.

Metodológicamente, esta separación evita atribuir todo el resultado al ranking.
El desempeño final depende de dos factores: la capacidad de recuperar candidatas
útiles y la capacidad de ordenarlas. Evaluar ambos permite explicar por qué una
recomendación puede fallar incluso si su fórmula es coherente.

## Datos de entrada y salida

### Entrada

- Origen y destino.
- Restricciones críticas y máximo desvío del perfil.
- Configuraciones ORS versionadas.
- Número máximo de consultas y candidatas.
- Umbrales experimentales de duplicación espacial.
- Datos OSM del área piloto con una versión fijada.

### Salida interna

- Colección de rutas base con procedencia y configuración generadora.
- Huella geométrica.
- Relaciones de duplicación o solapamiento.
- Motivo de descarte antes o después del enriquecimiento.
- Coste técnico: peticiones, tiempo y uso o no de caché.

### Salida para la aplicación

- Entre cero y tres rutas compatibles y ordenadas.
- Adecuación, confianza, incertidumbre, razones y avisos.
- Explicación explícita cuando no exista una candidata compatible.

## Implementación

- Ampliar el modelo de petición ORS para identificar la estrategia generadora.
- Crear un agregador que ejecute consultas de forma escalonada.
- [x] Incorporar una huella SHA-256 determinista de la secuencia de coordenadas.
- [x] Implementar deduplicación exacta antes del enriquecimiento.
- [x] Implementar y calibrar la similitud espacial en geometrías métricas.
- Conservar en caché cada consulta por separado, sin credenciales.
- Enriquecer y aplicar restricciones a todas las rutas únicas.
- Ordenar el conjunto final con el mismo scoring explicable.
- Limitar la respuesta pública a tres rutas.

La primera parte ya está integrada en el proveedor ORS. La huella se calcula
sobre las coordenadas validadas, sin redondeo y conservando el sentido del
recorrido. Se mantiene la primera aparición y se registra qué posición duplicada
coincide con ella. Las propiedades de ORS no intervienen: dos respuestas con la
misma geometría representan una sola candidata aunque difieran en su resumen.

La regla exacta es deliberadamente estricta: una ruta invertida, una geometría
con otro vértice o una variación mínima de coordenadas no se fusionan en esa
fase. La comparación espacial posterior sí reconoce cambios pequeños de
muestreo, pero mantiene separadas las divergencias que no cumplen los umbrales
calibrados. El agregador escalonado continúa pendiente; las tres rutas reales
actuales siguen constituyendo el sistema de referencia.

## Plan de evaluación

### Preguntas

1. ¿La ampliación produce más geometrías realmente distintas que una única
   consulta ORS?
2. ¿Aumenta el número de rutas que sobreviven a las restricciones críticas?
3. ¿Reduce los casos sin ninguna alternativa compatible?
4. ¿Mejora la mayor adecuación disponible o reduce su incertidumbre?
5. ¿Qué latencia, peticiones y distancia adicional introduce?
6. ¿Cómo afecta la deduplicación a la diversidad y a la reproducibilidad?
7. ¿Cambia el ranking al sustituir instrucciones totales por giros o al variar
   sus escalas de normalización?

### Sistemas comparados

- **B0 — Tres rutas:** una petición ORS con la configuración actual.
- **B1 — Colección ampliada:** estrategia escalonada, deduplicación y límite
  interno de candidatas.

Ambos sistemas usarán los mismos datos OSM, perfiles, restricciones y fórmula de
ranking. Así se aislará el efecto de la generación de candidatas.

### Conjunto de prueba

Se propone fijar doce pares origen-destino dentro del área piloto, sin datos
personales, que representen diferentes longitudes y condiciones urbanas. Cada
par se evaluará con al menos tres perfiles reproducibles: equilibrado,
prioridad de cruces y prioridad de orientación. Las respuestas ORS quedarán en
caché con su configuración y la fecha o versión de grafo disponible.

### Métricas

- Rutas crudas y rutas únicas por consulta.
- Solapamiento medio y mínimo entre geometrías.
- Número de candidatas compatibles después de restricciones.
- Proporción de casos con cero, una, dos o al menos tres rutas compatibles.
- Mejor adecuación disponible por perfil.
- Incertidumbre de la ruta mejor clasificada.
- Desvío respecto a la ruta más corta.
- Violaciones críticas, cuyo objetivo continúa siendo cero.
- Peticiones externas, latencia en frío y tiempo con caché.
- Sensibilidad a los umbrales de solapamiento, instrucciones y giros.

No se utilizará la tasa de recuperación (*recall*) o exhaustividad como
resultado principal, porque no existe una verdad de referencia que enumere
todas las rutas peatonales razonables. Se hablará de diversidad observada,
disponibilidad de candidatas y cobertura del conjunto generado.

### Hipótesis

- H1: B1 producirá más rutas únicas y menor solapamiento que B0.
- H2: B1 reducirá la frecuencia de comparaciones sin alternativas compatibles.
- H3: al ser un conjunto ampliado, la mejor adecuación disponible no debería
  empeorar si la deduplicación conserva correctamente las rutas relevantes.
- H4: B1 aumentará peticiones y latencia en frío, pero la caché reducirá el coste
  de repeticiones y evaluación.
- H5: ambos sistemas mantendrán cero violaciones críticas porque la ampliación
  no modifica las reglas de seguridad.

### Criterio de adopción

La ampliación se incorporará al flujo principal si aporta rutas únicas, mejora
la disponibilidad tras las restricciones y mantiene una latencia aceptable sin
violaciones críticas. Si solo devuelve duplicados o el coste supera el beneficio,
se conservará la generación inicial y la ampliación quedará como resultado
negativo documentado.

## Resultados

El sistema B0 ya obtuvo tres alternativas para Moncloa–Príncipe Pío. Sus
distancias e instrucciones son diferentes y sus solapamientos por pares con una
tolerancia de 2 metros fueron 23,84 %, 31,25 % y 22,56 %. Ninguna se clasificó
como duplicada. Todavía no se han enriquecido con OSM; B1 y la comparación
sistemática permanecen pendientes.

La deduplicación exacta y la espacial superaron 20 pruebas específicas junto al
proveedor. El barrido produjo 90 filas de métricas, 900 predicciones y un gráfico
comparativo. Los resultados completos están enlazados en la fuente de
calibración.

## Riesgos y limitaciones

- ORS no enumera todos los caminos posibles y limita las alternativas por
  petición.
- Variar parámetros no garantiza nuevas geometrías.
- Una colección mayor puede seguir omitiendo la mejor ruta física.
- La deduplicación espacial todavía puede unir rutas que presentan diferencias
  de accesibilidad dentro de un corredor de 2 metros.
- El 100 % del banco sintético no estima la exactitud general en rutas reales.
- Las métricas dependen de la versión del grafo ORS y de OSM.
- La preferencia más corta puede generar caminos menos convenientes; solo se
  tratará como candidata y deberá superar el mismo enriquecimiento y reglas.
- La evaluación en doce pares de una sola área no permite generalizar a toda
  Madrid.
- El límite de tres alternativas visibles busca reducir carga cognitiva, pero
  todavía requiere validación de usabilidad con la interfaz accesible.
- Instrucciones y giros son aproximaciones técnicas, no medidas clínicas de
  carga cognitiva.
- Los modelos personalizados no están disponibles en la API pública de ORS;
  implementar un motor propio queda fuera del MVP.

## Qué demuestra en el TFM

Esta ampliación no se presenta como una nueva técnica de inteligencia
artificial. Demuestra una arquitectura de decisión en dos etapas y una
evaluación rigurosa de su espacio de entrada:

- Se diferencia entre recuperar alternativas y ordenarlas.
- Se identifica un límite que podría sesgar cualquier ranking posterior.
- Se evita afirmar que tres rutas representan todas las posibilidades.
- Se mide el beneficio de una colección mayor frente a latencia y cuota.
- Se preservan las restricciones de seguridad durante toda la búsqueda.
- Se mantiene una interfaz comprensible mostrando solo las mejores alternativas.
- Se proporciona un conjunto más informativo sobre el que evaluar el ranking
  estático y el aprendizaje adaptativo, que sí forman parte de la contribución
  de IA.

## Texto base para la memoria

La recomendación se formuló como un proceso en dos etapas: generación de
candidatas y ranking personalizado. La API pública de ORS devuelve un conjunto
limitado de alternativas y, por tanto, una única petición no representa todos
los caminos posibles. Esta limitación es relevante porque el modelo solo puede
seleccionar rutas presentes en su conjunto de entrada. Se diseñó una estrategia
escalonada que comienza con una consulta de bajo coste y amplía la colección
cuando el enriquecimiento y las restricciones dejan pocas alternativas. Las
rutas se deduplican, se caracterizan con la misma instantánea OSM y se someten a
las mismas reglas de seguridad; únicamente las tres mejor clasificadas se
presentan al usuario. La comparación experimental entre una petición y la
colección ampliada medirá diversidad geométrica, disponibilidad tras el
filtrado, adecuación, incertidumbre, latencia y número de llamadas. De este modo,
el trabajo no atribuye al ranking fallos originados por una generación limitada
ni afirma una búsqueda exhaustiva sin disponer de una verdad de referencia.

## Trabajo pendiente

- [ ] Verificar las configuraciones adicionales en la API pública de ORS.
- [ ] Implementar el agregador escalonado con límites configurables.
- [x] Implementar y probar la deduplicación exacta.
- [x] Definir, calibrar y probar similitud espacial en un sistema métrico.
- [ ] Ampliar la calibración con pares reales revisados.
- [ ] Preparar doce pares origen-destino reproducibles.
- [ ] Ejecutar B0 y B1 con tres perfiles.
- [ ] Realizar análisis de sensibilidad de solapamiento e instrucciones.
- [ ] Adoptar o descartar la ampliación según los resultados.

## Referencias y evidencias

- [Peticiones y respuestas de ORS](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types).
- [Tipos de instrucciones de ORS](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/instruction-types).
- [Límite de alternativas por petición](https://giscience.github.io/openrouteservice/run-instance/configuration/endpoints/routing).
- [Disponibilidad de modelos personalizados](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/custom-models).
- [Integración de ORS](integracion-openrouteservice.md).
- Experimento planificado `EXP-005` en `docs/evaluation/experimentos.md`.

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
