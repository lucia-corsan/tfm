# Pies de figura y tabla

Estado: `En implementación`  
Última actualización: 17 de agosto de 2026.

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

## Plantilla

### FIG-XX — Título corto

Descripción objetiva. Ámbito y fecha de los datos. Fuente y transformaciones.
Limitación interpretativa relevante. Elaboración propia o adaptación.
