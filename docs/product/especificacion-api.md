# Especificación de la API del MVP

Estado: `En implementación`

Última actualización: 8 de agosto de 2026

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
- `GET /api/v1/places/search`, pendiente.
- `POST /api/v1/routes/compare`, ya implementado con *fixtures*.
- `POST /api/v1/routes/reroute`, pendiente.

Los esquemas detallados previstos se conservan en
[el alcance del MVP](alcance-mvp.md#9-api-prevista). Al implementar cada
operación, este documento sustituirá la descripción prevista por los esquemas
reales de entrada, salida y error.

## Justificación

FastAPI permite reutilizar directamente los modelos Pydantic, generar OpenAPI y
probar la validación sin depender de la interfaz móvil.

## Datos de entrada y salida

### `POST /api/v1/routes/compare`

La petición recibirá:

- `origin`: latitud y longitud WGS84.
- `destination`: latitud y longitud WGS84, distinta del origen.
- `profile`: restricciones críticas y pesos declarados.

El proveedor no se seleccionará desde la aplicación. La configuración del
backend decidirá entre `fixture` y, posteriormente, ORS. Así se evita que una
petición pueda activar servicios externos o eludir el entorno reproducible.

El proveedor sintético exige el origen y el destino del escenario piloto y
tolera una diferencia máxima de `0,00001` grados para absorber redondeos de
serialización. Otros trayectos producen un error 404; no se reutiliza un escenario
que no corresponde a las coordenadas solicitadas.

La respuesta incluirá:

- Identificador y nombre del escenario utilizado.
- Origen y destino resueltos por el proveedor.
- Rutas aceptadas en orden, con nombre, categoría, procedencia, geometría,
  distancia, duración y marcado de datos sintéticos.
- Adecuación, confianza, incertidumbre, costes, pesos y contribuciones.
- Hasta tres factores explicativos y todos los avisos derivados de la evidencia.
- Rutas descartadas con sus motivos de incompatibilidad crítica.

No se devolverá una afirmación booleana de «ruta accesible». La aplicación
recibirá evidencia suficiente para mostrar alternativas y mantener la decisión
final en la persona usuaria.

### Errores previstos

- `422`: cuerpo, coordenadas, pesos o perfil no válidos.
- `404`: el proveedor de *fixtures* no dispone de un escenario para ese origen y
  destino.
- `503`: proveedor configurado pero todavía no disponible o fallo externo sin
  respuesta válida.

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
- Endpoint de comparación: `backend/api/routes/compare.py`.
- Proveedores intercambiables: `backend/routing/providers.py`.
- Servicio de comparación: `backend/services/route_comparison.py`.

## Pruebas

Las pruebas verifican validación de modelos, trayectos iguales, campos no
documentados, unión entre ruta y puntuación, resolución del *fixture*, tolerancia
de coordenadas, personalización, reproducibilidad, errores 404/422/503
sanitizados y esquema OpenAPI.

## Resultados

`GET /api/v1/health` y `POST /api/v1/routes/compare` responden correctamente en
las pruebas. El perfil predeterminado devuelve dos rutas aceptadas y una
descartada; un perfil centrado en cruces modifica el primer puesto. La suite del
backend alcanza 58 pruebas. La validación manual en la documentación interactiva
de FastAPI confirmó ambos comportamientos: el perfil equilibrado mantiene la
alternativa equilibrada en primer lugar y, al asignar todo el peso a los cruces
complejos, la alternativa con cruces más sencillos pasa al primer puesto. La
entrega del día 4 queda cerrada.

## Riesgos y limitaciones

- Los esquemas previstos pueden necesitar campos adicionales al integrar ORS.
- No se debe exponer una fórmula interna como promesa absoluta de accesibilidad.
- El endpoint actual solo resuelve el trayecto sintético Moncloa–Príncipe Pío.

## Texto base para la memoria

Se adoptó una API local con FastAPI como frontera entre la interfaz y los
servicios geoespaciales. Esta separación protege las credenciales, centraliza
las invariantes de seguridad y permite validar de forma independiente las
especificaciones de comparación y rerouting.

## Trabajo pendiente

- [ ] Implementar búsqueda de lugares.
- [x] Implementar comparación de rutas con el proveedor de *fixtures*.
- [ ] Implementar rerouting confirmado.
- [ ] Crear tipos TypeScript equivalentes.
