# Guion de la memoria y mapa de fuentes

Estado: `En implementación`  
Última actualización: 17 de agosto de 2026.

## Regla de trabajo

Los capítulos de esta carpeta integran las fuentes técnicas, pero no las
sustituyen. Durante el desarrollo se añaden argumentos, resultados y enlaces.
La redacción final se consolida cuando la funcionalidad correspondiente está
validada.

## Estructura propuesta

1. Introducción y motivación.
2. Estado del arte y contexto tecnológico.
3. Metodología y diseño de la investigación.
4. Diseño y arquitectura del sistema.
5. Implementación del MVP.
6. Evaluación y resultados.
7. Conclusiones y trabajo futuro.

El índice definitivo debe adaptarse a la plantilla oficial de la universidad.

## Mapa de fuentes por capítulo

| Capítulo | Fuentes principales |
| --- | --- |
| Introducción | `product/alcance-mvp.md`, `accessibility-spec.md` |
| Estado del arte | `research/fuentes-ors-osm-mapillary.md`, `research/aprendizaje-adaptativo.md`, `ai-strategy.md` |
| Metodología | `research/seleccion-area-piloto.md`, `research/modelo-dominio-accesibilidad.md`, `evaluation/plan-evaluacion.md` |
| Diseño | `architecture.md`, `safety.md`, documentos de `product/` |
| Implementación | `journal.md`, `operations/`, código y pruebas |
| Evaluación | `evaluation/calibracion-aprendizaje-adaptativo.md` y demás documentos de `evaluation/` |
| Conclusiones | resultados, limitaciones y journal de decisiones |

## Contribución académica que debe mantenerse visible

El TFM propone un sistema híbrido de IA explicable:

1. Reglas simbólicas de seguridad e incertidumbre.
2. Clasificación multicriterio personalizada (*ranking*).
3. Aprendizaje en línea por pares (*pairwise*) de preferencias graduables.
4. Explicaciones derivadas de características verificables.

ORS, GPS, rerouting, TalkBack y TTS son componentes necesarios del producto,
pero no se presentarán como aportaciones propias de IA.

## Evidencias que faltan

- Resultados cuantitativos de la puntuación.
- Comparación de sistemas de referencia.
- Integración móvil y evaluación con usuarios del aprendizaje adaptativo; la
  evaluación sintética `EXP-002` ya está completada.
- Sensibilidad de pesos y umbrales.
- Pruebas de usabilidad con TalkBack y personas de la población objetivo; la
  validación funcional en emulador ya está completada.
- Rerouting físico; la prueba simulada ya está completada.
- Capturas y figuras finales.
- Referencias académicas revisadas.
