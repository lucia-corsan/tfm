# Selección del área piloto mediante disponibilidad de datos

Estado: `Validado`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `research`  
Notebook reproducible: `notebooks/01_madrid_accessibility_data_density.ipynb`

## Problema que resuelve

El desarrollo y la evaluación inicial del recomendador requieren un ámbito
urbano limitado que combine rutas alternativas, diversidad de situaciones
peatonales y suficiente información para caracterizarlas. Elegir únicamente una
zona conocida o céntrica introduciría una decisión difícil de justificar.

El estudio responde a la pregunta:

> ¿Qué zonas del interior de la M-30 ofrecen suficiente variedad y densidad de
> datos de OpenStreetMap y cobertura visual de Mapillary para desarrollar y
> evaluar el MVP en un área piloto manejable?

La variable estudiada es la **disponibilidad de datos**, no la accesibilidad real
del entorno. Una zona con más registros permite reducir parte de la
incertidumbre del análisis, pero no demuestra que sus calles sean accesibles.

## Requisitos

- Ámbito urbano manejable para el calendario del TFM.
- Comparación espacial mediante unidades regulares.
- Predominio de información estructurada OSM.
- Papel secundario de Mapillary como cobertura visual potencial.
- Densidades calculadas con superficies métricas efectivas.
- Ausencia de etiquetas tratada como falta de evidencia.
- Selección final razonada, no automática a partir del máximo de una fórmula.
- Adquisición reproducible y tolerante a fallos de servicios públicos.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Madrid capital completo | Mayor diversidad territorial | Volumen y heterogeneidad excesivos para el MVP | Descartada |
| Interior de la M-30 | Ámbito urbano central, acotado y comparable | No representa toda la ciudad | Adoptada para exploración |
| Celda con puntuación máxima | Selección automática | Sensible a celdas pequeñas recortadas | Descartada como criterio único |
| Corredor multicelda con núcleo sólido | Combina cobertura y variedad urbana | Exige delimitar después la red real | Adoptada |

## Decisión adoptada

Se selecciona el corredor **Moncloa–Argüelles–Príncipe Pío**. La celda
`z04_02` actúa como núcleo cuantitativo y las celdas contiguas `z05_02` y
`z03_02` amplían el ámbito hacia Moncloa y Príncipe Pío.

La malla es una unidad de comparación de datos, no el límite final de las rutas.
La evaluación operativa utilizará calles, cruces y geometrías de la red peatonal
real dentro de este corredor.

## Justificación

`z04_02` ocupa la cuarta posición entre 74 zonas y conserva una superficie
completa de 1 km². Esto evita parte de la inflación de densidad que puede
producirse en celdas periféricas pequeñas recortadas por la M-30.

La decisión también incorpora criterios cualitativos relevantes para el futuro
recomendador:

- Dos nodos de transporte en los extremos del corredor.
- Calles urbanas, tráfico y cruces de distinta complejidad.
- Cambios de pendiente entre Moncloa, Argüelles y Príncipe Pío.
- Recorridos próximos al Parque del Oeste.
- Varias alternativas plausibles para un mismo desplazamiento.

Esta heterogeneidad permite estudiar compromisos entre distancia, cruces,
orientación, pendiente, escalones e incertidumbre. La selección no afirma que el
corredor sea accesible de forma absoluta.

## Datos de entrada y salida

### Fuentes de entrada

- Polígono del interior de la M-30.
- Diez grupos de atributos de OpenStreetMap consultados con Overpass.
- Metadatos geográficos de imágenes Mapillary.

Los grupos OSM analizados son cruces, semáforos, señales acústicas o
vibratorias, pavimento táctil, bordillos, aceras, rampas o accesibilidad para
silla de ruedas, escaleras, superficies y pendientes declaradas.

Mapillary aporta identificador, fecha y posición de captura. No se descargó un
corpus masivo de fotografías y su cobertura no se interpretó como evidencia de
accesibilidad.

### Productos obtenidos

- Puntos OSM procesados.
- Metadatos Mapillary procesados.
- Malla con métricas por zona.
- Ranking exploratorio de candidatas.
- Mapas interactivos y estáticos.

Los datos descargados y resultados generados se mantienen fuera de Git por
volumen y reproducibilidad controlada. El notebook y la metodología sí se
versionan.

## Implementación

### Delimitación y sistemas de referencia

El límite se obtiene como polígono, mientras que las APIs se consultan primero
mediante su caja envolvente. Posteriormente se aplica un filtro espacial para
eliminar observaciones situadas fuera del polígono real.

