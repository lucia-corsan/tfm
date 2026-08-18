# 3. Metodología

Estado: `En implementación`
Última actualización: 18 de agosto de 2026.

## Diseño general

Desarrollo iterativo mediante incrementos funcionales verticales pequeños,
modelos validados, *fixtures* reproducibles y transición posterior a rutas
reales.

## Selección del área piloto

La disponibilidad de atributos OSM y cobertura Mapillary se analizó mediante
una malla en el interior de la M-30. El corredor
Moncloa–Argüelles–Príncipe Pío se seleccionó por cobertura, heterogeneidad
urbana e interés para comparar alternativas.

## Modelado de datos

Perfil con restricciones separadas de preferencias, evidencia favorable,
desfavorable o desconocida y rutas con incertidumbre explícita.

## Diseño experimental

La validación funcional de la clasificación utiliza *fixtures* y rutas reales
almacenadas en caché. El experimento específico del aprendizaje adaptativo
compara la ruta más corta, la clasificación estática y la adaptativa mediante
perfiles y costes sintéticos controlados. La repetición de ese experimento con
costes procedentes de rutas ORS enriquecidas con OSM se ejecuta por separado
como `EXP-007`. En ella las rutas y los atributos son reales, pero las
preferencias y elecciones continúan siendo simuladas; no se presenta como un
estudio con participantes.

### Evaluación específica del aprendizaje

La evaluación del núcleo adaptativo separa la selección de parámetros de la
medición final. La calibración combina 216 configuraciones sobre tres perfiles y
tres semillas. Después se bloquea la configuración y se evalúa con veinte
semillas nuevas, tres niveles de elecciones inconsistentes y un cuarto perfil
que no intervino en la calibración. Cada ejecución mantiene aparte 60
situaciones de aprendizaje y 160 conjuntos nuevos de prueba.

Los tres sistemas reciben exactamente las mismas rutas. La exactitud mide si
coinciden con una preferencia latente conocida y el arrepentimiento cuantifica
cuánto peor es el coste de una elección incorrecta. Se publican tanto resúmenes
como resultados por ejecución, incluidos los casos donde el modelo adaptativo
empeora. Este diseño permite atribuir la diferencia al aprendizaje en el
simulador, aunque no extrapolarla todavía a personas reales.

### Transferencia a costes de rutas reales

Antes de observar resultados se fijaron doce pares origen–destino dentro del
área piloto: ocho destinados al aprendizaje y cuatro reservados. Todos se
solicitaron con el mismo cliente ORS y una caché exclusiva, se enriquecieron con
la misma instantánea OSM y el corredor de cinco metros, y se sometieron a las
mismas restricciones. Solo los pares con al menos dos alternativas aceptadas
podían producir una elección o una métrica.

Se mantuvieron la configuración, los cuatro perfiles latentes, las 60
elecciones, el 10 % de elecciones inconsistentes y las veinte semillas de la
evaluación sintética. Ningún hiperparámetro se volvió a elegir después de ver
las rutas. La división se hizo por pares completos, no repartiendo alternativas
del mismo trayecto entre aprendizaje y evaluación.

La publicación conserva costes derivados, disponibilidad y resultados, pero no
coordenadas, geometrías, calles ni credenciales. Las veinte semillas comparten
las mismas rutas: miden variación de orden y ruido simulado, no veinte muestras
independientes del entorno.

## Reproducibilidad

Entornos fijados, cachés, *fixtures*, pruebas automatizadas y registro de
experimentos y limitaciones.

Las respuestas de ORS se validan antes de almacenarse en una caché privada cuya
clave deriva del cuerpo canónico de la consulta y de una versión explícita de
esquema. Las credenciales no intervienen en dicha clave. Las pruebas del cliente
usan transporte HTTP simulado, de modo que los casos nominales, límites y fallos
externos son repetibles sin conexión ni consumo de cuota.

