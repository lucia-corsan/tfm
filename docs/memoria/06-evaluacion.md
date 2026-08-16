# 6. Evaluación y resultados

Estado: `En implementación`
Última actualización: 16 de agosto de 2026.

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

La sensibilidad del enriquecimiento comparó corredores OSM de 5, 10, 15 y
20 m. El valor de 5 m asoció 418 elementos y mantuvo coberturas de acera entre
el 62,8 % y el 73,7 %. Ampliar a 10 m incorporó un 27,3 % más de elementos,
pero solo elevó la confianza media en 1,8 puntos porcentuales y cambió el primer
puesto. Se seleccionó 5 m de forma conservadora. El resultado es una
calibración técnica local y todavía requiere inspección manual; no demuestra
accesibilidad ni exactitud general.

La detección de desviaciones se evaluó con trece secuencias GPS sintéticas
preetiquetadas y umbrales de 20, 30 y 40 m. Se empleó el mismo código que usa la
aplicación y se mantuvieron constantes la precisión máxima de 25 m, las tres
muestras y los diez segundos. Los 30 m obtuvieron 92,3 % de exactitud y un F1
de 90,9 %, sin falsas alertas y con una de seis desviaciones omitida. Con 20 m
se detectaron todas, pero aparecieron dos falsas alertas; con 40 m se omitieron
dos. Se mantuvo 30 m como compromiso inicial.

## Amenazas a la validez

Cobertura geográfica limitada, datos incompletos, perfiles sintéticos y pruebas
físicas acotadas. Las etiquetas de la calibración espacial son decisiones de
diseño y deberán complementarse con pares reales revisados. Del mismo modo, la
calibración GPS sintética no reproduce cañones urbanos, variación entre
dispositivos ni la frecuencia irregular de muestras físicas.

## Fuentes internas

- [Plan de evaluación](../evaluation/plan-evaluacion.md).
- [Experimentos](../evaluation/experimentos.md).
- [Resultados](../evaluation/resultados.md).
- [Limitaciones](../evaluation/limitaciones.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).
- [Calibración del detector de desviación](../evaluation/calibracion-detector-desviacion.md).
