# Rutas peatonales personalizadas y accesibles

TFM de IA aplicada para comparar rutas peatonales según las preferencias de
personas ciegas o con baja visión. El sistema separa adecuación al perfil,
confianza e incertidumbre; nunca afirma que una ruta sea accesible de forma
absoluta.

## Estado

El repositorio está en la primera fase del MVP. El primer incremento funcional utiliza rutas
locales reproducibles antes de integrar OpenRouteService, GPS y aprendizaje
adaptativo.

## Requisitos

- Python 3.9.
- Node.js 24 LTS para la app Android.
- Android Studio y un emulador, o un dispositivo Android, en la fase móvil.

## Backend

Crear y activar el entorno:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
```

Las dependencias geoespaciales del notebook se instalan por separado:

```bash
python -m pip install -r requirements-notebooks.txt
```

Preparar la configuración local:

```bash
cp .env.example .env
```

Los proveedores `fixture` y `catalog` no necesitan secretos. `ORS_API_KEY` solo
será obligatorio al activar rutas o geocodificación reales. Para buscar calles
dentro del área piloto se utiliza `PLACE_SEARCH_PROVIDER=ors`.

Arrancar la API:

```bash
python -m uvicorn backend.main:app --reload
```

Comprobarla en otra terminal:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

## Calidad del backend

```bash
python -m pytest
python -m ruff check .
```

## Aplicación Android

```bash
cd app
npm ci
npm test
npm run lint
npm run typecheck
npm run start
```

La aplicación usa Expo SDK 57, React Native 0.86 y TypeScript estricto. El paquete
Android puede validarse sin emulador con el comando documentado en `app/README.md`.

## Configuración y secretos

- `.env` es local y está ignorado por Git.
- `.env.example` documenta variables sin contener claves reales.
- No se registran coordenadas de navegación, audio ni tokens.
- Los datos descargados y los resultados generados permanecen ignorados.

La documentación técnica y académica sanitizada se versiona en `docs/`. Las
notas personales o históricas no evaluables permanecen en `docs/private/`, que
está ignorada por Git.
