# Calibración de la deduplicación espacial de rutas

Estado: `Validado`
Última actualización: 10 de agosto de 2026
Responsabilidad principal: `evaluation`

## Problema que resuelve

Dos respuestas de ORS pueden recorrer las mismas calles y, sin embargo, tener
un número diferente de vértices o pequeñas variaciones numéricas. La huella
SHA-256 solo detecta secuencias idénticas. Sin una segunda comparación, estas
rutas se contarían como alternativas diferentes y se exageraría la diversidad
del conjunto de candidatas.

El problema contrario es más grave: una tolerancia demasiado amplia puede
fusionar rutas próximas que difieren en una calle, un cruce o una barrera. En
este TFM, eliminar incorrectamente una alternativa constituye un falso positivo
de deduplicación y se considera más perjudicial que conservar una repetición.

## Requisitos

- Medir distancias en metros, no en grados de latitud y longitud.
- Comparar las dos direcciones de cobertura para evitar equivalencias por mera
  inclusión de una ruta corta en otra larga.
- Combinar solapamiento espacial y diferencia relativa de longitud.
- Priorizar configuraciones sin falsos positivos.
- Mantener los casos y parámetros independientes de los resultados.
- Conservar todas las predicciones y no únicamente la configuración ganadora.
- No utilizar coordenadas personales ni recorridos GPS de usuarios.
- No presentar una calibración sintética como validación general en calles
  reales.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Solo SHA-256 | Exacta, rápida y reproducible | No reconoce el mismo trazado con distinto muestreo | Se conserva como primera fase |
| Distancia de Hausdorff | Resume la mayor separación entre geometrías | Un único punto atípico puede dominar el resultado y no mide cuánto trazado se comparte | Descartada como regla principal |
| Cobertura en una sola dirección | Cálculo sencillo | Una ruta corta contenida en otra larga podría parecer equivalente | Descartada |
| Cobertura simétrica mediante corredores | Expresa qué proporción de ambas rutas está próxima | Exige proyección, tolerancias y calibración | Adoptada |
| Umbral fijo de 10 m y 85 % sin experimento | Implementación inmediata | Puede fusionar calles paralelas o desvíos relevantes | Descartada |

## Decisión adoptada

Las coordenadas WGS84 se proyectan a ETRS89 / UTM zona 30N (`EPSG:25830`),
adecuado para expresar en metros las geometrías del área piloto de Madrid.

Para dos líneas `A` y `B`, una tolerancia métrica `t` y longitudes `L_A` y
`L_B`, se calculan:

```text
cobertura_A = longitud(A ∩ buffer(B, t)) / L_A
cobertura_B = longitud(B ∩ buffer(A, t)) / L_B
solapamiento = mínimo(cobertura_A, cobertura_B)
diferencia_longitud = |L_A - L_B| / mínimo(L_A, L_B)
```

El mínimo de ambas coberturas hace simétrica la comparación. Dos rutas se
consideran casi duplicadas únicamente cuando el solapamiento supera su umbral y
la diferencia de longitud permanece por debajo del suyo.

La configuración adoptada para el MVP es:

- Tolerancia espacial: **2 metros**.
- Solapamiento mínimo: **98 %**.
- Diferencia máxima de longitud: **3 %**.

Estos valores son conservadores: buscan eliminar distintas codificaciones del
mismo trazado, no agrupar rutas meramente parecidas. Se conservará la primera
candidata y se registrará la posición de la eliminada y sus métricas.

## Datos de entrada y salida

### Entrada experimental

Se fijaron diez pares equilibrados antes de ejecutar el barrido. Las coordenadas
son sintéticas, están definidas en metros dentro de la zona UTM de Madrid y no
representan desplazamientos de ninguna persona.

| Caso | Etiqueta | Situación representada | Justificación |
| --- | --- | --- | --- |
| P1 | Duplicada | Geometría idéntica | Control positivo básico |
| P2 | Duplicada | Mismo trazado con más vértices | Cambio de muestreo sin cambio de recorrido |
| P3 | Duplicada | Desplazamiento interior menor de 1 m | Variación numérica submétrica |
| P4 | Duplicada | Ruido alterno de hasta 2 m | Límite positivo esperado |
| P5 | Duplicada | Extremos interiores desplazados 2 m | Diferencia menor en la segmentación |
| N1 | Distinta | Recorrido paralelo a 6 m | Posible calle, acera o trazado diferente |
| N2 | Distinta | Desvío localizado en una decisión | Puede contener un cruce relevante |
| N3 | Distinta | Calle alternativa en el tramo central | Ruta topológicamente diferente |
| N4 | Distinta | Ramal diferente en el último quinto | Diferencia pequeña pero potencialmente relevante |
| N5 | Distinta | Recorrido paralelo a 20 m | Alternativa espacial claramente separada |

