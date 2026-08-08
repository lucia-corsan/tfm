# Arquitectura del MVP

Fecha de decisión inicial: 8 de agosto de 2026.

## Objetivo

Separar el cálculo de rutas, el análisis de accesibilidad, el aprendizaje y la
interfaz para que cada parte pueda probarse con datos reproducibles.

## Componentes

```text
Aplicación Android
    ↓ HTTP/JSON
FastAPI
    ↓
Servicio de comparación
    ├── proveedor de *fixtures*
    ├── proveedor ORS
    ├── enriquecimiento OSM
    ├── restricciones y scoring
    └── narración determinista
```

- `backend/routing`: proveedores intercambiables y rerouting.
- `backend/services`: coordinación entre proveedor, restricciones, ranking y
  modelos de respuesta.
- `backend/enrichment`: relación entre geometrías y atributos OSM.
- `backend/scoring`: restricciones, adecuación, confianza y diversidad.
- `backend/narration`: instrucciones y explicaciones verificables.
- `backend/feedback`: adaptación acotada de pesos.
- `app`: interfaz Android accesible y persistencia local.
- `ml`: evaluación reproducible del aprendizaje.

La aplicación no contendrá la clave de ORS. Las peticiones externas se realizarán desde
el backend y el proveedor de *fixtures* permitirá trabajar sin conexión.

El endpoint de comparación no contiene la fórmula. Delega en un servicio que
obtiene el escenario del proveedor configurado, ejecuta el mismo ranking probado
de forma aislada y construye la respuesta de la API. Esta capa evita acoplar
FastAPI, ORS y el sistema de decisión.

## Especificaciones compartidas

Los límites HTTP usarán Pydantic v2. La aplicación mantendrá tipos TypeScript
equivalentes y centralizados. Los datos desconocidos se representarán de forma
explícita, nunca mediante valores favorables por defecto.

### Modelo de dominio y decisión explicable

Los modelos de datos compartidos se concentran en `backend/domain/models.py` para que
el proveedor de rutas, el scoring y la API utilicen la misma definición. El
primer corte vertical contiene:

- Coordenadas validadas y geometrías con al menos dos puntos.
- Perfil de movilidad y pesos declarados de preferencia.
- Evidencia trivaluada: `favorable`, `unfavorable` o `unknown`.
- Características medibles de cada ruta.
- Resumen explícito de incertidumbre.
- Candidato de ruta independiente del proveedor.
- Restricciones críticas aplicadas antes de cualquier coste gradual.
- Costes normalizados, adecuación, confianza e incertidumbre separadas.
- Ranking determinista con factores explicativos y avisos estructurados.

Los pesos representan importancia relativa, no seguridad. Las restricciones
críticas (`avoid_steps`, acceso peatonal y compatibilidad de cruces) se modelan
por separado y no podrán ser modificadas por el aprendizaje posterior.

Los *fixtures* de `backend/routing/fixture_data/` son escenarios sintéticos para
las pruebas y el desarrollo sin red. Sus geometrías sitúan el ejercicio en el
corredor
Moncloa–Argüelles–Príncipe Pío, pero sus atributos no deben citarse como
observaciones reales ni utilizarse como evidencia empírica en la memoria.

La explicación completa de ORS, OSM, Mapillary y el plan de cuatro semanas se
encuentra en `docs/product/alcance-mvp.md`.

La definición detallada de perfil, preferencias, evidencia, rutas e
incertidumbre, junto con la justificación de cada decisión, se encuentra en
`docs/research/modelo-dominio-accesibilidad.md`.

La fórmula, sus escalas iniciales, la política de restricciones y los resultados
sintéticos del día 3 se documentan en
`docs/research/scoring-explicable.md`. La API consumirá estos resultados sin
duplicar la lógica en la aplicación móvil.
