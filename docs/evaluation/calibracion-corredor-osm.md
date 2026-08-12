# Calibración del corredor de asociación entre rutas y OSM

Estado: `Validado`
Última actualización: 11 de agosto de 2026
Responsabilidad principal: `evaluation`

## Problema que resuelve

OpenRouteService (ORS) devuelve la geometría de cada ruta, mientras que
OpenStreetMap (OSM) contiene elementos próximos como cruces, semáforos, aceras,
pavimento podotáctil, escalones o superficies. Para puntuar una ruta es
necesario decidir qué elementos OSM están suficientemente cerca como para
considerarlos evidencia del recorrido.

Un corredor demasiado estrecho puede perder objetos desplazados por errores de
cartografía. Uno demasiado ancho puede incorporar la acera contraria, una calle
paralela o un cruce que la ruta no utiliza. Este segundo error es especialmente
grave porque podría producir evidencia favorable falsa. Por ello, el ancho no
se eligió únicamente por aumentar la confianza: se realizó un análisis de
sensibilidad con rutas reales del área piloto.

## Requisitos

- Trabajar en metros y no en grados geográficos.
- Asociar cada elemento una sola vez por ruta.
- Conservar la distancia exacta a la geometría para poder auditar la decisión.
- Representar por separado presencia, estado e incertidumbre de los datos.
- No interpretar la mera proximidad como confirmación de una barrera crítica.
- Comparar los mismos datos, rutas y perfil para todos los anchos.
- Generar resultados tabulares reproducibles.
- Mantener fuera del repositorio las coordenadas de las rutas.
- No incluir claves de ORS ni tokens de Mapillary en los resultados.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| 5 m | Limita la contaminación entre calles y aceras próximas | Puede omitir elementos cartografiados con desplazamiento | Seleccionada como valor inicial conservador |
| 10 m | Recupera más objetos y aumenta ligeramente la confianza | Cambia el primer puesto y añade muchos cruces próximos | Evaluada, no seleccionada |
| 15 m | Eleva la cobertura aparente | Mayor riesgo de mezclar infraestructura adyacente | Solo para sensibilidad y diagnóstico |
| 20 m | Recupera el mayor número de objetos | Alto riesgo de atribución espacial incorrecta | Solo para sensibilidad y diagnóstico |
| Un único umbral para todo | Implementación sencilla | No protege frente a barreras próximas pero ajenas | Descartada para hechos críticos |

## Decisión adoptada

Se adopta un corredor general de **5 metros** alrededor de la geometría ORS. El
valor se configura mediante `OSM_ROUTE_CORRIDOR_WIDTH_M` y puede recalibrarse,
pero 5 m es el valor predeterminado del MVP.

La asociación general no confirma por sí sola escalones, acceso peatonal
prohibido ni otras barreras críticas. Para convertir una barrera próxima en un
hecho aplicable a la ruta se exige:

- distancia máxima de **0,5 m** a la línea de la ruta; y
- para vías, al menos **3 m de solapamiento longitudinal**.

Un nodo crítico puede confirmarse si cumple el primer criterio. Si no existe esa
alineación, el dato permanece desconocido: no se interpreta como favorable ni
se usa para descartar la ruta. Los apoyos de cruce, como semáforos o señales
acústicas, deben además encontrarse a un máximo de 12 m de un cruce
cartografiado para no confundir semáforos de vehículos con apoyos peatonales.

## Justificación

Con 10 m se asociaron 532 elementos únicos, un 27,3 % más que los 418 de 5 m.
Sin embargo, la confianza media solo aumentó de 0,391 a 0,409: 1,8 puntos
porcentuales. El número de cruces atribuidos a cada ruta aumentó entre un 26 % y
un 50 %, y cambió la ruta situada en primer lugar. Este crecimiento mucho más
rápido de los elementos asociados que de la confianza es compatible con la
incorporación de infraestructura adyacente, no necesariamente recorrida.

El corredor de 5 m conserva entre el 62,8 % y el 73,7 % de cobertura de acera y
entre el 94,4 % y el 99,6 % de cobertura de superficie en las tres rutas. Por
tanto, proporciona evidencia útil sin maximizar indiscriminadamente su cantidad.
Como ORS y la instantánea local proceden de datos OSM, sus geometrías suelen
estar razonablemente alineadas; esto permite priorizar un valor estrecho. Esta
conclusión es específica del área piloto y de la instantánea analizada, no un
umbral universal.

## Datos de entrada y salida

### Entrada

- Tres rutas ORS almacenadas en caché entre Moncloa y Príncipe Pío.
- Instantánea OSM con fecha base `2026-08-11T07:12:44Z`.
- Perfil equilibrado idéntico en todas las ejecuciones.
- Anchos de corredor de 5, 10, 15 y 20 m.
- Sistema de referencia métrico ETRS89 / UTM zona 30N (`EPSG:25830`).

### Salida

- Elementos OSM asociados a cada ruta y distancia mínima.
- Conteos de cruces y apoyos declarados.
- Cobertura longitudinal de acera y superficie.
- Estados trivaluados e incertidumbre por dimensión.
- Adecuación, confianza, aceptación y orden de las rutas.
- Dos archivos CSV versionados.

