# Estrategia de inteligencia artificial

Estado: `En implementación`
Última actualización: 18 de agosto de 2026.

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
- Aprendizaje en línea por pares: núcleo matemático, límites de seguridad,
  evaluación sintética, persistencia SQLite e interfaz móvil implementados y
  validados automáticamente.
- Explicaciones de rutas y narración: estructura determinista, plantillas y
  presentación móvil implementadas. Para el aprendizaje ya existe un registro
  auditable de los cambios y explicaciones móviles comprensibles. La evaluación
  de esas explicaciones con participantes permanece pendiente.

El modelo adaptativo aprende pesos graduables a partir de elecciones explícitas
entre rutas aceptadas. Mantiene separadas las preferencias declaradas, la
estimación aprendida y la mezcla efectiva. Las tres primeras elecciones no
alteran la clasificación y la influencia aprendida nunca supera el 50 %. La
clasificación estática continúa siendo un modo válido y el sistema de referencia
que permite atribuir la mejora específicamente al aprendizaje.

La integración conserva esa separación en el flujo de usuario. La app guarda
localmente lo aprendido y envía `effective_weights` en un campo diferente de
los pesos declarados. El backend usa el perfil original para las restricciones
críticas y la mezcla efectiva solo para ordenar costes graduables. Así, el
resultado del laboratorio se materializa en el prototipo sin permitir que el
modelo cambie una prohibición de seguridad.

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

`EXP-007` evaluó después la configuración congelada sobre costes derivados de
rutas ORS enriquecidas con OSM. En tres pares reservados aptos, los pesos fijos
obtuvieron 100 % de primeras posiciones y el adaptativo descendió a 75 % tras
60 elecciones. Los cuatro perfiles habían producido exactamente la misma
elección en todos los pares de aprendizaje aptos, mientras orientación y
pendiente permanecían constantes. No se observó transferencia porque la señal
real-sintética disponible no distinguía perfiles y el sistema fijo ya sufría un
efecto techo. El resultado se conserva como evidencia de que la IA necesita
datos informativos y no debe activarse automáticamente por el mero hecho de
estar disponible.

Como respuesta, `EXP-008` implementó un diagnóstico separado que no aprende ni
ordena rutas: examina si las elecciones aportan contrastes, comparaciones
distintas, dimensiones variables y direcciones independientes. A partir de
ocho elecciones aceptó el 100 % de los historiales del banco sintético
informativo y rechazó el 100 % de los historiales construidos con el banco real
limitado, incluso después de sesenta repeticiones. Este resultado valida la
capacidad de reconocer esos dos casos contrastados, no una regla universal. El
diagnóstico permanece desacoplado de la activación automática hasta evaluarlo
con más zonas y con una ventana posterior independiente.

La metodología, las fórmulas, los resultados y las amenazas a la validez se
encuentran en [Aprendizaje adaptativo](research/aprendizaje-adaptativo.md), en
[EXP-002](evaluation/calibracion-aprendizaje-adaptativo.md), en la
[integración móvil](research/integracion-aprendizaje-adaptativo-app.md) y en la
[evaluación con costes ORS+OSM](evaluation/evaluacion-aprendizaje-rutas-reales.md).
La respuesta metodológica a la señal limitada se documenta en
[EXP-008](evaluation/diagnostico-capacidad-informativa.md).
