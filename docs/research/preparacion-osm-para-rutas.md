# Preparación de OSM para el enriquecimiento de rutas

Estado: `Validado`  
Última actualización: 11 de agosto de 2026  
Responsabilidad principal: `research`

## Problema que resuelve

El estudio inicial de densidad convirtió cada elemento de OpenStreetMap en un
punto representativo. Este formato permite contar registros por zona, pero no
permite saber qué proporción de una ruta discurre junto a una acera, sobre una
superficie determinada o por una vía con pendiente declarada. En particular,
las vías se habían guardado mediante su centro geométrico. Utilizarlas para
enriquecer una ruta habría asociado atributos por proximidad a ese centro y no
por coincidencia con el trazado real.

El enriquecimiento necesita una segunda representación de OSM orientada a
rutas: nodos para elementos puntuales y líneas completas para las vías. Esta
preparación no puntúa todavía las rutas; preserva evidencia validada para que el
agregador del día 3 pueda relacionarla espacialmente con las geometrías de ORS.

## Requisitos

- Conservar la geometría completa de las vías relevantes.
- Mantener las etiquetas originales para permitir auditoría y reinterpretación.
- Incluir la red peatonal relevante aunque una vía carezca de etiquetas de
  accesibilidad, ya que esa ausencia influye en la cobertura conocida.
- Tratar la ausencia o ambigüedad como desconocida, nunca como favorable.
- Descargar antes de la navegación; Overpass no forma parte del camino crítico.
- Validar el contenido antes de almacenarlo y después de leerlo.
- Identificar exactamente la consulta y la fecha base de OSM.
- Mantener la instantánea local fuera de Git y sin credenciales.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Reutilizar `osm_accessibility_points.parquet` | No requiere otra descarga | Las vías solo tienen un punto central y no permiten medir cobertura lineal | Descartada |
| Descargar todas las geometrías del interior de la M-30 | Máxima reutilización geográfica | Consulta pesada, mayor riesgo de límites de Overpass y datos innecesarios para el MVP | Descartada para esta fase |
| Consultar Overpass durante cada comparación | Datos recientes | Dependencia, latencia y fallos dentro del flujo de usuario | Descartada |
| Instantánea del corredor piloto con geometrías completas | Tamaño acotado, reproducibilidad y correspondencia espacial correcta | Solo cubre el área piloto y debe actualizarse de forma explícita | Adoptada |

## Decisión adoptada

Se fijó una caja geográfica entre `40.4175, -3.7280` y
`40.4385, -3.7105`. Contiene las tres rutas ORS actuales y deja un margen
aproximado de entre 270 y 333 metros respecto a sus extremos espaciales. Este
margen permite analizar variaciones próximas sin descargar toda Madrid.

Una única consulta Overpass selecciona:

- Nodos de cruces, semáforos, ayudas acústicas o vibratorias, pavimento táctil,
  bordillos, rampas y accesibilidad declarada.
- Vías peatonalmente relevantes, incluidas calles residenciales y de servicio,
  caminos, áreas peatonales y escalones.
- Vías con etiquetas de acera, superficie, regularidad, pendiente, acceso,
  bordillos, pavimento táctil o rampas.

La salida emplea `out body geom`, que conserva etiquetas y coordenadas completas.
La consulta se ordena de forma estable y se identifica mediante SHA-256. La
instantánea almacena también una versión de esquema, el ámbito, la fecha base de
OSM y la fecha de descarga. Cada lectura vuelve a validar estos campos, la
geometría y la unicidad de los identificadores.

## Correspondencia semántica

Las diez familias del estudio de densidad se mantienen y se añade el acceso
peatonal, necesario para las restricciones críticas.