## Transición de rutas sintéticas a rutas reales

La transición se divide deliberadamente en dos fases. ORS genera rutas base con
geometría, distancia, duración e instrucciones. Después, cada geometría se
enriquece con evidencia OSM del corredor. Solo el resultado enriquecido puede
entrar en las restricciones y en la puntuación. Esta secuencia impide codificar
como cero un atributo que ORS no proporciona y cumple el principio de que la
ausencia de datos no constituye evidencia favorable.

La recomendación se trata además como un sistema en dos etapas: generación de
candidatas y ranking. Una única petición ORS constituye el sistema de referencia
de bajo coste. Se comparará con una estrategia escalonada que amplía y deduplica
la colección cuando las restricciones dejan pocas alternativas. Ambos sistemas
usarán la misma instantánea OSM y los mismos perfiles para aislar el efecto de
la generación.

La diversidad no se calculará contando directamente las respuestas. Primero se
eliminan coincidencias exactas y después se compara el solapamiento simétrico de
las líneas proyectadas a `EPSG:25830`. Los umbrales se fijaron mediante un
barrido reproducible de 90 configuraciones sobre diez pares preetiquetados. La
selección priorizó cero falsos positivos antes que una eliminación más agresiva.

El análisis de densidad y el enriquecimiento utilizan representaciones distintas
de OSM. El primero emplea puntos representativos para comparar zonas; el segundo
necesita la geometría completa de las vías para medir coincidencia y cobertura
sobre una ruta. Por ello se descargó una instantánea independiente y acotada al
corredor piloto mediante `out body geom`. La consulta se identifica mediante
SHA-256, conserva la fecha base de OSM y se valida antes de cualquier uso. Las
etiquetas crudas se transforman inicialmente en indicadores positivos,
negativos o ambiguos, pero el estado final solo se establecerá después de la
asociación espacial y de combinar etiquetas relacionadas.

La asociación se calibró mediante un análisis de sensibilidad con corredores de
5, 10, 15 y 20 m, manteniendo fijas las rutas, los datos y el perfil. Se eligió
5 m porque preservó cobertura longitudinal útil y redujo la incorporación de
elementos próximos que alteraba el orden de las alternativas. Las barreras
críticas se someten a una comprobación geométrica independiente y más estricta.
La cobertura se calcula como unión de intervalos proyectados sobre la ruta para
evitar sumar dos veces tramos cubiertos por varias geometrías OSM.

De 5 a 10 m, los elementos asociados crecieron entre un 26,5 % y un 29,6 % por
ruta y los cruces entre un 25,9 % y un 50,0 %. La confianza media solo aumentó
0,018 y cambió la primera posición. El patrón es compatible con la incorporación
de calles, aceras o ramales vecinos, aunque esa procedencia requiere inspección
manual y no se deduce exclusivamente de los conteos.

Una primera unión geométrica bidimensional produjo disminuciones de cobertura
al ampliar el corredor, resultado contrario a la inclusión entre corredores.
Se sustituyó por intervalos de distancia sobre la propia ruta: los tramos se
proyectan, ordenan y fusionan antes de sumar su longitud. De este modo se evita
el doble conteo y se puede comprobar explícitamente la monotonía.

## Fuentes internas

- [Selección del área piloto](../research/seleccion-area-piloto.md).
- [Modelo de dominio](../research/modelo-dominio-accesibilidad.md).
- [Integración de ORS](../research/integracion-openrouteservice.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Preparación de OSM para rutas](../research/preparacion-osm-para-rutas.md).
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).
- [Plan de evaluación](../evaluation/plan-evaluacion.md).
- [Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md).
- [EXP-002](../evaluation/calibracion-aprendizaje-adaptativo.md).
- [EXP-007 con rutas ORS y OSM](../evaluation/evaluacion-aprendizaje-rutas-reales.md).
- [Entorno](../operations/entorno-desarrollo.md).
