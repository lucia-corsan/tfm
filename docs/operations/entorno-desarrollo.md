# Entorno de desarrollo reproducible

Estado: `Validado`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `operations`

## Backend

- macOS sobre Apple Silicon.
- Python 3.9 en `.venv`.
- FastAPI, Pydantic v2, httpx async y pytest.
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

## SDK de Android

`ANDROID_HOME` apunta a `$HOME/Library/Android/sdk`. El `PATH` incluye
`emulator` y `platform-tools`. `adb devices` debe mostrar el emulador como
`device` antes de iniciar la app.

## Secretos

`.env` es local y está ignorado. `.env.example` documenta nombres de variables
sin valores secretos. Nunca se guardan tokens en notebooks, trazas o commits.

## Validación actual

- Backend: Ruff correcto y nueve pruebas superadas tras el día 2.
- App: Jest, ESLint, TypeScript y Expo Doctor correctos.
- Bundle Android generado.
- Pantalla inicial probada con TalkBack.

## Limitaciones

Python 3.9 ya no recibe soporte general y VS Code puede mostrar una advertencia.
Se mantiene por la decisión actual del TFM; cualquier migración deberá aprobarse
y documentarse como cambio de entorno.
