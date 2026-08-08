# Estrategia de inteligencia artificial

## Contribución principal

El TFM propone un sistema híbrido de decisión explicable:

1. Reglas simbólicas para restricciones críticas e incertidumbre.
2. Clasificación multicriterio personalizada (*ranking*).
3. Aprendizaje en línea por pares (*pairwise*) de preferencias graduables.
4. Explicaciones derivadas de las características utilizadas.

Las restricciones críticas permanecerán fuera del aprendizaje. La retroalimentación no
podrá autorizar escalones prohibidos, ocultar falta de evidencia ni eliminar
penalizaciones de seguridad.

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
