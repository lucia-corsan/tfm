# 4. Diseño del sistema

Estado: `En implementación`  
Última actualización: 14 de agosto de 2026.

## Arquitectura

Aplicación Expo accesible, API FastAPI, proveedor intercambiable de rutas,
enriquecimiento OSM, puntuación, narración y aprendizaje local.

La frontera entre generación y evaluación es explícita. El cliente asíncrono de
ORS produce rutas base validadas y cacheables, pero no objetos puntuables. El
enriquecimiento OSM debe completar la representación de evidencia antes de que
el sistema aplique restricciones o calcule adecuación, confianza e
incertidumbre.

El enriquecimiento real proyecta las geometrías a `EPSG:25830`, consulta un
índice espacial y asocia evidencia dentro de un corredor general de 5 m. Las
restricciones críticas no dependen de ese único umbral: una barrera debe estar
a un máximo de 0,5 m y, si es lineal, mantener al menos 3 m de alineación. La
separación entre contexto general y confirmación crítica protege frente a
objetos de calles paralelas.

El conjunto interno podrá contener más rutas que la respuesta pública. Un
agregador escalonado ampliará la búsqueda cuando las primeras alternativas sean
redundantes o queden descartadas; una fase de deduplicación evitará contar como
diversidad rutas prácticamente iguales. Después del enriquecimiento y las
restricciones, el ranking devolverá como máximo tres opciones para no trasladar
la complejidad interna a la interfaz accesible.

La deduplicación se divide en coincidencia exacta y similitud espacial. Esta
última usa la menor cobertura de ambas líneas para impedir que una ruta corta
contenida en otra larga parezca equivalente. La configuración integrada exige
2 metros de tolerancia, 98 % de solapamiento y menos del 3 % de diferencia de
longitud. Cada descarte conserva la referencia a la primera candidata y las
métricas que justifican la decisión.

## Modelos de dominio

Describir perfil, evidencia, características, incertidumbre, rutas y escenarios.

## Seguridad y privacidad

Datos desconocidos sin beneficio, restricciones fuera del aprendizaje, tokens
en el backend, coordenadas fuera de los registros y confirmación del rerouting.

El recálculo reutiliza la misma cadena de generación, enriquecimiento,
restricciones y clasificación que la comparación inicial. El dispositivo
mantiene en memoria el destino, el perfil y la ruta activa; solo envía la
posición fiable cuando la persona confirma expresamente el recálculo. La ruta
anterior permanece disponible hasta recibir una alternativa válida, por lo que
un fallo de red, una respuesta incorrecta o la ausencia de rutas compatibles no
dejan la navegación sin contexto. Tras un reemplazo se aplica un minuto sin
nuevas alertas para evitar bucles causados por ruido del GPS.

## Accesibilidad

TalkBack, controles de 44 puntos, contraste WCAG 2.2 AA, navegación no
dependiente del mapa y coordinación de TTS.

### Diseño de las instrucciones de navegación

La ruta y su narración se han diseñado como datos relacionados, pero no
intercambiables. Una línea sobre el mapa indica por dónde discurre el recorrido;
una instrucción identifica qué acción debe realizarse en un punto concreto de
esa línea. Cada instrucción incluye orden, maniobra, frase, distancia, duración
y posición. El sistema rechaza secuencias con saltos, retrocesos o puntos que no
pertenecen a la geometría.

Los códigos numéricos de OpenRouteService se traducen en el backend a catorce
maniobras propias. Así, la app no queda ligada a los números de un proveedor y
las rutas sintéticas y reales utilizan el mismo modelo. Las frases se generan
mediante plantillas españolas, por lo que pueden revisarse y probarse sin
depender de texto libre externo.

La interfaz exige una elección explícita antes de navegar y muestra un paso cada
vez. Los controles manuales constituyen una fase intermedia deliberada: permiten
validar secuencia, comprensión y accesibilidad antes de añadir GPS, que introduce
ruido e incertidumbre propios. Los avisos sobre accesibilidad permanecen visibles
y separados de la maniobra para impedir que «gira a la derecha» se interprete
como «este tramo es seguro».

## IA explicable

Separación entre reglas, puntuación, aprendizaje por pares (*pairwise*) y
generación de razones.

## Fuentes internas

- [Arquitectura](../architecture.md).
- [Modelo de dominio](../research/modelo-dominio-accesibilidad.md).
- [Integración de ORS](../research/integracion-openrouteservice.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).
- [Puntuación explicable](../research/scoring-explicable.md).
- [Seguridad](../safety.md).
- [Accesibilidad](../accessibility-spec.md).