| Familia OSM | Representación del modelo | Interpretación previa |
| --- | --- | --- |
| Cruces | Compatibilidad y conteo de cruces | La existencia del cruce no demuestra que sea adecuado |
| Semáforos | Semáforos y cruces semaforizados | Apoyo potencial; no implica señal acústica |
| Sonido o vibración | Ayudas acústicas y conteos de vibración | `yes` apoya; `no` es evidencia desfavorable; la ausencia es desconocida |
| Pavimento táctil | Pavimento podotáctil | `yes` apoya; `no` o `incorrect` desfavorece; `partial` es ambiguo |
| Bordillos | Compatibilidad del bordillo | `lowered` apoya; `raised` desfavorece; `flush` necesita contexto táctil |
| Aceras | Existencia y cobertura de acera | `both`, `yes` o `separate` apoyan; un único lado necesita dirección y lado de marcha |
| Rampas o `wheelchair` | Evidencia de rampa | Una rampa genérica es ambigua; `ramp:wheelchair=yes` aporta apoyo específico |
| Escalones | Ausencia o presencia de escalones | `highway=steps` constituye una barrera confirmada para perfiles incompatibles |
| Superficie | Material y regularidad | Material y `smoothness` deben combinarse; ninguno garantiza por sí solo accesibilidad |
| Pendiente | Pendiente máxima conocida | Un porcentaje es cuantificable; `up` o `down` no indican magnitud |
| Acceso peatonal | Permiso de tránsito peatonal | `foot` específico prevalecerá sobre `access` general durante la agregación |

El código utiliza indicadores preliminares positivos, negativos, ambiguos o no
reconocidos. No son todavía los estados `favorable`, `unfavorable` y `unknown`
de una ruta. El estado final exige comprobar que el elemento pertenece realmente
al corredor, combinar etiquetas relacionadas y calcular cobertura. Esta
separación evita, por ejemplo, declarar favorable un bordillo enrasado sin saber
si existe pavimento táctil o atribuir a ambos lados una acera etiquetada solo a
la izquierda.

## Datos de entrada y salida

### Entrada

- Caja fija del corredor en WGS84.
- Selectores auditables de nodos y vías.
- Respuesta JSON de un endpoint público de Overpass.

### Salida

- Archivo local:
  `data/raw/osm-routing/moncloa_principe_pio.snapshot.json`.
- Nodos representados por una coordenada WGS84.
- Vías representadas por al menos dos coordenadas WGS84.
- Etiquetas originales `clave=valor`.
- Fecha base de OSM, fecha de descarga, versión de esquema y huella de consulta.

## Implementación

- `backend/enrichment/osm_mapping.py` contiene las familias, selectores,
  correspondencia con el dominio y reglas preliminares de interpretación.
- `backend/enrichment/osm_snapshot.py` construye la consulta, valida la respuesta,
  implementa la caché atómica y gestiona dos endpoints con espera acotada.
- `backend/enrichment/fetch_pilot_snapshot.py` descarga o valida la instantánea
  mediante un comando reproducible.
- `backend/config.py` permite configurar la ruta local con
  `OSM_SNAPSHOT_PATH`.

Comando de preparación:

```bash
source .venv/bin/activate
python -m backend.enrichment.fetch_pilot_snapshot
```

Una segunda ejecución utiliza la instantánea validada y no repite la petición.
La escritura es atómica y asigna permisos `0600` al archivo.

## Pruebas

Las diez pruebas específicas verifican:

- Cobertura de las once dimensiones del dominio.
- Selectores únicos y presencia de la red peatonal completa.
- Interpretación conservadora de valores simples y compuestos.
- Conversión de pendientes numéricas sin inventar magnitud para `up` o `down`.
- Orden de la caja geográfica y estabilidad de la consulta.
- Normalización de nodos y vías.
- Rechazo de vías sin geometría completa y de elementos duplicados.
- Lectura y escritura privada ligada a la huella de consulta.
- Ausencia de tráfico HTTP cuando existe caché.
- Cambio al segundo endpoint después de un fallo transitorio.

## Resultados

La descarga realizada el 11 de agosto de 2026 produjo una instantánea de
2.574.121 bytes con fecha base OSM `2026-08-11T07:12:44Z` y huella de consulta
`944b1058b3aaa91f8297bf4a40c5eae2976a2bf0ef067045f06c36b98cf75a33`.
Los datos proceden de OpenStreetMap y están sujetos a la licencia ODbL; cualquier
publicación derivada mantendrá la atribución correspondiente.

| Magnitud | Resultado |
| --- | ---: |
| Elementos únicos | 3.670 |
| Nodos | 832 |
| Vías con geometría completa | 2.838 |
| Coordenadas conservadas | 16.630 |

La siguiente tabla cuenta elementos que contienen evidencia de cada familia.
Las filas no son sumables porque un mismo objeto puede tener varias etiquetas.

