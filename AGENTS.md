# AGENTS.md

Instrucciones para agentes y colaboradores que trabajen en este TFM.

## Contexto del proyecto

Este repositorio contiene un TFM de IA aplicada: una aplicación móvil
`local-first` para Madrid capital que recomienda rutas peatonales accesibles y
personalizadas para personas ciegas o con baja visión.

El MVP debe permitir:

- Configurar un perfil inicial de usuario y preferencias de accesibilidad.
- Buscar rutas peatonales origen-destino y navegar con GPS solo en primer plano.
- Comparar rutas alternativas por índice de adecuación, confianza e incertidumbre.
- Explicar por qué una ruta se recomienda sobre otra.
- Generar narración `turn-by-turn` en español, lista para TTS.

La IA principal del proyecto es el sistema de decisión y clasificación adaptativa
(*ranking*): índice de adecuación explicable más aprendizaje mediante la
retroalimentación del usuario. Los
VLM quedan como extensión final y opcional, no como núcleo inicial del MVP.

## Estructura esperada

Mantener esta organización salvo que se explique y justifique un cambio:

```text
backend/      # FastAPI + lógica de dominio
  api/        # modelos HTTP y endpoints versionados
  domain/     # modelos de datos compartidos y reglas de validación
  routing/    # cliente OpenRouteService primero; Valhalla como evolución
  scoring/    # índice de adecuación explicable y fácil de probar
  services/   # coordinación entre proveedores, scoring y API
  enrichment/ # OpenStreetMap, Overpass y metadatos Mapillary
  narration/  # plantillas deterministas para instrucciones
  feedback/   # aprendizaje adaptativo seguro por retroalimentación
ml/           # experimentos IA/VLM; no producción
app/          # React Native + Expo + TypeScript
docs/         # arquitectura, especificación, seguridad y journal
tests/        # pruebas pytest del backend y la lógica
notebooks/    # exploración reproducible
```

Documentos esperados al inicio:

- `docs/architecture.md`
- `docs/accessibility-spec.md`
- `docs/ai-strategy.md`
- `docs/safety.md`
- `docs/journal.md`

### Organización de la documentación

`docs/README.md` es el índice principal y define la fuente oficial de cada tema.
Mantener en la raíz los documentos normativos anteriores y clasificar el resto:

```text
docs/
  product/     # alcance, especificaciones y comportamiento de usuario
  research/    # decisiones, metodología y componentes de IA
  evaluation/  # plan, experimentos, resultados y limitaciones
  operations/  # entorno, caché, servicios externos e incidencias
  memoria/     # guion y capítulos académicos en construcción
  figures/     # inventario y pies de figuras
  templates/   # plantillas documentales
  private/     # notas locales no evaluables; siempre ignoradas
```

Toda funcionalidad nueva debe seguir `docs/templates/feature.md` e indicar estado,
problema, requisitos, alternativas, decisión, justificación, entradas y salidas,
implementación, pruebas, resultados, riesgos, texto base para la memoria y
trabajo pendiente. Colocarla según su responsabilidad principal y enlazarla
desde `docs/README.md`.

No duplicar explicaciones completas en `docs/journal.md`: registrar una entrada
cronológica breve y enlazar la fuente principal. Los capítulos de `docs/memoria`
integran las fuentes técnicas, pero no deben convertirse en una segunda fuente
de especificaciones.

Toda la documentación y todos los textos de interfaz escritos en español deben
respetar la ortografía académica, incluidas las tildes, los signos de apertura y
la concordancia. Antes de entregar un cambio, revisar también los anglicismos
innecesarios; los identificadores de código y los términos técnicos que deban
conservarse se escribirán entre comillas o con formato de código.

La documentación sanitizada se versiona y debe ser adecuada para los
evaluadores y para una eventual publicación del repositorio. No incluir tokens,
rutas locales, correos privados, trazas GPS, datos de participantes ni
decisiones obsoletas sin marcarlas como históricas. Guardar las notas no
evaluables en `docs/private/`, que permanece ignorada; no usar esa carpeta para
almacenar secretos reales.

## Estilo de código

### Python

- Usar Python 3.9.
- Usar FastAPI, Pydantic v2, httpx asíncrono y pytest.
- Toda función pública debe tener type hints y un docstring breve de estilo Google.
- Usar `pydantic.BaseModel` para datos que cruzan límites de módulo o de API.
- Mantener el scoring como lógica determinista, pura cuando sea posible y fácil
  de probar.
- Usar `logging`, nunca `print`, en código de aplicación.
- No codificar claves, tokens ni secretos. Usar variables de entorno y `.env`
  local no versionado.