### Parámetros comparados

- Tolerancia: 1, 2, 3, 5, 8 y 10 metros.
- Solapamiento mínimo: 80 %, 85 %, 90 %, 95 % y 98 %.
- Diferencia máxima de longitud: 3 %, 5 % y 10 %.

Se evaluaron **90 configuraciones** y **900 clasificaciones individuales**. La
selección siguió este orden, definido antes de observar el resultado:

1. Descartar cualquier configuración con falsos positivos.
2. Maximizar exactitud.
3. Maximizar sensibilidad sobre duplicados.
4. Preferir una tolerancia métrica menor.
5. Preferir un solapamiento más estricto.
6. Preferir una diferencia de longitud menor.

### Salidas

- Tabla completa de métricas por configuración.
- Tabla completa de predicciones por caso.
- Configuración seleccionada e integrada en el proveedor ORS.

## Implementación

- `backend/routing/spatial_deduplication.py`: proyección, comparación y
  deduplicación conservadora.
- `backend/routing/evaluate_spatial_deduplication.py`: banco de casos, barrido,
  selección y generación de artefactos.
- `backend/routing/ors_provider.py`: deduplicación exacta seguida de la espacial.
- Shapely realiza operaciones de líneas, corredores e intersecciones.
- pyproj transforma WGS84 a `EPSG:25830`.

Comando reproducible:

```bash
python -m backend.routing.evaluate_spatial_deduplication
```

## Pruebas

Se comprobaron:

- Igualdad con distinto número de vértices.
- Cobertura simétrica frente a una ruta contenida.
- Conservación de un recorrido paralelo fuera de tolerancia.
- Conservación de una divergencia localizada.
- Orden estable y conservación de la primera candidata.
- Rechazo de tolerancias no positivas.
- Presencia de todos los parámetros y casos del barrido.
- Prioridad de cero falsos positivos durante la selección.
- Creación de las dos tablas de resultados.
- Integración con el proveedor ORS.

## Resultados

### Comparación de parámetros

La siguiente tabla resume la exactitud para cada tolerancia y solapamiento. El
resultado fue idéntico con diferencias máximas de longitud del 3 %, 5 % y 10 %;
por tanto, la tabla es aplicable a los tres límites evaluados.

| Tolerancia | 80 % | 85 % | 90 % | 95 % | 98 % |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 m | 90 % · FP 0 · FN 1 | 90 % · FP 0 · FN 1 | 90 % · FP 0 · FN 1 | 90 % · FP 0 · FN 1 | 90 % · FP 0 · FN 1 |
| 2 m | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | **100 % · FP 0 · FN 0** |
| 3 m | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 |
| 5 m | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 | 100 % · FP 0 · FN 0 |
| 8 m | 80 % · FP 2 · FN 0 | 80 % · FP 2 · FN 0 | 90 % · FP 1 · FN 0 | 90 % · FP 1 · FN 0 | 90 % · FP 1 · FN 0 |
| 10 m | 80 % · FP 2 · FN 0 | 80 % · FP 2 · FN 0 | 80 % · FP 2 · FN 0 | 80 % · FP 2 · FN 0 | 80 % · FP 2 · FN 0 |

`FP` significa falso positivo: una ruta distinta eliminada como duplicada.
`FN` significa falso negativo: una repetición que no se eliminó.

La tolerancia de 1 metro no absorbió el caso de ruido de hasta 2 metros. Las
tolerancias de 8 y 10 metros empezaron a fusionar rutas etiquetadas como
distintas. Entre 2, 3 y 5 metros hubo empate en este conjunto; se seleccionaron
2 metros por ser la opción más conservadora. Después se eligieron 98 % de
solapamiento y 3 % de diferencia de longitud por el mismo criterio de desempate.

El umbral de longitud no modificó ninguna clasificación en estos diez casos.
Esto no demuestra que 3 % sea intrínsecamente superior a 5 % o 10 %: únicamente
justifica escoger el valor más restrictivo entre opciones empatadas.

