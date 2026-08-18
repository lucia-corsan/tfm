# Función de ORS, OSM y Mapillary

Estado: `Vigente`  
Última actualización: 11 de agosto de 2026
Responsabilidad principal: `research`

## Problema que resuelve

Delimitar qué aporta cada fuente para no atribuir al motor de rutas ni a la
cobertura fotográfica capacidades que pertenecen al sistema propio del TFM.

## Requisitos

- ORS genera geometrías transitables, no la clasificación personalizada final.
- Las alternativas de ORS forman un conjunto limitado, no una enumeración de
  todos los caminos posibles.
- OSM enriquece cada corredor con atributos verificables.
- La ausencia de etiquetas permanece desconocida cuando corresponda.
- Mapillary apoya cobertura o revisión, no garantiza accesibilidad.
- Overpass no forma parte del camino crítico de navegación.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Usar solo ORS | Integración rápida | Personalización insuficiente | Descartada |
| ORS + enriquecimiento local | Control y reproducibilidad | Mayor procesamiento | Adoptada |

## Decisión adoptada

ORS propondrá rutas reales. Sus geometrías se cruzarán con un conjunto de datos OSM
precargado del área piloto para construir características. Mapillary se usará
como indicador de evidencia visual disponible y para revisiones limitadas.

## Justificación

La separación permite evaluar la aportación propia: reglas de seguridad,
puntuación personalizada, incertidumbre y aprendizaje adaptativo.

También permite distinguir dos posibles causas de error: que ORS no haya
generado una ruta útil o que el sistema propio haya ordenado incorrectamente
las rutas disponibles. Esta distinción se evaluará comparando el conjunto
inicial con una generación escalonada y deduplicada, sin afirmar una búsqueda
exhaustiva. Véase
[Generación y diversidad de rutas candidatas](generacion-rutas-candidatas.md).

## Datos de entrada y salida

- ORS: coordenadas → geometría, distancia, duración e instrucciones base.
- OSM: geometría → cruces, aceras, escalones y otros atributos.
- Mapillary: corredor → cobertura de metadatos o imágenes revisables.

## Implementación

El estudio de densidad y la caché exploratoria están completados. ORS ya dispone
de modelos validados, cliente asíncrono, caché privada y proveedor interno de
rutas base, según se detalla en
[Integración de OpenRouteService](integracion-openrouteservice.md). OSM dispone
ya de una instantánea validada del área piloto con 3.670 nodos y vías y 16.630
coordenadas completas, según se documenta en
[Preparación de OSM para rutas](preparacion-osm-para-rutas.md). Su exposición en
la comparación permanece bloqueada hasta convertir esa evidencia en
características por corredor. La explicación histórica extensa se conserva en
[el alcance del MVP](../product/alcance-mvp.md#3-qué-es-ors-y-para-qué-se-utiliza).

## Pruebas

- *Fixtures* sin red para el algoritmo.
- Respuestas de ORS almacenadas en caché para la integración.
- Casos con etiquetas ausentes.
- Fallos externos que conservan el último estado válido.

## Resultados

El estudio de disponibilidad permitió elegir el corredor
Moncloa–Argüelles–Príncipe Pío. La generación, el enriquecimiento y la
evaluación `EXP-007` con rutas ORS ya están completados; permanecen pendientes
la ampliación del banco y la evaluación con participantes.

## Riesgos y limitaciones

- Cobertura desigual y actualización variable de OSM.
- Mapillary puede estar desactualizado o no cubrir un tramo.
- El conjunto inicial de ORS puede omitir una alternativa útil antes del
  enriquecimiento y el ranking.
- Las coordenadas enviadas a ORS constituyen datos sensibles de navegación.

## Texto base para la memoria

El sistema separa generación y evaluación de alternativas: ORS calcula
recorridos peatonales, OSM aporta características del entorno y el modelo propio
realiza la personalización explicable. Mapillary actúa como fuente auxiliar de
cobertura, nunca como certificación automática de accesibilidad.

## Trabajo pendiente

- [x] Implementar el proveedor interno de rutas base ORS.
- [x] Preparar la instantánea OSM con geometrías completas.
- [ ] Construir la agregación OSM por corredor.
- [ ] Comparar generación inicial y ampliada con rutas deduplicadas.
- [ ] Definir contribución de cobertura a la confianza.
