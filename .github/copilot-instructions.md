# Instrucciones de Copilot — TFM de navegación peatonal accesible

Este archivo complementa `AGENTS.md`, que constituye la fuente principal de
instrucciones del repositorio. En caso de conflicto, prevalece `AGENTS.md`.

## Contexto

El proyecto desarrolla una aplicación móvil Android para comparar rutas
peatonales según las preferencias de personas ciegas o con baja visión. Toda
ruta debe mostrar adecuación al perfil, confianza, incertidumbre, razones y
avisos; nunca debe afirmarse que una ruta es accesible de forma absoluta.

La aportación principal de IA es un sistema híbrido explicable:

1. Restricciones simbólicas de seguridad.
2. Puntuación multicriterio personalizada.
3. Aprendizaje en línea por pares (*pairwise*) de preferencias graduables.
4. Explicaciones derivadas de características verificables.

Los VLM sobre Mapillary son una extensión experimental y opcional. No forman
parte del MVP ni del flujo de producción.

## Stack vigente

- Backend: Python 3.9, FastAPI, Pydantic v2, httpx asíncrono y pytest.
- Cálculo de rutas: OpenRouteService inicialmente; Valhalla como evolución posible.
- Datos: OpenStreetMap y Overpass, con Mapillary como evidencia auxiliar.
- Aplicación: React Native, Expo y TypeScript; Android como prioridad.
- Calidad: Ruff, pytest, ESLint, TypeScript y Jest.

## Reglas esenciales

- No inventar tags OSM, endpoints ni parámetros externos.
- No codificar claves ni subir `.env`, datasets pesados, imágenes masivas o
  modelos binarios.
- Un atributo `unknown` nunca aporta evidencia positiva.
- El aprendizaje no puede modificar restricciones críticas.
- La puntuación debe ser determinista, explicable y fácil de probar.
- La narración se genera mediante plantillas deterministas; un LLM no decide la
  seguridad de una ruta.
- No registrar coordenadas de navegación, audio ni tokens.

## Código

- Modelos compartidos en `backend/domain/models.py`; no crear variantes paralelas.
- Funciones públicas Python con type hints y docstring de estilo Google.
- Componentes React Native funcionales, props tipadas y strings en
  `app/i18n/es.ts`.
- Todos los controles deben declarar rol, etiqueta y estado accesibles.
- Mantener objetivos táctiles de al menos 44 × 44 pt y contraste WCAG 2.2 AA.

## Documentación

Actualizar primero la fuente correspondiente dentro de `docs/`. Toda funcionalidad
nueva debe seguir `docs/templates/feature.md`, enlazarse desde `docs/README.md` y
registrarse brevemente en `docs/journal.md`.

Los textos en español deben escribirse con ortografía correcta, incluidas las
tildes, los signos de apertura y la concordancia. Deben evitarse los anglicismos
innecesarios cuando exista una alternativa española clara.

La documentación versionada debe ser adecuada para evaluación académica y para
una eventual publicación. Las notas no evaluables pertenecen a `docs/private/`,
que está ignorada por Git, pero nunca debe utilizarse para almacenar secretos.
