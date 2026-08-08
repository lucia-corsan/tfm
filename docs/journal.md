# Journal de desarrollo

## 8 de agosto de 2026 — Base del día 1

### Decisiones

- Python objetivo: 3.9, según la decisión actual del proyecto.
- Backend: FastAPI, Pydantic v2, `httpx` y pytest.
- App: Expo SDK 57, React Native 0.86, React 19 y TypeScript estricto.
- Node: 24 LTS.
- Android primero; no se genera código nativo hasta necesitar una development build.
- Proveedor inicial de rutas: fixtures reproducibles.

### Trabajo completado

- Estructura modular del backend.
- Endpoint público `GET /api/v1/health`.
- Primera prueba de API y configuración de Ruff.
- Plantilla oficial Expo simplificada a una pantalla propia accesible.
- Textos de UI centralizados en español.
- Primera prueba de interacción, lint y comprobación de tipos.
- Exportación satisfactoria del paquete Android.
- CI inicial separada para backend y app.

### Incidencias

La plantilla oficial inicial incluía un hook web que no superaba la regla
`react-hooks/set-state-in-effect`. Se eliminó el tutorial y se sustituyó por una
base mínima del producto.

`npm audit` informa de vulnerabilidades transitivas en `image-size`, Metro y
`uuid`. `expo-doctor` supera 20 de 20 comprobaciones. La corrección automática
con `--force` propone degradar Expo 57 a Expo 53, por lo que se rechaza: rompería
la matriz de compatibilidad validada. Se revisará al actualizar Expo SDK 57. Las
dependencias afectadas forman parte principalmente de herramientas de build; no
se interpretará esto como riesgo cero y se mantendrá registrado.

### Verificaciones

```text
Backend: Ruff correcto; pytest 1/1.
App: Jest 1/1; ESLint correcto; TypeScript correcto.
Expo Doctor: 20/20.
Bundle Android: generado correctamente.
```

### Validación manual en Android

- Se instaló Android 16 (API 36) con una imagen ARM64 y Google Play.
- Se creó y ejecutó un Pixel 9 virtual en Apple Silicon.
- Se configuraron `ANDROID_HOME`, Emulator y Platform Tools en el entorno local.
- La app se abrió correctamente mediante Expo SDK 57.
- TalkBack recorrió y leyó correctamente el contenido y los controles de la
  primera pantalla.

Con esta comprobación queda cerrado el día 1: no solo existe un paquete válido,
sino que la interfaz inicial se ha probado en el sistema Android objetivo con
lector de pantalla real.

## 8 de agosto de 2026 — Modelos de dominio del día 2

### Decisiones

- Se crea `backend/domain` como modelo compartido entre routing, scoring y API.
- La evidencia usa tres estados explícitos: favorable, desfavorable y desconocido.
- Perfil, restricciones críticas y preferencias graduables se mantienen separados.
- El porcentaje de incertidumbre se deriva de los atributos desconocidos, en vez
  de aceptar un número independiente que pudiera contradecirlos.
- Los datos locales de desarrollo se marcan obligatoriamente como sintéticos.

### Trabajo completado

- Modelos Pydantic de coordenadas, perfil, pesos, evidencia, características,
  incertidumbre, candidato de ruta y escenario origen-destino.
- Validaciones de rangos geográficos, porcentajes, conteos y campos inesperados.
- Regla estructural que impide ocultar evidencia desconocida.
- Fixture reproducible Moncloa–Argüelles–Príncipe Pío con tres alternativas y
  distintos niveles de incertidumbre.
- Pruebas de modelos, reglas de validación y carga del escenario local.

Los atributos de los fixtures son ejemplos sintéticos para desarrollo y no se
consideran mediciones reales del área piloto.

La justificación extensa de los modelos, su relación con los datos reales y
sus limitaciones actuales se ha consolidado en
`docs/research/modelo-dominio-accesibilidad.md` para facilitar su reutilización
en la memoria.

### Verificaciones

```text
Ruff: correcto.
Pytest: 9/9.
```

## 8 de agosto de 2026 — Reorganización de la documentación

### Decisión

Se mantiene en la raíz únicamente la documentación normativa esperada por
`AGENTS.md`. El resto se organiza por función en `product`, `research`,
`evaluation`, `operations`, `memoria` y `figures`.

