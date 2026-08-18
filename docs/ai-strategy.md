# Estrategia de inteligencia artificial

Estado: `En implementación`
Última actualización: 17 de agosto de 2026.

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
- Aprendizaje en línea por pares: núcleo matemático, límites de seguridad y
  evaluación sintética implementados; persistencia e interfaz móvil pendientes.
- Explicaciones de rutas y narración: estructura determinista, plantillas y
  presentación móvil implementadas. Para el aprendizaje ya existe un registro
  auditable de los cambios, pero todavía falta traducirlo a explicaciones
  comprensibles dentro de la app.

El modelo adaptativo aprende pesos graduables a partir de elecciones explícitas
entre rutas aceptadas. Mantiene separadas las preferencias declaradas, la
estimación aprendida y la mezcla efectiva. Las tres primeras elecciones no
alteran la clasificación y la influencia aprendida nunca supera el 50 %. La
clasificación estática continúa siendo un modo válido y el sistema de referencia
que permite atribuir la mejora específicamente al aprendizaje.

La integración en el flujo de usuario aún no está completada: la API continúa
utilizando las preferencias declaradas mientras se añade la persistencia local
y el envío explícito de los pesos efectivos. Esta distinción evita confundir un
número de laboratorio con una funcionalidad disponible en la app.

## Qué no se presenta como IA propia

- ORS genera rutas, pero no implementa la personalización del TFM.
- GPS y rerouting son funciones deterministas de navegación.
- TalkBack, reconocimiento de voz y TTS son tecnologías auxiliares.
- Mapillary aporta evidencia visual potencial.

No se incorporará un LLM o VLM al MVP sin una pregunta de investigación, un
sistema de referencia (*baseline*) y métricas específicas. Las plantillas deterministas serán la referencia
de narración fiable.

## Evaluación

`EXP-002` compara la ruta más corta, la clasificación estática y la adaptativa
en conjuntos sintéticos no utilizados para entrenar. Con un 10 % de elecciones
inconsistentes, el sistema adaptativo alcanza un 89,0 % de exactitud frente al
78,6 % de los pesos declarados fijos, reduce el arrepentimiento medio de 0,0090
a 0,0024, limita cada actualización del vector aprendido y registra aparte los
saltos efectivos. Es una validación del algoritmo bajo los
supuestos del simulador, no una prueba de eficacia con personas.

La sensibilidad al cuestionario mostró también el límite del método: la
adaptación ayuda cuando la declaración es imprecisa, pero puede empeorar un
perfil inicial ya muy fiel. Por ello no sustituye al modo fijo y debe poder
activarse explícitamente, desactivarse y restablecerse. El núcleo se inicializa
desactivado; el experimento lo activa de forma expresa para medirlo.

La metodología, las fórmulas, los resultados y las amenazas a la validez se
encuentran en [Aprendizaje adaptativo](research/aprendizaje-adaptativo.md) y en
[EXP-002](evaluation/calibracion-aprendizaje-adaptativo.md).