Se utiliza WGS84 (`EPSG:4326`) para APIs y mapas web y ETRS89 / UTM zona 30N
(`EPSG:25830`) para superficies y distancias. No se calculan áreas directamente
en grados.

### Malla

El ámbito se divide en celdas de 1.000 por 1.000 metros, recortadas con el límite
de la M-30. Cada densidad usa como denominador el área efectiva de la celda. Las
celdas de borde pueden tener una superficie inferior a 1 km² y se interpretan
con precaución.

### Adquisición reproducible

Overpass y Mapillary presentaron errores transitorios y límites por volumen. Se
adoptaron identificación responsable del cliente, reintentos acotados, teselado
espacial, subdivisión adaptativa y caché por atributo o tesela. La estrategia
operativa se describe en
[caché y servicios externos](../operations/cache-y-servicios-externos.md).

Las credenciales se cargan desde `.env`, nunca se almacenan en URLs persistidas,
trazas, documentación o commits.

## Métricas y puntuación exploratoria

Para cada celda se calculan conteos, densidades por kilómetro cuadrado, riqueza
de tipos OSM, presencia de grupos críticos y cobertura Mapillary.

La puntuación de idoneidad para seleccionar el piloto es:

```text
pilot_score =
    0,40 × riqueza normalizada de atributos OSM
  + 0,30 × densidad normalizada de elementos OSM
  + 0,20 × densidad normalizada de imágenes Mapillary
  + 0,10 × presencia normalizada de atributos críticos
```

Los grupos críticos de esta fase son cruces, semáforos, pavimento táctil,
señales acústicas y bordillos.

### Justificación del 20 % de Mapillary

El peso es una hipótesis heurística, no un óptimo aprendido. OSM conserva una
contribución máxima del 80 % porque aporta datos estructurados que alimentarán el
modelo. Mapillary recibe un papel minoritario útil para desempatar zonas con
cobertura OSM semejante según su posibilidad de revisión visual.

Una cobertura fotográfica elevada no puede compensar por sí sola una carencia
clara de datos estructurados. La robustez debe comprobarse comparando pesos
Mapillary del 0 %, 10 % y 20 %. Si el corredor elegido dependiera únicamente de
una configuración concreta, la selección requeriría revisión.

Esta fórmula no se reutilizará como índice de adecuación de rutas: responde a
otra pregunta y utiliza otra unidad de análisis.

## Resultados

### Núcleo cuantitativo

| Indicador de `z04_02` | Resultado | Interpretación |
| --- | ---: | --- |
| Posición | 4 de 74 | Aproximadamente percentil 95 |
| `pilot_score` | 0,695 | Superior a la mediana de 0,582 |
| Superficie | 1,000 km² | Celda completa y comparable |
| Tipos OSM presentes | 10 de 10 | Presencia temática, no cobertura completa |
| Grupos críticos presentes | 5 de 5 | Al menos un registro de cada grupo |
| Elementos OSM | 1.339/km² | Superior a la mediana de 1.045/km² |
| Imágenes Mapillary | 243/km² | Aproximadamente percentil 94 |

La riqueza temática tiene capacidad discriminativa limitada: 58 de las 74
celdas alcanzan el máximo de diez grupos. Por ello, no se utiliza por sí sola
para justificar la selección.

### Comportamiento del corredor

| Sector aproximado | Celda | Posición | Puntuación | OSM/km² | Mapillary/km² |
| --- | --- | ---: | ---: | ---: | ---: |
| Moncloa | `z05_02` | 14 | 0,656 | 2.030 | 115 |
| Área intermedia | `z04_02` | 4 | 0,695 | 1.339 | 243 |
| Príncipe Pío | `z03_02` | 46 | 0,557 | 1.252 | 0 |

El corredor no presenta una cobertura homogénea. El cero de Mapillary en
`z03_02` se interpreta como falta de evidencia visual en la muestra, no como
falta de accesibilidad ni como certeza de ausencia de imágenes.

### Por qué no se eligió automáticamente la primera celda

Varias posiciones superiores corresponden a celdas periféricas recortadas, con
superficies efectivas de 0,235, 0,459 o 0,312 km². Un número reducido de
observaciones puede producir densidades altas en superficies pequeñas.

Otra celda completa, `z05_04`, alcanza 0,698, solo 0,003 puntos más que
`z04_02`. Por tanto, Moncloa–Argüelles–Príncipe Pío se presenta como una decisión
multicriterio que combina ranking, comparabilidad espacial, relevancia urbana y
utilidad experimental; no como una consecuencia matemática inevitable.

