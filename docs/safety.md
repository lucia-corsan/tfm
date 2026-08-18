# Seguridad y gestión de incertidumbre

## Invariantes

- Un dato desconocido nunca mejora una ruta.
- Una violación crítica confirmada elimina la alternativa.
- El aprendizaje solo modifica preferencias graduables.
- El aprendizaje solo usa elecciones explícitas entre rutas que ya han
  superado las restricciones críticas; si solo queda una alternativa aceptada,
  no existe señal de aprendizaje.
- Los pesos declarados no se sobrescriben: las tres primeras elecciones están
  en observación y la influencia aprendida posterior nunca supera el 50 %.
- El aprendizaje se inicializa desactivado y no influye en una recomendación
  hasta que la persona lo active expresamente.
- Cada actualización se proyecta a pesos no negativos que suman uno y se limita
  el cambio del vector aprendido. El salto efectivo se registra por separado,
  porque también depende del incremento gradual de influencia.
- La comparación usada para aprender se construye desde la lista aceptada que
  superó las restricciones; la integración móvil no debe aceptar costes o
  identificadores reconstruidos fuera de la comparación mostrada.
- La probabilidad logística de una elección no se presenta como confianza en
  los datos, accesibilidad ni seguridad de la ruta.
- Un fallo externo conserva el último estado válido.
- El rerouting requiere confirmación explícita.
- La posición que provoca la alerta no sale del dispositivo si se elige
  «Mantener la ruta actual».
- Una respuesta vacía, inválida o fallida no sustituye la ruta activa.
- El aprendizaje y el rerouting aplican las mismas restricciones críticas; el
  recálculo no crea una excepción de seguridad.
- No se registran tokens, audio ni coordenadas de navegación.
- El estado adaptativo se guarda únicamente en el dispositivo. Contiene costes,
  identificadores técnicos de las alternativas, pesos, día aproximado y
  contador; excluye coordenadas, direcciones, geometrías e instrucciones.
- Un estado adaptativo dañado, incompatible o perteneciente a otra versión se
  descarta y restaura los pesos declarados. El fallo del almacenamiento no
  impide comparar o navegar con el modo fijo.
- Las posiciones GPS se mantienen únicamente en memoria durante la pantalla de
  navegación y se descartan al eliminar el observador.
- El permiso de ubicación no se solicita hasta que la persona activa el GPS
  explícitamente desde la pantalla de navegación.
- Una muestra con precisión peor de 25 m no interviene en el seguimiento; el
  avance automático exige como máximo 15 m de precisión.
- Las consultas de direcciones no se escriben en los logs. El nivel informativo
  de `httpx` se desactiva porque una petición GET puede incluir el texto buscado
  en la URL. También se desactiva el registro informativo de acceso de Uvicorn,
  que de otro modo mostraría los parámetros de consulta recibidos.

## Servicios externos

ORS recibirá coordenadas únicamente cuando sea necesario para calcular una
ruta y, durante una desviación, solo después de confirmarlo. Su servicio de
geocodificación recibirá el texto solo tras una búsqueda
explícita y restringida al área piloto. La caché local utiliza nombres opacos y
permisos privados. Overpass no se consultará en el camino crítico de una
navegación. Los datos OSM del piloto se descargarán y cachearán previamente.

Mapillary no será una fuente de verdad de accesibilidad. La ausencia de imágenes
solo significa ausencia de evidencia visual.

## Mensajes

Los mensajes usarán formulaciones como «no hay información confirmada» o «esta
ruta se ajusta mejor a las preferencias indicadas». Se evitarán promesas como
«ruta segura» o «ruta completamente accesible».
