# Especificación de la API del MVP

Estado: `En implementación`

Última actualización: 13 de agosto de 2026

Responsabilidad principal: `product`

## Problema que resuelve

Define un límite estable entre la aplicación Expo y el backend FastAPI para que
la interfaz no dependa de la implementación de ORS, OSM o scoring.

## Requisitos

- Validación mediante Pydantic v2.
- Respuestas estructuradas y equivalentes a tipos TypeScript.
- Adecuación, confianza e incertidumbre separadas.
- Errores externos sin pérdida del último estado válido.
- Tokens y coordenadas de navegación fuera de los registros.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Lógica en la app | Menos infraestructura | Expone claves y duplica reglas | Descartada |
| API FastAPI local | Especificación clara y secretos en backend | Requiere dos procesos | Adoptada |

## Decisión adoptada

La API tendrá inicialmente:

- `GET /api/v1/health`, ya implementado.
- `GET /api/v1/places/search`, implementado inicialmente con un catálogo local
  del área piloto.
- `POST /api/v1/routes/compare`, ya implementado con *fixtures* y ORS
  enriquecido.
- `POST /api/v1/routes/reroute`, pendiente.

Los esquemas detallados previstos se conservan en
[el alcance del MVP](alcance-mvp.md#9-api-prevista). Al implementar cada
operación, este documento sustituirá la descripción prevista por los esquemas
reales de entrada, salida y error.

## Justificación

FastAPI permite reutilizar directamente los modelos Pydantic, generar OpenAPI y
probar la validación sin depender de la interfaz móvil.

## Datos de entrada y salida

### `GET /api/v1/places/search`

La operación recibe `q`, entre 2 y 80 caracteres, y `limit`, entre 1 y 10. El
proveedor `catalog` busca por nombre y alias en cuatro lugares reproducibles.
El proveedor `ors` combina ese catálogo con geocodificación de calles, portales
y lugares mediante la API pública de ORS/Pelias.

Cada resultado incluye un identificador estable, nombre, descripción,
coordenadas WGS84 y procedencia `pilot_catalog` u `ors_geocoder`. Los resultados
externos se restringen al rectángulo de la instantánea OSM y el backend vuelve a
validar cada coordenada antes de exponerla. Los identificadores externos son
opacos y no revelan los identificadores internos del proveedor.

El catálogo se conserva después de integrar el geocodificador porque:

- permite probar selección de origen y destino sin red;
- evita enviar textos de búsqueda a terceros;
- mantiene ubicaciones reproducibles dentro de la instantánea OSM;
- proporciona un respaldo accesible cuando falle un servicio externo.

La búsqueda externa solo se ejecuta tras una acción explícita y usa una caché
privada con claves SHA-256. Si falla, una coincidencia local sigue disponible;
si la consulta libre no tiene respaldo, la API devuelve el error estable
`place_search_unavailable` para que la app no confunda un fallo con cero
resultados. La operación no pretende todavía cubrir todo Madrid.

### `POST /api/v1/routes/compare`

La petición recibirá:

- `origin`: latitud y longitud WGS84.
- `destination`: latitud y longitud WGS84, distinta del origen.
- `profile`: restricciones críticas y pesos declarados.

El proveedor no se selecciona desde la aplicación. La configuración del
backend decide entre `fixture` y ORS enriquecido. Así se evita que una
petición pueda activar servicios externos o eludir el entorno reproducible.

El proveedor ORS solo acepta trayectos contenidos en la instantánea del área
piloto. Obtiene rutas base, asocia la evidencia OSM dentro del corredor
configurado, construye estados e incertidumbre y ejecuta después las mismas
restricciones y puntuación que el proveedor sintético.

El proveedor sintético exige el origen y el destino del escenario piloto y
tolera una diferencia máxima de `0,00001` grados para absorber redondeos de
serialización. Otros trayectos producen un error 404; no se reutiliza un escenario
que no corresponde a las coordenadas solicitadas.

La respuesta incluirá:

- Identificador y nombre del escenario utilizado.
- Origen y destino resueltos por el proveedor.
- Rutas aceptadas en orden, con nombre, categoría, procedencia, geometría,
  distancia, duración y marcado de datos sintéticos.
- Instrucciones ordenadas de navegación con maniobra, frase española,
  distancia, duración y posición sobre la geometría.
- Eventos de accesibilidad ordenados dentro de cada instrucción, con distancia
  aproximada, procedencia OSM y detalles trivaluados sobre cruces y apoyos.
- Adecuación, confianza, incertidumbre, costes, pesos y contribuciones.
- Hasta tres factores explicativos y todos los avisos derivados de la evidencia.
- Rutas descartadas con sus motivos de incompatibilidad crítica.

El backend podrá generar y analizar más rutas de las que devuelve. Esta
colección interna permitirá ampliar y deduplicar candidatas antes del
enriquecimiento, las restricciones y el ranking. La respuesta pública seguirá
conteniendo entre cero y tres alternativas para no trasladar la complejidad de
la búsqueda a la interfaz accesible. El diseño y su evaluación se detallan en
[Generación y diversidad de rutas candidatas](../research/generacion-rutas-candidatas.md).

No se devolverá una afirmación booleana de «ruta accesible». La aplicación
recibirá evidencia suficiente para mostrar alternativas y mantener la decisión
final en la persona usuaria.

### Errores previstos

- `422`: cuerpo, coordenadas, pesos o perfil no válidos.
- `404`: el proveedor de *fixtures* no dispone de un escenario para ese origen y
  destino.
- `503`: proveedor de rutas o de búsqueda no disponible, instantánea local
  ausente o fallo externo sin respuesta válida.

Los errores utilizarán códigos estables para que la aplicación traduzca el
mensaje. No incluirán tokens, URLs externas completas ni coordenadas en texto.

`routes/reroute` recibirá posteriormente una posición confirmada y aplicará el
mismo perfil y las mismas restricciones.

## Implementación

- Entrada de la aplicación: `backend/main.py`.
- Router versionado: `backend/api/router.py`.
- Salud: `backend/api/routes/health.py`.
- Modelos de dominio: `backend/domain/models.py`.
- Modelos de comparación: `backend/api/models/routes.py`.
- Modelos y catálogo de lugares: `backend/places/`.
- Endpoint de búsqueda: `backend/api/routes/places.py`.
- Endpoint de comparación: `backend/api/routes/compare.py`.
- Proveedores intercambiables: `backend/routing/providers.py`.
- Servicio de comparación: `backend/services/route_comparison.py`.
- Narración determinista: `backend/narration/templates.py`.

## Pruebas

Las pruebas verifican validación de modelos, trayectos iguales, campos no
documentados, unión entre ruta y puntuación, resolución del *fixture*, tolerancia
de coordenadas, personalización, reproducibilidad, errores 404/422/503
sanitizados, esquema OpenAPI y transformación del proveedor ORS enriquecido.
Para la búsqueda se comprueban coincidencias sin tildes, alias internos, orden
determinista, límites, ausencia de resultados y respuestas públicas validadas.
Las instrucciones deben estar ordenadas, referenciar puntos existentes y
coincidir con la geometría expuesta; estas reglas se repiten en la validación
móvil.

## Resultados

`GET /api/v1/health`, `GET /api/v1/places/search` y
`POST /api/v1/routes/compare` responden correctamente en las pruebas. El perfil
predeterminado devuelve dos rutas aceptadas y una
descartada; un perfil centrado en cruces modifica el primer puesto. La suite del
backend alcanza actualmente 211 pruebas. La validación manual en la documentación interactiva
de FastAPI confirmó ambos comportamientos: el perfil equilibrado mantiene la
alternativa equilibrada en primer lugar y, al asignar todo el peso a los cruces
complejos, la alternativa con cruces más sencillos pasa al primer puesto. La
entrega del día 4 queda cerrada. Las pruebas posteriores añaden la preparación y
el enriquecimiento OSM sin modificar este comportamiento del proveedor
sintético.

## Riesgos y limitaciones

- Los esquemas previstos pueden necesitar campos adicionales al integrar ORS.
- No se debe exponer una fórmula interna como promesa absoluta de accesibilidad.
- El proveedor sintético solo resuelve el trayecto preparado. El proveedor ORS
  real se limita al ámbito cubierto por la instantánea piloto.

## Texto base para la memoria

Se adoptó una API local con FastAPI como frontera entre la interfaz y los
servicios geoespaciales. Esta separación protege las credenciales, centraliza
las invariantes de seguridad y permite validar de forma independiente las
especificaciones de comparación y rerouting.

## Trabajo pendiente

- [x] Implementar la primera búsqueda local de lugares del área piloto.
- [x] Implementar comparación de rutas con el proveedor de *fixtures*.
- [x] Incorporar instrucciones de navegación validadas a las rutas aceptadas.
- [ ] Implementar rerouting confirmado.
- [x] Crear tipos TypeScript equivalentes y validación móvil en ejecución.
