# Función de ORS, OSM y Mapillary

Estado: `Vigente`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `research`

## Problema que resuelve

Delimitar qué aporta cada fuente para no atribuir al motor de rutas ni a la
cobertura fotográfica capacidades que pertenecen al sistema propio del TFM.

## Requisitos

- ORS genera geometrías transitables, no la clasificación personalizada final.
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

## Datos de entrada y salida

- ORS: coordenadas → geometría, distancia, duración e instrucciones base.
- OSM: geometría → cruces, aceras, escalones y otros atributos.
- Mapillary: corredor → cobertura de metadatos o imágenes revisables.

## Implementación

El estudio de densidad y la caché exploratoria están completados. La conversión
del conjunto de datos OSM a características por corredor y el proveedor ORS están
pendientes. La explicación histórica extensa permanece en
[el alcance del MVP](../product/alcance-mvp.md#3-qué-es-ors-y-para-qué-se-utiliza).

## Pruebas

- *Fixtures* sin red para el algoritmo.
- Respuestas de ORS almacenadas en caché para la integración.
- Casos con etiquetas ausentes.
- Fallos externos que conservan el último estado válido.

## Resultados

El estudio de disponibilidad permitió elegir el corredor
Moncloa–Argüelles–Príncipe Pío. La evaluación por rutas está pendiente.

## Riesgos y limitaciones

- Cobertura desigual y actualización variable de OSM.
- Mapillary puede estar desactualizado o no cubrir un tramo.
- Las coordenadas enviadas a ORS constituyen datos sensibles de navegación.

## Texto base para la memoria

El sistema separa generación y evaluación de alternativas: ORS calcula
recorridos peatonales, OSM aporta características del entorno y el modelo propio
realiza la personalización explicable. Mapillary actúa como fuente auxiliar de
cobertura, nunca como certificación automática de accesibilidad.

## Trabajo pendiente

- [ ] Implementar proveedor ORS.
- [ ] Construir enriquecimiento OSM por corredor.
- [ ] Definir contribución de cobertura a la confianza.