### Comprobación con las tres rutas ORS reales

Se midió además el solapamiento de las tres rutas reales ya almacenadas en la
caché local del corredor Moncloa–Príncipe Pío. Esta comprobación es observacional
y no forma parte de la exactitud, porque no dispone de etiquetas independientes.

| Par | Solapamiento con 2 m | Diferencia de longitud | Decisión |
| --- | ---: | ---: | --- |
| R1–R2 | 23,84 % | 0,67 % | Mantener ambas |
| R1–R3 | 31,25 % | 5,65 % | Mantener ambas |
| R2–R3 | 22,56 % | 4,94 % | Mantener ambas |

El proveedor siguió devolviendo las tres alternativas: 2.715, 2.734 y 2.868
metros. La integración no alteró el resultado real actual.

### Verificación técnica

- Pruebas específicas de las dos fases y el proveedor: 20/20.
- Backend completo: 108/108.
- Aplicación: 26/26; ESLint y TypeScript correctos.
- Ruff: sin incidencias.

## Riesgos y limitaciones

- Diez casos sintéticos son suficientes para probar la mecánica, pero no para
  estimar el error real en toda la red peatonal.
- Las etiquetas representan decisiones de diseño, no valoraciones obtenidas de
  participantes ni revisión experta independiente.
- El 100 % observado no debe interpretarse como exactitud general del 100 %.
- Una diferencia de accesibilidad puede existir incluso dentro de 2 metros, por
  ejemplo entre lados de una calle; el enriquecimiento y una revisión posterior
  deberán vigilar este supuesto.
- La regla es voraz y conserva la primera ruta, por lo que sus grupos pueden
  depender del orden cuando existen cadenas de similitud no transitivas.
- La proyección `EPSG:25830` es apropiada para Madrid, no una configuración
  universal para otras regiones.
- Las rutas invertidas se solapan espacialmente, aunque el proveedor las genera
  para un mismo origen y destino y no debería devolver sentidos opuestos.
- El experimento no evalúa todavía el efecto de deduplicar una colección
  ampliada mediante varias consultas ORS.

Como mitigación, se ha escogido la opción empatada más restrictiva, se conservan
las métricas de cada descarte y se ampliará el banco con rutas reales revisadas
antes de formular conclusiones externas.

## Texto base para la memoria

La diversidad de rutas no se estimó directamente a partir del número de
respuestas del proveedor, ya que una misma geometría puede codificarse con
distinto número de vértices. Tras una primera deduplicación exacta, se implementó
una comparación espacial simétrica en ETRS89 / UTM zona 30N. El solapamiento se
definió como la menor proporción de cada línea contenida en un corredor alrededor
de la otra y se combinó con la diferencia relativa de longitud. Se evaluaron 90
configuraciones sobre diez pares preetiquetados, generando 900 decisiones. La
selección priorizó la ausencia de falsos positivos y escogió 2 metros, 98 % de
solapamiento y 3 % de diferencia de longitud. Esta combinación obtuvo 100 % en
el banco sintético y mantuvo separadas las tres rutas reales del corredor. El
resultado valida técnicamente la regla para el MVP, pero no permite atribuirle
una exactitud general del 100 %; será necesario ampliar los casos reales y
analizar diferencias de accesibilidad próximas.

## Trabajo pendiente

- [ ] Ampliar el banco con pares reales revisados manualmente.
- [ ] Evaluar sensibilidad al orden de llegada de las candidatas.
- [ ] Registrar los descartes durante el experimento B1 de colección ampliada.
- [ ] Revisar si la evidencia OSM aconseja impedir una fusión espacial concreta.

## Referencias y evidencias

- [Resultados completos por parámetros](artifacts/deduplicacion-espacial-parametros.csv).
- [Predicciones completas por caso](artifacts/deduplicacion-espacial-predicciones.csv).
- `backend/routing/spatial_deduplication.py`.
- `backend/routing/evaluate_spatial_deduplication.py`.
- `tests/routing/test_spatial_deduplication.py`.
- `tests/routing/test_spatial_deduplication_evaluation.py`.
- `tests/routing/test_ors_provider.py`.
- [Generación y diversidad de rutas candidatas](../research/generacion-rutas-candidatas.md).

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
