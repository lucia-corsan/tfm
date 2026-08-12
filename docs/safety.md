# Seguridad y gestión de incertidumbre

## Invariantes

- Un dato desconocido nunca mejora una ruta.
- Una violación crítica confirmada elimina la alternativa.
- El aprendizaje solo modifica preferencias graduables.
- Un fallo externo conserva el último estado válido.
- El rerouting requiere confirmación explícita.
- No se registran tokens, audio ni coordenadas de navegación.
- Las consultas de direcciones no se escriben en los logs. El nivel informativo
  de `httpx` se desactiva porque una petición GET puede incluir el texto buscado
  en la URL. También se desactiva el registro informativo de acceso de Uvicorn,
  que de otro modo mostraría los parámetros de consulta recibidos.

## Servicios externos

ORS recibirá coordenadas únicamente cuando sea necesario para calcular una
ruta. Su servicio de geocodificación recibirá el texto solo tras una búsqueda
explícita y restringida al área piloto. La caché local utiliza nombres opacos y
permisos privados. Overpass no se consultará en el camino crítico de una
navegación. Los datos OSM del piloto se descargarán y cachearán previamente.

Mapillary no será una fuente de verdad de accesibilidad. La ausencia de imágenes
solo significa ausencia de evidencia visual.

## Mensajes

Los mensajes usarán formulaciones como «no hay información confirmada» o «esta
ruta se ajusta mejor a las preferencias indicadas». Se evitarán promesas como
«ruta segura» o «ruta completamente accesible».
