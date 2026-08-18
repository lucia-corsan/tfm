# Entorno de desarrollo reproducible

Estado: `Validado`

Última actualización: 17 de agosto de 2026

Responsabilidad principal: `operations`

## Backend

- macOS sobre Apple Silicon.
- Python 3.9 en `.venv`.
- FastAPI, Pydantic v2, httpx async y pytest.
- pyproj y Shapely para proyección y comparación métrica de rutas.
- Matplotlib para las figuras reproducibles de evaluación.
- Ruff para lint y comprobaciones estáticas.

Comprobaciones:

```bash
python -m ruff check .
python -m pytest
```

Arranque:

```bash
uvicorn backend.main:app --reload
```

Preparación o validación de la instantánea OSM del área piloto:

```bash
python -m backend.enrichment.fetch_pilot_snapshot
```

La ruta local se configura mediante `OSM_SNAPSHOT_PATH`. La instantánea está
ignorada por Git y una ejecución repetida reutiliza el archivo validado.

Evaluación reproducible del corredor:

```bash
python -m backend.enrichment.evaluate_corridor_widths
```

Calibración y evaluación reproducible del aprendizaje adaptativo:

```bash
python -m ml.adaptive_preferences.evaluation
```

Evaluación con costes ORS y OSM de `EXP-007`:

```bash
# Necesita ORS_API_KEY solo durante la recopilación y una instantánea OSM local.
python -m ml.adaptive_preferences.real_routes_evaluation collect

# Es completamente local después de generar el CSV de costes sanitizado.
python -m ml.adaptive_preferences.real_routes_evaluation evaluate
```

La recopilación usa una caché experimental ignorada por Git; la evaluación
publica únicamente costes derivados, métricas y la figura.

Los CSV se guardan en `docs/evaluation/artifacts/` y no contienen claves ni
tokens. Para activar las rutas reales en la API se usa `ROUTING_PROVIDER=ors`;
el valor predeterminado continúa siendo `fixture`.

## Aplicación móvil

- Node.js 24.
- Expo SDK 57.
- React Native 0.86 y TypeScript estricto.
- Android Studio con Android 16, API 36.
- Pixel 9 virtual ARM64 con Google Play.

Comprobaciones desde `app/`:

```bash
npm test
npm run lint
npm run typecheck
npm run android
```

La aplicación usa por defecto
`http://10.0.2.2:8000/api/v1` para alcanzar FastAPI desde Android Emulator. Si
se necesita otro entorno, crear `app/.env.local` a partir de
`app/.env.example`:

```text
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
```

La URL es configuración pública. Nunca se deben introducir tokens o claves en
una variable `EXPO_PUBLIC_*`, porque Expo incorpora su valor al código de la
aplicación.

## SDK de Android

`ANDROID_HOME` apunta a `$HOME/Library/Android/sdk`. El `PATH` incluye
`emulator` y `platform-tools`. `adb devices` debe mostrar el emulador como
`device` antes de iniciar la app.

## Secretos

`.env` es local y está ignorado. `.env.example` documenta nombres de variables
sin valores secretos. Nunca se guardan tokens en notebooks, trazas o commits.

## Validación actual

- Backend: Ruff correcto y 272 pruebas superadas, incluidas las restricciones,
  la puntuación, el aprendizaje adaptativo y su evaluación reproducible.
- App: 126 pruebas Jest en veintiún grupos, ESLint y TypeScript correctos. Expo Doctor quedó
  validado durante la configuración inicial del entorno.
- Bundle Android generado.
- Comparación validada manualmente con TalkBack, ambos perfiles y recuperación
  tras detener y reiniciar FastAPI.
- Búsqueda libre de una dirección del área piloto, selección y comparación
  posterior validadas en Android Emulator.
- Navegación manual, GPS en primer plano, confirmación del recálculo y lectura
  con TalkBack validados en Android Emulator. La evaluación con participantes
  sigue pendiente.

## Limitaciones

Python 3.9 ya no recibe soporte general y VS Code puede mostrar una advertencia.
Se mantiene por la decisión actual del TFM; cualquier migración deberá aprobarse
y documentarse como cambio de entorno.
