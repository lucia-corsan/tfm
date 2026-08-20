# Rutas peatonales personalizadas y accesibles

TFM de IA aplicada para comparar rutas peatonales según las preferencias de
personas ciegas o con baja visión. El sistema separa adecuación al perfil,
confianza e incertidumbre; nunca afirma que una ruta sea accesible de forma
absoluta.

## Estado

El repositorio contiene un prototipo Android conectado a un backend FastAPI.
Ya integra rutas reales de OpenRouteService, enriquecimiento local con OSM,
navegación con GPS en primer plano, recálculo confirmado y un núcleo de
aprendizaje adaptativo evaluado en simulación e integrado en la aplicación con
consentimiento y persistencia SQLite local. Una segunda evaluación con costes
de rutas ORS y OSM conserva un resultado negativo de transferencia que
justifica mantener el aprendizaje opcional. La evaluación con participantes y
con elecciones longitudinales de rutas reales continúa pendiente.

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

El entorno de desarrollo incluye Matplotlib para reproducir las figuras de la
evaluación del aprendizaje adaptativo.

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

La comprobación completa de backend, app y exportación Android se puede ejecutar
desde la raíz con:

```bash
bash scripts/verificar-mvp.sh
```

## Aplicación Android

```bash
cd app
npm ci
npm test
npm run lint
npm run typecheck
npm run export:android
npm run start
```

La aplicación usa Expo SDK 57, React Native 0.86 y TypeScript estricto. El paquete
Android puede validarse sin emulador con el comando documentado en `app/README.md`.
El guion completo para preparar y recuperar una demostración está en
[`docs/operations/guia-demostracion.md`](docs/operations/guia-demostracion.md).

## Configuración y secretos

- `.env` es local y está ignorado por Git.
- `.env.example` documenta variables sin contener claves reales.
- No se registran coordenadas de navegación, audio ni tokens.
- Los datos descargados y los resultados generados permanecen ignorados.

La documentación técnica y académica sanitizada se versiona en `docs/`. Las
notas personales o históricas no evaluables permanecen en `docs/private/`, que
está ignorada por Git.
