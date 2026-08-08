# 4. Diseño del sistema

Estado: `En implementación`  
Última actualización: 8 de agosto de 2026.

## Arquitectura

Aplicación Expo accesible, API FastAPI, proveedor intercambiable de rutas,
enriquecimiento OSM, puntuación, narración y aprendizaje local.

## Contratos de dominio

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
- [Puntuación explicable](../research/scoring-explicable.md).
- [Seguridad](../safety.md).
- [Accesibilidad](../accessibility-spec.md).