`docs/README.md` pasa a ser el índice principal y
`docs/templates/feature.md` establece el formato obligatorio para nuevas
funcionalidades. El diario conservará la cronología y los enlaces, sin duplicar
explicaciones extensas.

### Trabajo completado

- Traslado del plan del MVP a `product/`.
- Traslado del estudio de selección y del modelo de dominio a `research/`.
- Creación de fuentes temáticas para API, GPS, narración, puntuación, aprendizaje y
  servicios geoespaciales.
- Creación de plan, registro, resultados y limitaciones de evaluación.
- Separación de entorno, caché e incidencias operativas.
- Creación del guion de memoria, capítulos y registro de referencias.
- Creación del inventario y los pies de figuras.

En ese momento la carpeta completa continuaba ignorada por Git y requería
respaldo externo. La política se revisó posteriormente para publicar únicamente
la documentación sanitizada.

## 8 de agosto de 2026 — Versionado de documentación evaluable

### Decisión

La documentación técnica y académica sanitizada pasa a versionarse en el
repositorio privado. Solo `docs/private/` permanece ignorada para notas
históricas o personales no evaluables.

### Auditoría

No se encontraron tokens reales, correos personales ni rutas locales en los
documentos públicos. El ejemplo de token Mapillary se sustituyó por un marcador
genérico. El dossier exploratorio original mezclaba metodología con
resolución de incidencias y referencias ya superadas; se trasladó a
`docs/private/notas-historicas/` y se creó una versión pública depurada en
`docs/research/seleccion-area-piloto.md`.

### Invariantes de publicación

- `.env`, conjuntos de datos, resultados pesados y trazas GPS continúan ignorados.
- Un archivo ignorado tampoco debe contener credenciales reales.
- Los documentos públicos distinguen trabajo implementado, pendiente y
  resultados observados.
- Antes de hacer público el repositorio se repetirá la auditoría completa.

## 8 de agosto de 2026 — Revisión lingüística

### Decisión

Todo texto público en español se revisará antes de versionarse. La revisión
incluye ortografía, tildes, puntuación, concordancia y sustitución de
anglicismos innecesarios. Los identificadores de código y los términos técnicos
sin una alternativa española suficientemente precisa conservarán su forma
original y se distinguirán mediante formato de código o cursiva.

### Trabajo completado

- Revisión de la documentación pública y de los textos visibles de la
  aplicación.
- Corrección de las normas de `AGENTS.md` y de las instrucciones de Copilot.
- Incorporación de una lista de comprobación lingüística a la plantilla de
  funcionalidades.
- Validación de los enlaces internos después de actualizar títulos y
  terminología.

## 8 de agosto de 2026 — Ranking explicable del día 3

### Decisiones

- Las diez categorías del estudio OSM se conservan como evidencia detallada,
  pero los aspectos relacionados de un mismo cruce se agregan para evitar doble
  conteo.
- Las restricciones críticas se aplican antes del coste gradual y solo una
  incompatibilidad confirmada puede descartar una ruta.
- Los pesos se normalizan para sumar uno sin modificar el perfil declarado.
- Los costes usan escalas fijas entre cero y uno; los techos iniciales se
  someterán a análisis de sensibilidad.
- Adecuación, confianza e incertidumbre permanecen separadas.
- Las razones y los avisos son estructuras derivadas del cálculo; la traducción
  a texto para interfaz, TalkBack y TTS se realizará mediante plantillas.

### Trabajo completado

- Ampliación del dominio y los *fixtures* con cruces, semáforos, sonido,
  vibración, pavimento podotáctil, bordillos, aceras, rampas, escalones,
  superficie y pendiente.
- Evaluación pura de cinco restricciones críticas.
- Normalización de pesos y costes temáticos.
- Cálculo trazable de adecuación, confianza e incertidumbre.
- Ranking determinista, rutas rechazadas, factores explicativos y avisos.
- Perfiles de prueba que demuestran cambios de orden reproducibles.

### Verificaciones

```text
Ruff: correcto.
Pytest: 41/41.
```

Los resultados son validaciones técnicas sobre datos sintéticos. No demuestran
todavía accesibilidad real ni sustituyen la evaluación con rutas enriquecidas y
usuarios.