## Pruebas y controles de calidad

- Validación de geometrías y CRS antes de calcular áreas.
- Deduplicación de elementos descargados en teselas contiguas.
- Caché escrita únicamente después de respuestas válidas.
- Distinción entre conteo en caja envolvente y resultado recortado.
- Comprobación de superficies efectivas de celdas candidatas.
- Revisión de rangos, nulos y columnas derivadas antes de puntuar.
- Comparación cualitativa de celdas completas y recortadas.

Queda pendiente ejecutar y documentar formalmente el análisis de sensibilidad
de pesos.

## Retos principales encontrados y soluciones

| Reto metodológico | Solución | Consecuencia para el diseño |
| --- | --- | --- |
| Consultas Overpass demasiado pesadas | Teselado y subdivisión adaptativa | Adquisición reanudable y responsable |
| Límites geográficos de Mapillary | Malla base y subdivisión de zonas densas | Cobertura parcial explícita |
| Fallos tras completar parte de una descarga | Checkpoints y caché incremental | No repetir trabajo válido |
| Diferencias entre caja y límite real | Recorte espacial posterior | Métricas referidas al ámbito correcto |
| Densidades altas en celdas pequeñas | Revisar superficie y no escoger solo el máximo | Selección multicriterio |
| Riesgo de confundir datos con accesibilidad | Lenguaje e incertidumbre explícitos | Evitar conclusiones no respaldadas |

Las incidencias técnicas sanitizadas se conservan en
[el registro operativo](../operations/incidencias.md).

## Propuesta de representación visual del proceso

La figura metodológica debe mostrar:

```text
Interior de la M-30
        ↓
Malla métrica de 1 km
        ↓
OSM estructurado + cobertura Mapillary
        ↓
Descarga con caché y teselado
        ↓
Recorte y agregación por celda
        ↓
Métricas normalizadas
        ↓
Ranking exploratorio y revisión cualitativa
        ↓
Corredor Moncloa–Argüelles–Príncipe Pío
```

La composición y los pies se gestionan en
[el inventario de figuras](../figures/inventario-figuras.md) y
[pies de figura](../figures/pies-de-figura.md).

## Riesgos y limitaciones

- OSM es colaborativo y presenta cobertura desigual.
- Los centros representativos sirven para densidad, no para routing.
- Un elemento puede pertenecer a más de un grupo temático.
- Las densidades de celdas pequeñas son sensibles a pocas observaciones.
- La caché representa una instantánea y requiere fecha y versión.
- Mapillary puede estar incompleto o desactualizado.
- El ranking depende de pesos heurísticos pendientes de sensibilidad.
- La selección se limita al interior de la M-30 y no generaliza a todo Madrid.

## Texto base para la memoria

Como fase previa al recomendador se realizó un estudio exploratorio de
disponibilidad de datos en el interior de la M-30. El ámbito se dividió mediante
una malla métrica de un kilómetro recortada con su límite geográfico. Se
agregaron diez grupos de etiquetas OpenStreetMap relacionadas con accesibilidad
y metadatos Mapillary utilizados únicamente como indicador de cobertura visual.
Las respuestas se cachearon y las consultas más densas se fragmentaron
espacialmente para mejorar reproducibilidad y tolerancia a fallos.

La selección utilizó una puntuación exploratoria con un 80 % de contribución
máxima de información estructurada OSM y un 20 % de cobertura Mapillary. Este
reparto se definió como hipótesis heurística para elegir el piloto, no como un
índice de accesibilidad ni como un óptimo validado. La elección final combinó el
ranking con superficie comparable, variedad urbana y utilidad experimental,
seleccionando el corredor Moncloa–Argüelles–Príncipe Pío con `z04_02` como núcleo
cuantitativo.

## Trabajo pendiente

- [ ] Registrar fecha y versión exactas de cada fuente.
- [ ] Ejecutar sensibilidad con pesos Mapillary de 0 %, 10 % y 20 %.
- [ ] Delimitar el corredor mediante red peatonal o listado de calles.
- [x] Seleccionar doce pares origen–destino y evaluarlos en `EXP-007`.
- [ ] Realizar una revisión manual limitada y documentada.

## Referencias y evidencias

- Notebook `01_madrid_accessibility_data_density.ipynb`.
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API).
- [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL).
- [Documentación de Mapillary](https://www.mapillary.com/developer/api-documentation/).
- Servicio geográfico municipal `M30_FeatureToPolygon`.