| Familia | Elementos observados |
| --- | ---: |
| Cruces | 707 |
| Semáforos | 427 |
| Ayudas acústicas o vibratorias | 181 |
| Pavimento táctil | 584 |
| Bordillos | 190 |
| Aceras | 736 |
| Rampas o `wheelchair` | 312 |
| Escalones | 200 |
| Superficie o regularidad | 2.308 |
| Pendiente | 151 |
| Acceso peatonal | 265 |

La inspección de valores reales permitió ampliar las reglas para superficies
como `unhewn_cobblestone`, `pebblestone`, `metal` o `grass_paver` y restricciones
como `delivery`, `visitors` o `permit`. Tras esta revisión no quedan valores no
reconocidos entre las claves que disponen de una regla preliminar. Esto no los
convierte en evidencia concluyente: algunos se conservan explícitamente como
ambiguos.

## Riesgos y limitaciones

- OSM es colaborativo y su ausencia de etiquetas no confirma ausencia real.
- La instantánea representa una fecha y un corredor concretos, no toda Madrid.
- Una vía seleccionada puede prolongarse fuera de la caja porque conserva su
  geometría completa.
- Los semáforos para vehículos y peatones requieren asociación espacial y
  semántica antes de contarse como apoyo de un cruce.
- La proximidad a la ruta no basta para decidir qué lado de una calle se utiliza.
- La clasificación preliminar de superficies es una hipótesis conservadora que
  deberá someterse a sensibilidad con rutas reales.
- La asociación espacial sigue siendo una aproximación y debe contrastarse con
  casos revisados manualmente.

## Texto base para la memoria

El conjunto empleado en el estudio de densidad no se reutilizó directamente
para caracterizar recorridos, ya que las vías estaban reducidas a puntos
representativos. Se construyó una instantánea independiente de OSM para el
corredor Moncloa–Príncipe Pío mediante una consulta Overpass con geometrías
completas. El ámbito acotado reduce el coste y permite retirar Overpass del flujo
de navegación. La respuesta se valida, se identifica mediante una huella de la
consulta y se almacena de forma atómica. Las etiquetas se conservan sin
confundir presencia, ausencia y desconocimiento. El índice métrico, el corredor
calibrado y la unión de intervalos permiten obtener cobertura, estado e
incertidumbre por ruta sin interpretar como favorable un dato ausente. La
calibración seleccionó 5 m para la asociación general y una regla más estricta
para confirmar barreras críticas. La instantánea contiene 3.670 elementos
únicos y 16.630 coordenadas, suficientes para enriquecer las rutas reales sin
atribuir accesibilidad a partir de puntos centrales.

## Trabajo pendiente

- [x] Construir un índice espacial métrico sobre la instantánea.
- [x] Definir y calibrar el ancho del corredor de asociación.
- [x] Agregar etiquetas relacionadas sin doble conteo.
- [x] Calcular cobertura, estado final e incertidumbre por ruta.
- [ ] Validar manualmente casos limítrofes de cruces y aceras laterales.
- [x] Conectar las rutas enriquecidas con restricciones y puntuación.

## Referencias y evidencias

- [Referencia de Overpass QL y `out geom`](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL).
- [Atribución y licencia de OpenStreetMap](https://www.openstreetmap.org/copyright).
- [Etiquetado de aceras](https://wiki.openstreetmap.org/wiki/Key%3Asidewalk%3A%2A).
- [Etiquetado de bordillos](https://wiki.openstreetmap.org/wiki/Key%3Akerb).
- [Señales acústicas](https://wiki.openstreetmap.org/wiki/Key%3Atraffic_signals%3Asound).
- [Rampas](https://wiki.openstreetmap.org/wiki/Key%3Aramp).
- [Acceso con silla de ruedas](https://wiki.openstreetmap.org/wiki/Key%3Awheelchair).
- [Superficies](https://wiki.openstreetmap.org/wiki/Key%3Asurface).
- [Pendientes](https://wiki.openstreetmap.org/wiki/Key%3Aincline).
- `tests/enrichment/test_osm_mapping.py`.
- `tests/enrichment/test_osm_snapshot.py`.
- `tests/enrichment/test_spatial_index.py`.
- `tests/enrichment/test_route_association.py`.
- `tests/enrichment/test_route_enrichment.py`.
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
