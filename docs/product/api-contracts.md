# Contratos de la API del MVP

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
| API FastAPI local | Contratos claros y secretos en backend | Requiere dos procesos | Adoptada |

## Decisión adoptada

La API tendrá inicialmente:

- `GET /api/v1/health`, ya implementado.
- `GET /api/v1/places/search`, pendiente.
- `POST /api/v1/routes/compare`, pendiente.
- `POST /api/v1/routes/reroute`, pendiente.

Los contratos detallados previstos se conservan en
[el alcance del MVP](alcance-mvp.md#9-api-prevista). Al implementar cada
operación, este documento sustituirá la descripción prevista por los esquemas
reales de entrada, salida y error.

## Justificación

FastAPI permite reutilizar directamente los modelos Pydantic, generar OpenAPI y
probar la validación sin depender de la interfaz móvil.

## Datos de entrada y salida

`routes/compare` recibirá origen, destino y perfil; devolverá hasta tres rutas
con geometría, métricas, razones y avisos. `routes/reroute` recibirá una posición
confirmada y aplicará el mismo perfil y las mismas restricciones.

## Implementación

- Entrada de la aplicación: `backend/main.py`.
- Router versionado: `backend/api/router.py`.
- Salud: `backend/api/routes/health.py`.
- Contratos de dominio: `backend/domain/models.py`.

## Pruebas

El endpoint de salud dispone de una prueba de API. Faltan la validación de
peticiones, el tratamiento de errores externos y los contratos completos de
comparación.

## Resultados

El endpoint `GET /api/v1/health` responde correctamente en las pruebas y en ejecución
local. Resto pendiente.

## Riesgos y limitaciones

- Los contratos previstos pueden necesitar campos adicionales al integrar ORS.
- No se debe exponer una fórmula interna como promesa absoluta de accesibilidad.

## Texto base para la memoria

Se adoptó una API local con FastAPI como frontera entre la interfaz y los
servicios geoespaciales. Esta separación protege las credenciales, centraliza
las invariantes de seguridad y permite validar de forma independiente los
contratos de comparación y rerouting.

## Trabajo pendiente

- [ ] Implementar búsqueda de lugares.
- [ ] Implementar comparación de rutas.
- [ ] Implementar rerouting confirmado.
- [ ] Crear tipos TypeScript equivalentes.
