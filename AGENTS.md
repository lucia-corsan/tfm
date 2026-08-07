# AGENTS.md

Instrucciones para agentes y colaboradores que trabajen en este TFM.

## Contexto Del Proyecto

Este repositorio contiene un TFM de IA aplicada: una app movil local-first para Madrid capital que recomienda rutas peatonales accesibles y personalizadas para personas ciegas o con baja vision.

El MVP debe permitir:

- Configurar un perfil inicial de usuario y preferencias de accesibilidad.
- Buscar rutas peatonales origen-destino y navegar con GPS solo en primer plano.
- Comparar rutas alternativas por indice de accesibilidad, confianza e incertidumbre.
- Explicar por que una ruta se recomienda sobre otra.
- Generar narracion turn-by-turn en espanol, lista para TTS.

La IA principal del proyecto es el sistema de decision/ranking adaptativo: indice de accesibilidad explicable mas aprendizaje por feedback del usuario. Los VLMs quedan como extension final y opcional, no como nucleo inicial del MVP.

## Estructura Esperada

Mantener esta organizacion salvo que se explique y justifique un cambio:

```text
backend/      # FastAPI + logica de dominio
  routing/    # cliente OpenRouteService primero; Valhalla como evolucion
  scoring/    # indice de accesibilidad explicable y testeable
  enrichment/ # OpenStreetMap, Overpass y Mapillary metadata
  narration/  # plantillas deterministas para instrucciones
  feedback/   # aprendizaje adaptativo seguro por feedback
ml/           # experimentos IA/VLM; no produccion
app/          # React Native + Expo + TypeScript
docs/         # arquitectura, especificacion, seguridad, journal
tests/        # tests pytest del backend y logica
notebooks/    # exploracion reproducible
```

Documentos esperados al inicio:

- `docs/architecture.md`
- `docs/accessibility-spec.md`
- `docs/ai-strategy.md`
- `docs/safety.md`
- `docs/journal.md`

## Estilo De Codigo

### Python

- Usar Python 3.9.
- Usar FastAPI, Pydantic v2, httpx async y pytest.
- Toda funcion publica debe tener type hints y docstring breve estilo Google.
- Usar `pydantic.BaseModel` para datos que cruzan limites de modulo o API.
- Mantener el scoring como logica determinista, pura cuando sea posible y facil de testear.
- Usar `logging`, nunca `print`, en codigo de aplicacion.
- No hardcodear claves, tokens ni secretos. Usar variables de entorno y `.env` local no versionado.
- No inventar tags OSM, endpoints ni parametros externos. Si hay duda, marcar `# TODO: verificar en docs oficiales`.

### TypeScript / React Native

- Usar React Native + Expo + TypeScript.
- Componentes funcionales con hooks; no usar clases.
- Props tipadas con `interface`.
- Un componente por archivo, con nombres `PascalCase.tsx`.
- Strings de UI en `app/i18n/es.ts`, no hardcodeadas en JSX.
- Todo elemento interactivo debe tener `accessibilityLabel`, `accessibilityHint` cuando aporte valor y `accessibilityRole` correcto.
- Cumplir contraste WCAG 2.2 AA y tamanos tactiles minimos de 44 x 44 pt.

## Reglas De Seguridad Y Accesibilidad

- Nunca afirmar que una ruta es "accesible" de forma absoluta.
- Toda ruta debe exponer indice, confianza, incertidumbre y razones.
- Un dato desconocido nunca suma como evidencia positiva.
- Los atributos `unknown` deben penalizar, reducir confianza o generar aviso.
- Un falso positivo de accesibilidad es critico: es preferible avisar incertidumbre antes que prometer seguridad.
- El aprendizaje por feedback no puede eliminar penalizaciones criticas ni ocultar incertidumbre.
- No enviar datos personales o ubicacion del usuario a terceros sin consentimiento explicito.

## IA En El Proyecto

Separar claramente:

- Determinista: routing, reglas base de scoring, narracion por plantillas.
- IA principal: ranking adaptativo mediante indice de accesibilidad y aprendizaje por feedback.
- Experimental: VLMs sobre Mapillary para enriquecer atributos faltantes, solo al final y en notebooks reproducibles.

No usar un LLM para decidir si una ruta es segura. Si se usa un LLM para narracion, debe reformular informacion ya validada, no inventar datos.

## Tests

Cuando exista el backend, ejecutar:

```powershell
python -m pytest
```

Cuando exista lint Python, ejecutar:

```powershell
python -m ruff check .
```

Cuando exista la app Expo, ejecutar:

```powershell
npm test
npm run lint
```

Tests minimos esperados:

- Scoring con distintos perfiles de usuario.
- Ranking con pesos diferentes y orden esperado.
- Incertidumbre: `unknown` nunca mejora el indice.
- Narracion: avisos obligatorios cuando hay baja confianza.
- Feedback: ajuste de pesos sin romper limites de seguridad.
- API: validacion de entrada, errores externos y respuestas estructuradas.

Si no puedes ejecutar tests porque el proyecto aun no esta inicializado, dilo explicitamente en la respuesta final.

## Arranque Local

Backend previsto:

```powershell
uvicorn backend.main:app --reload
```

App movil prevista:

```powershell
npm install
npm run start
```

No asumir que estos comandos existen hasta que se haya creado la estructura correspondiente. Si se cambian los comandos reales, actualizar este archivo y el README.

## Flujo De Trabajo

- Antes de cambios de arquitectura, scoring o seguridad, actualizar o proponer cambios en `docs/`.
- Trabajar en slices pequenos y verticales.
- No implementar "todo el modulo" si se puede entregar una pieza testeable menor.
- Anotar decisiones relevantes en `docs/journal.md`.
- Mantener commits pequenos y descriptivos.
- No subir `.env`, datasets pesados, imagenes Mapillary descargadas masivamente ni modelos `.bin`/`.safetensors`.

## Cambios Grandes

No hagas cambios grandes sin explicarlos antes en la conversacion o en una nota de plan.

Se considera cambio grande:

- Cambiar stack tecnologico.
- Cambiar estructura principal del repo.
- Introducir una nueva dependencia pesada.
- Cambiar la formula del indice de accesibilidad.
- Cambiar la politica de incertidumbre o seguridad.
- Sustituir OpenRouteService por otro motor.
- Anadir GPS real.
- Integrar VLMs o LLMs en flujos de usuario.

Para cambios grandes, explica:

1. Que problema resuelve.
2. Que alternativas se descartaron.
3. Que archivos o modulos toca.
4. Como se va a probar.
5. Que riesgos introduce.

## Prioridades Actuales

Orden recomendado de trabajo:

1. Documentacion base del TFM.
2. Estudio de densidad de datos en Madrid.
3. Modelo de accesibilidad personalizable.
4. Backend MVP local.
5. App movil MVP con navegacion simulada.
6. Feedback y aprendizaje adaptativo.
7. GPS en primer plano y rerouting confirmado.
8. Evaluacion academica.
9. VLMs como extension final.
