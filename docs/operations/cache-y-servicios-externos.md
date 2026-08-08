# Caché y tolerancia a servicios externos

Estado: `Vigente`  
Última actualización: 8 de agosto de 2026  
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

## Seguridad

Los tokens permanecen en `.env`. Las trazas sanitizan URLs y cabeceras. Los
datos de navegación en tiempo real no se registran ni se incorporan a la caché.

## Fuente histórica

La implementación exploratoria y su justificación metodológica se documentan en
[la selección del área piloto](../research/seleccion-area-piloto.md#adquisición-reproducible).
