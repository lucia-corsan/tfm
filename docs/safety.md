# Seguridad y gestión de incertidumbre

## Invariantes

- Un dato desconocido nunca mejora una ruta.
- Una violación crítica confirmada elimina la alternativa.
- El aprendizaje solo modifica preferencias graduables.
- Un fallo externo conserva el último estado válido.
- El rerouting requiere confirmación explícita.
- No se registran tokens, audio ni coordenadas de navegación.

## Servicios externos

ORS recibirá coordenadas únicamente cuando sea necesario para calcular una
ruta. Overpass no se consultará en el camino crítico de una navegación. Los
datos OSM del piloto se descargarán y cachearán previamente.

Mapillary no será una fuente de verdad de accesibilidad. La ausencia de imágenes
solo significa ausencia de evidencia visual.

## Mensajes

Los mensajes usarán formulaciones como «no hay información confirmada» o «esta
ruta se ajusta mejor a las preferencias indicadas». Se evitarán promesas como
«ruta segura» o «ruta completamente accesible».
