# Pies de figura y tabla

Estado: `En implementación`  
Última actualización: 25 de agosto de 2026.

## Convención

Cada pie debe indicar qué muestra, ámbito, fuentes y carácter propio o adaptado.
No debe interpretar más de lo que permite la evidencia.

## FIG-01 — Flujo de selección del área piloto

Flujo metodológico del estudio de disponibilidad de datos para seleccionar el
área piloto. Elaboración propia a partir de datos de OpenStreetMap y metadatos de
Mapillary.

## FIG-02 — Cobertura de datos en el interior de la M-30

Comparación espacial de idoneidad, diversidad temática OSM, densidad de
elementos de accesibilidad y cobertura fotográfica de calles. La cobertura de
datos reduce incertidumbre, pero no demuestra por sí sola la accesibilidad del
entorno. Fuente: OpenStreetMap y Mapillary; elaboración propia.

## FIG-07 — Evolución de la exactitud del aprendizaje adaptativo

Exactitud media al seleccionar la primera ruta en conjuntos sintéticos no
utilizados para actualizar el modelo, según el número de elecciones observadas.
Se comparan ruta más corta, pesos declarados fijos y clasificación adaptativa
con un 10 % de elecciones inconsistentes, cuatro perfiles y veinte semillas.
Las bandas representan intervalos normales aproximados del 95 % calculados
sobre veinte medias agrupadas por semilla; la franja inicial identifica las
tres elecciones de observación. Los
resultados validan el algoritmo bajo el simulador, no su eficacia con personas.
Elaboración propia.

## FIG-08 — Evolución del arrepentimiento acumulado

Suma media de la diferencia entre el coste latente de la ruta seleccionada y el
de la mejor alternativa disponible durante 60 elecciones sintéticas. Se
comparan los mismos sistemas y ejecuciones que en la figura 7. Una pendiente
menor indica decisiones progresivamente menos costosas; la curva no tiene por
qué descender porque la métrica es acumulativa. Elaboración propia.

## FIG-10 — Transferencia del aprendizaje a rutas ORS y OSM

Exactitud media de la primera ruta en tres pares ORS reservados y enriquecidos
con una instantánea OSM fija, según el número de elecciones simuladas sobre
cuatro pares de aprendizaje. Se comparan ruta más corta, pesos declarados fijos
y clasificación adaptativa con cuatro perfiles y veinte semillas que comparten
las mismas rutas. La caída del sistema adaptativo refleja que todos los perfiles
eligieron la misma ruta en los pares de aprendizaje y que el sistema fijo ya
acertaba las primeras posiciones reservadas. No es una evaluación con usuarios
ni demuestra que el aprendizaje empeore en otros conjuntos. Fuente:
OpenRouteService y OpenStreetMap; elaboración propia.

## FIG-11 — Cantidad de elecciones y capacidad informativa

Porcentaje de historiales considerados suficientes según el número de
elecciones observadas. El panel izquierdo usa únicamente un mínimo de ocho
elecciones; el derecho exige además contraste, comparaciones distintas,
dimensiones activas y rango. Se comparan 80 combinaciones perfil–semilla del
banco sintético informativo y 80 del banco ORS y OSM limitado en cada punto.
Las semillas del segundo comparten las mismas cuatro situaciones de aprendizaje
aptas y solo cambian orden y ruido. La figura valida la separación de estos dos
bancos, no la exactitud general del diagnóstico ni la calidad de una ruta.
Fuente: `EXP-002`, OpenRouteService y OpenStreetMap; elaboración propia.

## FIG-12 — Aprendizaje con perfiles del cuestionario completo

Exactitud media de la primera ruta después de sesenta elecciones simuladas. Se
comparan los pesos declarados fijos y la clasificación adaptativa para cuatro
configuraciones completas del cuestionario, veinte semillas y un 10 % de
elecciones inconsistentes. El panel izquierdo usa situaciones sintéticas con
compensaciones en las nueve dimensiones; el derecho conserva las rutas ORS
enriquecidas con OSM de `EXP-007`. «Preferencia fina no expresada» mantiene las
mismas categorías ordinales del formulario, pero introduce diferencias menores
dentro de ellas. La figura muestra una simulación, no resultados con
participantes ni una medida de seguridad o accesibilidad física. Fuente:
OpenRouteService y OpenStreetMap en el panel derecho; elaboración propia.

## Plantilla

### FIG-XX — Título corto

Descripción objetiva. Ámbito y fecha de los datos. Fuente y transformaciones.
Limitación interpretativa relevante. Elaboración propia o adaptación.
