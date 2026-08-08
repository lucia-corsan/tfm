# Estrategia de inteligencia artificial

Estado: `En implementación`
Última actualización: 8 de agosto de 2026.

## Contribución principal

El TFM propone un sistema híbrido de decisión explicable:

1. Reglas simbólicas para restricciones críticas e incertidumbre.
2. Clasificación multicriterio personalizada (*ranking*).
3. Aprendizaje en línea por pares (*pairwise*) de preferencias graduables.
4. Explicaciones derivadas de las características utilizadas.

Las restricciones críticas permanecerán fuera del aprendizaje. La retroalimentación no
podrá autorizar escalones prohibidos, ocultar falta de evidencia ni eliminar
penalizaciones de seguridad.

## Estado de implementación

- Reglas simbólicas: implementadas y validadas sobre *fixtures*.
- Clasificación multicriterio: implementada con costes normalizados,
  adecuación, confianza, incertidumbre y explicaciones trazables.
- Aprendizaje en línea por pares: pendiente de la fase de adaptación.
- Explicaciones: estructura determinista implementada; plantillas de narración y
  presentación móvil pendientes.

La clasificación actual no aprende todavía de elecciones. Constituye el sistema
de referencia estático y la base segura sobre la que se añadirá el modelo
adaptativo. Esta separación permitirá medir el valor añadido del aprendizaje sin
atribuirle efectos procedentes de las restricciones o de la fórmula base.

## Qué no se presenta como IA propia

- ORS genera rutas, pero no implementa la personalización del TFM.
- GPS y rerouting son funciones deterministas de navegación.
- TalkBack, reconocimiento de voz y TTS son tecnologías auxiliares.
- Mapillary aporta evidencia visual potencial.

No se incorporará un LLM o VLM al MVP sin una pregunta de investigación, un
sistema de referencia (*baseline*) y métricas específicas. Las plantillas deterministas serán la referencia
de narración fiable.

## Evaluación

Se compararán la ruta más corta, la clasificación estática y la clasificación adaptativa. Se medirán
la preferencia recuperada, el arrepentimiento acumulado (*regret*), la estabilidad de los pesos, el desvío, la incertidumbre,
fidelidad de explicaciones y violaciones críticas.
