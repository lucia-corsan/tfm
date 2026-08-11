# 4. Diseño del sistema

Estado: `En implementación`  
Última actualización: 10 de agosto de 2026.

## Arquitectura

Aplicación Expo accesible, API FastAPI, proveedor intercambiable de rutas,
enriquecimiento OSM, puntuación, narración y aprendizaje local.

La frontera entre generación y evaluación es explícita. El cliente asíncrono de
ORS produce rutas base validadas y cacheables, pero no objetos puntuables. El
enriquecimiento OSM debe completar la representación de evidencia antes de que
el sistema aplique restricciones o calcule adecuación, confianza e
incertidumbre.

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

## Accesibilidad

TalkBack, controles de 44 puntos, contraste WCAG 2.2 AA, navegación no
dependiente del mapa y coordinación de TTS.

## IA explicable

Separación entre reglas, puntuación, aprendizaje por pares (*pairwise*) y
generación de razones.

## Fuentes internas

- [Arquitectura](../architecture.md).
- [Modelo de dominio](../research/modelo-dominio-accesibilidad.md).
- [Integración de ORS](../research/integracion-openrouteservice.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Puntuación explicable](../research/scoring-explicable.md).
- [Seguridad](../safety.md).
- [Accesibilidad](../accessibility-spec.md).
