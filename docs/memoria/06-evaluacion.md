# 6. Evaluación y resultados

Estado: `En implementación`
Última actualización: 10 de agosto de 2026.

## Preguntas e hipótesis

Importar y condensar las preguntas aprobadas en el plan de evaluación.

Se evaluará por separado si el proveedor recupera una colección suficientemente
diversa y si el ranking ordena correctamente esa colección. Esta separación
evita atribuir al modelo de decisión una ruta mejor que nunca fue generada.

## Sistemas de referencia

- Ruta más corta.
- Clasificación estática.
- Clasificación adaptativa.
- Una petición ORS de hasta tres rutas frente a una colección escalonada y
  deduplicada.

## Conjuntos de datos y perfiles

Documentar *fixtures*, rutas reales, versión de OSM y perfiles sintéticos.

## Métricas

Precisión, arrepentimiento acumulado (*regret*), estabilidad, desvío,
incertidumbre, fidelidad explicativa,
violaciones críticas y comportamiento del rerouting.
Para la generación se añadirán diversidad geométrica, candidatas compatibles,
casos sin ruta, peticiones y latencia. Sin una enumeración completa no se
afirmará una tasa de recuperación (*recall*) exhaustiva.

La deduplicación espacial se evaluó como clasificación binaria mediante
exactitud, precisión, sensibilidad, F1, falsos positivos y falsos negativos. Se
compararon 90 configuraciones sobre diez pares equilibrados, generando 900
predicciones.

## Resultados

La calibración espacial seleccionó 2 metros, 98 % de solapamiento y 3 % de
diferencia de longitud. Alcanzó 100 % en el banco sintético sin falsos positivos
y mantuvo separadas las tres rutas ORS reales. Este resultado valida el
incremento técnico, no una exactitud general del 100 %. Los experimentos de
generación ampliada, scoring real y aprendizaje permanecen pendientes.

## Amenazas a la validez

Cobertura geográfica limitada, datos incompletos, perfiles sintéticos y pruebas
físicas acotadas. Las etiquetas de la calibración espacial son decisiones de
diseño y deberán complementarse con pares reales revisados.

## Fuentes internas

- [Plan de evaluación](../evaluation/plan-evaluacion.md).
- [Experimentos](../evaluation/experimentos.md).
- [Resultados](../evaluation/resultados.md).
- [Limitaciones](../evaluation/limitaciones.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
