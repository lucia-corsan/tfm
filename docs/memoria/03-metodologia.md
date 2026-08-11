# 3. Metodología

Estado: `En implementación`  
Última actualización: 11 de agosto de 2026.

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

Comparación de la ruta más corta, la clasificación estática y la clasificación
adaptativa mediante *fixtures*, perfiles sintéticos y rutas reales almacenadas
en caché.

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

## Fuentes internas

- [Selección del área piloto](../research/seleccion-area-piloto.md).
- [Modelo de dominio](../research/modelo-dominio-accesibilidad.md).
- [Integración de ORS](../research/integracion-openrouteservice.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Preparación de OSM para rutas](../research/preparacion-osm-para-rutas.md).
- [Plan de evaluación](../evaluation/plan-evaluacion.md).
- [Entorno](../operations/entorno-desarrollo.md).
