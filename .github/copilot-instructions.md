# Copilot instructions — TFM: App de navegación accesible para personas ciegas

> Este archivo es leído automáticamente por GitHub Copilot. Define el contexto persistente del proyecto. Mantenlo conciso y actualizado.

## 1. Contexto del proyecto

Trabajo de Fin de Máster (TFM) que desarrolla una aplicación móvil para facilitar el tránsito peatonal por la calle a personas ciegas y con baja visión.

Funcionalidad nuclear:
1. Cálculo de rutas peatonales A→B con varias alternativas.
2. **Scoring de accesibilidad** por tramo (aceras, rampas, semáforos sonoros, pavimento táctil, pendiente, cruces).
3. **Narración turn-by-turn** enriquecida con información de accesibilidad.
4. Comparativa entre rutas alternativas.

Objetivos académicos:
- Contribución honesta: uso de **VLMs zero-shot** (Qwen-VL / LLaVA) sobre imágenes Mapillary para rellenar atributos de accesibilidad que faltan en OSM. Se evalúa precisión y se reportan límites; no se promete un sistema en producción.
- Reproducibilidad: versiones fijadas, datos y seeds documentados.
- Análisis de fallos (FMEA): un scoring erróneo puede poner en peligro al usuario.

## 2. Usuarios y accesibilidad

- **Usuarios target**: personas ciegas (congénitas y adquiridas) y con baja visión. Usuarios de bastón y de perro guía.
- **Lectores de pantalla soportados**: TalkBack (Android) y VoiceOver (iOS). NO se prioriza JAWS/NVDA salvo que se añada versión web.
- **Idioma de la UI y narraciones**: español.
- **Toda UI debe cumplir**:
  - `accessibilityLabel` y `accessibilityHint` en todos los elementos interactivos.
  - `accessibilityRole` correcto (`button`, `header`, `text`, etc.).
  - Orden de foco lógico (top→bottom, left→right).
  - Ningún elemento únicamente visual (icono sin label = no existe).
  - Contraste mínimo WCAG 2.2 AA para usuarios con baja visión.
  - Tamaños de toque ≥ 44×44 pt.
- **Narraciones**: concisas, con distancias en metros, puntos de referencia táctiles/sonoros y avisos de peligro. Usuarios experimentados escuchan TTS a 300-500 palabras/minuto: no añadas relleno.

## 3. Stack tecnológico fijado

- **Backend**: Python 3.13, FastAPI, Pydantic v2, httpx (async), pytest.
- **Routing engine**: OpenRouteService (API pública) en fase inicial; Valhalla en Docker como evolución.
- **Datos de calle**: OpenStreetMap (Overpass API) + Mapillary API (detecciones de objetos).
- **VLM**: Qwen2.5-VL o LLaVA-OneVision vía `transformers`. Ejecución en notebooks de evaluación, no en producción.
- **Narración**: plantillas Jinja2 deterministas primero. LLM (Llama-3.1-8B local vía Ollama) solo como capa opcional de reescritura.
- **Frontend móvil**: React Native + Expo (TypeScript). TTS nativo del SO.
- **Formato/lint**: `ruff` (Python), `prettier` + `eslint` (TS).

## 4. Restricciones obligatorias

- ❌ **Prohibido** usar Google Maps, Google Places, Google Street View u otras APIs con ToS que prohíban descarga masiva o uso para entrenamiento.
- ❌ **Prohibido** hardcodear API keys, tokens o secretos. Usar variables de entorno (`.env`) y `python-dotenv` / `expo-constants`.
- ❌ **Prohibido** inventar tags OSM, endpoints o parámetros de APIs. Si dudas, marca `# TODO: verificar en docs oficiales` en lugar de adivinar.
- ❌ **Prohibido** entrenar modelos sin dataset documentado y reproducible.
- ❌ **Prohibido** subir al repo: `.env`, datasets pesados, imágenes Mapillary descargadas masivamente, modelos `.bin`/`.safetensors`.
- ✅ Toda dependencia nueva debe añadirse a `requirements.txt` / `package.json` con versión fijada.
- ✅ Toda función pública debe tener type hints y docstring breve (estilo Google).

## 5. Convenciones de código

### Python
- Type hints obligatorios en firmas públicas.
- `pydantic.BaseModel` para todos los datos que cruzan límites de módulo.
- Funciones puras siempre que sea posible (el scoring debe ser determinista y testeable).
- Logs con `logging` estándar, nunca `print`.
- Tests en `tests/` con `pytest`, nombres `test_*.py`. Casos parametrizados para scoring.

### TypeScript / React Native
- Componentes funcionales con hooks. Nada de clases.
- Props tipadas con `interface`.
- Un componente = un archivo. Nombres `PascalCase.tsx`.
- Strings de UI en `app/i18n/es.ts`, nunca hardcodeadas en JSX.

### Estructura del repo
```
backend/      # FastAPI + lógica
  routing/    # cliente ORS/Valhalla
  scoring/    # reglas de accesibilidad
  enrichment/ # OSM + Mapillary
  narration/  # plantillas + LLM opcional
ml/           # experimentos VLM zero-shot
app/          # React Native + Expo
docs/         # arquitectura, spec, evaluación, journal
tests/        # pytest
notebooks/    # exploración (no producción)
```

## 6. Workflow de desarrollo

1. **Documentación primero**: si el cambio afecta a arquitectura o reglas de scoring, actualiza primero `docs/architecture.md` o `docs/accessibility-spec.md`.
2. **Slices verticales**: cambios pequeños que aporten valor end-to-end. No "haz el módulo entero".
3. **Tests antes o a la vez** que el código de lógica, especialmente en `scoring/`.
4. **Commits pequeños**, mensajes en imperativo en español o inglés (consistente por commit).
5. **Anotar decisiones** relevantes en `docs/journal.md`.

## 7. Seguridad y análisis de fallos

- Un falso positivo en accesibilidad (decir "accesible" cuando no lo es) es **crítico**. Toda función de scoring debe poder devolver `unknown` cuando faltan datos, nunca asumir un valor seguro.
- Endpoints API: validar entrada con Pydantic, devolver errores explícitos.
- Sin telemetría ni envío de datos del usuario a terceros sin consentimiento explícito.
- Documentar modos de fallo en `docs/safety.md`.

## 8. Cuando generes código

- **Respeta los modelos Pydantic** definidos en `backend/models.py` (cuando exista). No crees variantes paralelas.
- **No añadas funcionalidad no pedida.** Si crees que falta algo, propónlo en comentario `# NOTE:`, no lo implementes.
- **Si no estás seguro** de un dato externo (tag OSM, endpoint API, nombre de modelo), pide confirmación o marca `# TODO: verificar`.
- **Para UI**, antes de generar JSX comprueba que cada elemento interactivo lleva `accessibilityLabel` en español.
- **Para narraciones**, prioriza plantillas deterministas; LLM solo si se pide explícitamente.