- No inventar tags OSM, endpoints ni parámetros externos. Si hay dudas, marcar
  `# TODO: verificar en docs oficiales`.

### TypeScript y React Native

- Usar React Native + Expo + TypeScript.
- Componentes funcionales con hooks; no usar clases.
- Props tipadas con `interface`.
- Un componente por archivo, con nombres `PascalCase.tsx`.
- Strings de UI en `app/i18n/es.ts`, no codificadas directamente en JSX.
- Todo elemento interactivo debe tener `accessibilityLabel`,
  `accessibilityHint` cuando aporte valor y `accessibilityRole` correcto.
- Cumplir contraste WCAG 2.2 AA y tamaños táctiles mínimos de 44 × 44 pt.

## Reglas de seguridad y accesibilidad

- Nunca afirmar que una ruta es «accesible» de forma absoluta.
- Toda ruta debe exponer índice, confianza, incertidumbre y razones.
- Un dato desconocido nunca suma como evidencia positiva.
- Los atributos `unknown` deben penalizar, reducir la confianza o generar un aviso.
- Un falso positivo de accesibilidad es crítico: es preferible avisar de la
  incertidumbre antes que prometer seguridad.
- El aprendizaje por retroalimentación no puede eliminar penalizaciones críticas ni
  ocultar incertidumbre.
- No enviar datos personales ni la ubicación del usuario a terceros sin
  consentimiento explícito.

## IA en el proyecto

Separar claramente:

- Determinista: cálculo de rutas, reglas base de puntuación y narración por
  plantillas.
- IA principal: clasificación adaptativa mediante un índice de adecuación y
  aprendizaje por retroalimentación.
- Experimental: VLM sobre Mapillary para enriquecer atributos faltantes, solo al
  final y en notebooks reproducibles.

No usar un LLM para decidir si una ruta es segura. Si se usa un LLM para la
narración, debe reformular información ya validada, no inventar datos.

## Pruebas

Cuando exista el backend, ejecutar:

```powershell
python -m pytest
```

Cuando exista lint de Python, ejecutar:

```powershell
python -m ruff check .
```

Cuando exista la aplicación Expo, ejecutar:

```powershell
npm test
npm run lint
```

Pruebas mínimas esperadas:

- Puntuación con distintos perfiles de usuario.
- Clasificación con pesos diferentes y orden esperado.
- Incertidumbre: `unknown` nunca mejora el índice.
- Narración: avisos obligatorios cuando hay baja confianza.
- Retroalimentación: ajuste de pesos sin romper límites de seguridad.
- API: validación de entrada, errores externos y respuestas estructuradas.

Si no puedes ejecutar las pruebas porque el proyecto aún no está inicializado,
dilo explícitamente en la respuesta final.

## Arranque local

Backend previsto:

```powershell
uvicorn backend.main:app --reload
```

Aplicación móvil prevista:

```powershell
npm install
npm run start
```

No asumir que estos comandos existen hasta que se haya creado la estructura
correspondiente. Si cambian los comandos reales, actualizar este archivo y el
README.

## Flujo de trabajo

- Antes de introducir cambios de arquitectura, scoring o seguridad, actualizar
  o proponer cambios en `docs/`.
- Trabajar en slices pequeños y verticales.
- No implementar «todo el módulo» si se puede entregar una pieza menor y fácil
  de probar.
- Anotar las decisiones relevantes en `docs/journal.md`.
- Mantener commits pequeños y descriptivos.
- No subir `.env`, datasets pesados, imágenes Mapillary descargadas masivamente
  ni modelos `.bin` o `.safetensors`.

## Cambios grandes

No hacer cambios grandes sin explicarlos antes en la conversación o en una nota
de planificación.

Se considera un cambio grande:

- Cambiar el stack tecnológico.
- Cambiar la estructura principal del repositorio.
- Introducir una dependencia pesada.
- Cambiar la fórmula del índice de adecuación.
- Cambiar la política de incertidumbre o seguridad.
- Sustituir OpenRouteService por otro motor.
- Añadir GPS real.
- Integrar VLM o LLM en flujos de usuario.

Para cambios grandes, explicar:

1. Qué problema resuelve.
2. Qué alternativas se descartaron.
3. Qué archivos o módulos afecta.
4. Cómo se va a probar.
5. Qué riesgos introduce.

## Prioridades actuales

Orden recomendado de trabajo:

1. Documentación base del TFM.
2. Estudio de densidad de datos en Madrid.
3. Modelo de accesibilidad personalizable.
4. Backend MVP local.
5. Aplicación móvil MVP con navegación simulada.
6. Retroalimentación y aprendizaje adaptativo.
7. GPS en primer plano y rerouting confirmado.
8. Evaluación académica.
9. VLM como extensión final.