## Implementación

`backend/enrichment/spatial_index.py` proyecta la instantánea y crea un índice
espacial `STRtree`. `backend/enrichment/route_association.py` consulta el índice
con el corredor seleccionado y devuelve coincidencias únicas, ordenadas y
auditables.

`backend/enrichment/route_enrichment.py` clasifica las etiquetas en once
familias temáticas y construye las características de dominio. Las coberturas
lineales no se obtienen sumando longitudes —lo que duplicaría tramos
solapados—, sino proyectando los segmentos cubiertos sobre la ruta, uniendo sus
intervalos y dividiendo su longitud total entre la longitud de la ruta.

El flujo real queda así:

1. ORS genera hasta tres geometrías candidatas.
2. La instantánea OSM se carga y valida localmente.
3. El índice métrico recupera elementos a un máximo de 5 m.
4. Las etiquetas se agregan sin contar dos veces el mismo objeto.
5. Se calculan estado, cobertura e incertidumbre de cada dimensión.
6. Las restricciones críticas se comprueban con la alineación estricta.
7. El mismo sistema de puntuación explicable ordena las rutas aceptadas.

La API utiliza este flujo cuando `ROUTING_PROVIDER=ors`; el proveedor de datos
sintéticos sigue siendo el valor predeterminado para pruebas y demostraciones
sin red.

## Pruebas

Las pruebas automatizadas verifican:

- proyección métrica, consulta espacial y estabilidad del índice;
- unicidad de coincidencias y límites del ancho del corredor;
- agregación de las once familias OSM;
- prioridad de evidencia negativa explícita;
- desconocimiento cuando faltan datos;
- exclusión de semáforos alejados de cruces peatonales;
- no confirmación de escalones o accesos próximos pero paralelos;
- cobertura por unión de intervalos sin doble conteo;
- monotonicidad del número de elementos al aumentar el corredor;
- generación reproducible de los CSV sin incluir tokens;
- respuesta estructurada del endpoint real enriquecido.

Comandos reproducibles:

```bash
source .venv/bin/activate
python -m backend.enrichment.evaluate_corridor_widths
python -m pytest tests/enrichment tests/routing/test_providers.py
```

## Resultados

### Resumen por ancho

| Corredor | Elementos únicos | Rutas aceptadas | Confianza media | Incertidumbre media | Orden |
| ---: | ---: | ---: | ---: | ---: | --- |
| 5 m | 418 | 3 | 0,391 | 0,273 | R1, R2, R3 |
| 10 m | 532 | 3 | 0,409 | 0,273 | R2, R1, R3 |
| 15 m | 649 | 3 | 0,436 | 0,273 | R1, R2, R3 |
| 20 m | 765 | 3 | 0,448 | 0,273 | R2, R1, R3 |

El aumento del ancho no reduce la proporción de dimensiones desconocidas: se
mantiene en 0,273. Sí eleva la confianza porque crece la cobertura de algunas
dimensiones, pero también altera repetidamente el orden. Por ello, la máxima
confianza observada no se interpreta como máxima exactitud.

### Comparación cuantitativa y posible influencia de calles vecinas

La comparación más informativa es el cambio de 5 a 10 m, porque duplica la
distancia máxima de asociación sin modificar las rutas ni la instantánea:

| Ruta | Elementos 5 m | Elementos 10 m | Aumento | Cruces 5 m | Cruces 10 m | Aumento de cruces | Cambio de confianza |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R1 | 189 | 241 | +27,5 % | 32 | 48 | +50,0 % | −0,007 |
| R2 | 257 | 333 | +29,6 % | 49 | 66 | +34,7 % | +0,013 |
| R3 | 196 | 248 | +26,5 % | 27 | 34 | +25,9 % | +0,048 |

Los objetos aumentan de forma parecida en las tres rutas, pero los cruces crecen
mucho más en R1. Simultáneamente, la cobertura de acera aumenta 10,7, 14,4 y
11,5 puntos porcentuales respectivamente, mientras que la cobertura de
superficie apenas cambia. La adecuación disminuye en las tres rutas y R2 pasa a
ocupar el primer puesto. Esto muestra que el ancho no solo modifica una medida
auxiliar: altera el vector de características y puede cambiar la recomendación.

Estos números **no demuestran por sí solos** que los 114 elementos adicionales
pertenezcan a calles vecinas. Sí son compatibles con esa hipótesis: el corredor
más ancho alcanza nodos y líneas que antes quedaban fuera, y el aumento de la
confianza media es pequeño frente al crecimiento de los conteos. Para no
convertir una inferencia en un hecho, la validación posterior deberá revisar una
muestra independiente de objetos y comprobar si se encuentran sobre el
itinerario, en la acera opuesta o en ramales y calles paralelos.

### Incidencia de estabilidad numérica en la unión de tramos

