# Caché y tolerancia a servicios externos

Estado: `Vigente`  
Última actualización: 11 de agosto de 2026
Responsabilidad principal: `operations`

## Problema que resuelve

Overpass y Mapillary pueden responder con límites, errores 429, 500, 502 o 504.
Repetir descargas extensas dificulta la reproducibilidad y aumenta la carga
sobre servicios públicos.

## Decisión

- Guardar respuestas externas crudas en `data/raw`.
- Guardar productos derivados en `data/processed`.
- Reutilizar cachés válidas tras reiniciar el kernel.
- Descargar OSM del área piloto antes de la navegación.
- Almacenar en caché las respuestas de ORS usadas en las pruebas y la evaluación.
- No incluir tokens en claves, URLs persistidas ni mensajes de error.
- Guardar la caché ORS en `data/raw/ors`, fuera del control de versiones, porque
  contiene los extremos y la geometría de las rutas solicitadas.
- Guardar la instantánea OSM del corredor en `data/raw/osm-routing`, también
  fuera de Git, con versión de esquema, fecha base y huella SHA-256 de la
  consulta.

## Flujo

```text
Petición externa
    ↓
¿Existe caché válida? ── sí → cargar
    │
    no
    ↓
reintentos acotados → guardar respuesta cruda → procesar
```

## Invalidación

Una caché debe invalidarse cuando cambian el ámbito, la consulta, la versión del
esquema o la fecha de actualización requerida. La política exacta se definirá
por proveedor y se registrará junto al experimento que use los datos.

La instantánea OSM se invalida de forma visible cuando cambia la consulta: el
cargador compara la huella esperada y rechaza un archivo de otra versión. No se
actualiza durante la navegación. Su escritura es atómica, emplea permisos
`0600` y una segunda ejecución no repite la petición si la caché es válida.

## Seguridad

Los tokens permanecen en `.env`. Las trazas sanitizan URLs, coordenadas, cuerpos
y cabeceras. Los datos de navegación en tiempo real no se registran ni se
incorporan a la caché. La clave de caché ORS se deriva únicamente de una versión
de esquema y del cuerpo canónico de la consulta; nunca incluye la credencial.

## Fuente histórica

La implementación exploratoria y su justificación metodológica se documentan en
[la selección del área piloto](../research/seleccion-area-piloto.md#adquisición-reproducible).
La preparación específica para rutas se describe en
[la instantánea OSM del corredor](../research/preparacion-osm-para-rutas.md).