Durante el desarrollo, una primera versión calculó la cobertura mediante la
unión geométrica directa de todas las intersecciones entre la ruta y las vías
OSM ensanchadas. En una ejecución intermedia aparecieron pequeñas disminuciones
de cobertura al aumentar el corredor. El resultado era incompatible con una
propiedad matemática del problema: si un corredor contiene al anterior, la
parte cubierta de una ruta no debería reducirse.

La incidencia se atribuyó al uso de operaciones bidimensionales de unión y
segmentación sobre líneas casi coincidentes. El *buffer*, las intersecciones y
el encaje de vértices pueden producir fragmentos o pequeñas diferencias de
precisión de coma flotante. Por tanto, esa variación no se interpretó como un
resultado empírico ni se conservó en la tabla final.

La solución transforma el problema en una medida unidimensional:

1. Se intersecta cada vía ensanchada con la ruta.
2. Los extremos de cada tramo resultante se proyectan sobre la distancia
   acumulada de la ruta.
3. Cada tramo se representa mediante un intervalo `[inicio, fin]`.
4. Los intervalos se ordenan y se fusionan cuando se solapan.
5. La suma de los intervalos fusionados se divide entre la longitud de la ruta.

Esta representación conserva la posición sobre una única línea de referencia,
evita contar dos veces segmentos coincidentes y hace explícita la monotonía
esperada. Se añadieron pruebas que verifican una cobertura del 60 % cuando dos
vías parcialmente solapadas cubren conjuntamente ese porcentaje —y no la suma
de ambas—, así como que la cobertura no disminuye al pasar de 5 a 10 y 20 m.

### Resultado seleccionado de 5 m

| Ruta | Elementos | Cruces | Cruces con semáforo | Cruces con ayuda acústica | Cruces con pavimento podotáctil | Cobertura de acera | Cobertura de superficie | Puesto |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R1 | 189 | 32 | 18 | 15 | 25 | 62,8 % | 94,4 % | 1 |
| R2 | 257 | 49 | 38 | 22 | 40 | 73,7 % | 98,2 % | 2 |
| R3 | 196 | 27 | 10 | 6 | 11 | 64,2 % | 99,6 % | 3 |

No se confirmó un recuento completo de escalones para ninguna ruta; por tanto,
esa dimensión permanece desconocida y no se presenta como ausencia de
escalones. Las tres alternativas superaron las restricciones del perfil usado
en el experimento.

## Riesgos y limitaciones

- La proximidad no determina con certeza la acera o el lado de la calle usados.
- ORS y la instantánea comparten OSM como fuente de base; la alineación observada
  puede no repetirse en otra zona o fecha.
- Solo se analizaron tres rutas de una pareja origen-destino.
- Los resultados dependen de etiquetas colaborativas incompletas.
- La confianza mide cobertura y consistencia de datos, no seguridad física.
- El análisis carece todavía de una verdad de referencia creada mediante
  inspección de campo o anotación independiente.
- La inspección visual manual de casos limítrofes sigue pendiente.

## Texto base para la memoria

Para vincular las geometrías generadas por OpenRouteService con los atributos
de OpenStreetMap se construyó un índice espacial en ETRS89 / UTM zona 30N y se
evaluaron corredores de 5, 10, 15 y 20 m. El análisis mantuvo constantes las
tres rutas, la instantánea OSM y el perfil de preferencias. Un corredor de 10 m
incorporó un 27,3 % más de elementos que el de 5 m, pero solo incrementó la
confianza media en 1,8 puntos porcentuales y aumentó entre un 26 % y un 50 % los
cruces asociados por ruta. Además, el primer puesto cambió al variar el ancho,
lo que evidenció la sensibilidad del ranking a infraestructura próxima. Se
seleccionó por ello un corredor general conservador de 5 m. Esta asociación no
se utilizó para confirmar automáticamente barreras críticas: los escalones y
las restricciones de acceso exigieron una distancia máxima de 0,5 m y, en las
vías, al menos 3 m de alineación. La cobertura de acera y superficie se calculó
mediante la unión de intervalos sobre la ruta para evitar el doble conteo. La
decisión reduce el riesgo de atribuir a un itinerario elementos de calles
adyacentes, aunque requiere validación manual y no pretende establecer un valor
universal fuera del área piloto.

## Trabajo pendiente

- [ ] Revisar manualmente una muestra de cruces, aceras laterales y barreras
  próximas con una fuente independiente.
- [ ] Contrastar una muestra en campo o con una anotación independiente.
- [ ] Repetir el análisis en más pares origen-destino del área piloto.
- [ ] Recalibrar el corredor si cambia la instantánea OSM o el proveedor de
  geometrías.

## Referencias y evidencias

- `backend/enrichment/spatial_index.py`.
- `backend/enrichment/route_association.py`.
- `backend/enrichment/route_enrichment.py`.
- `backend/enrichment/evaluate_corridor_widths.py`.
- `tests/enrichment/`.
- [Resultados agregados](artifacts/enriquecimiento-corredores-resumen.csv).
- [Resultados por ruta](artifacts/enriquecimiento-corredores-rutas.csv).
- [Preparación de OSM para rutas](../research/preparacion-osm-para-rutas.md).
- [Integración de ORS](../research/integracion-openrouteservice.md).

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
