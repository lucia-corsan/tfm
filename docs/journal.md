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

## 8 de agosto de 2026 — API de comparación del día 4

### Decisiones

- La aplicación envía origen, destino y perfil, pero no elige el proveedor de
  rutas; esta decisión pertenece a la configuración del backend.
- Un servicio independiente coordina proveedor, restricciones, ranking y
  respuesta para evitar lógica de decisión dentro del endpoint.
- El proveedor de *fixtures* solo resuelve las coordenadas del trayecto piloto,
  con una tolerancia determinista de `0,00001` grados.
- Las rutas aceptadas conservan geometría, métricas, factores y avisos; las
  incompatibles se devuelven separadas con códigos de restricción.
- Los errores 404, 422 y 503 utilizan códigos estables y no repiten coordenadas,
  URLs externas ni credenciales.

### Trabajo completado

- Modelos Pydantic públicos de petición, respuesta y error.
- Abstracción de proveedor y primera implementación mediante *fixtures*.
- Servicio de comparación reutilizable fuera de FastAPI.
- Endpoint `POST /api/v1/routes/compare` documentado mediante OpenAPI.
- Personalización del orden mediante los pesos enviados en el perfil.
- Pruebas de validación, seguridad, reproducibilidad y esquemas HTTP.

### Verificaciones

```text
Ruff: correcto.
Pytest: 58/58.
Swagger: respuesta 200 verificada con el perfil centrado en cruces.
```

La comprobación manual confirmó que `fewer_crossings_route` ocupa el primer
puesto cuando `complex_crossings` recibe todo el peso, que `balanced_route`
pasa al segundo puesto y que `simple_route` se mantiene excluida por cruces
incompatibles. Esto demuestra que los pesos modifican el ranking sin alterar
las restricciones críticas.

La API continúa utilizando datos sintéticos. ORS, los datos reales y la conexión
con la aplicación móvil pertenecen a las siguientes fases.

## 9 de agosto de 2026 — Comparación móvil del día 5

### Decisiones

- La app separa tipos, validación en ejecución, cliente HTTP, estado y
  presentación para no duplicar el sistema de decisión en la pantalla.
- Se mantiene una validación móvil explícita sin añadir otra dependencia. Se
  revisará esta elección si el esquema público aumenta de forma sustancial.
- La URL local se configura con `EXPO_PUBLIC_API_URL`; ninguna credencial puede
  almacenarse en variables públicas de Expo.
- El perfil de cruces utiliza un peso ocho veces mayor para esa dimensión, pero
  conserva activas las otras ocho. Así demuestra sensibilidad sin ignorar
  distancia, pendiente o incertidumbre.
- Las respuestas antiguas se ignoran cuando cambia el perfil, evitando asociar
  un ranking a una selección que ya no está activa.
- La interfaz anuncia un resumen breve del resultado. Las métricas, razones y
  avisos quedan disponibles mediante navegación para no saturar TalkBack.
- La app traduce estructuras recibidas; no recalcula adecuación ni genera
  razones diferentes de las utilizadas por el backend.

### Trabajo completado

- Tipos TypeScript equivalentes a los modelos públicos de comparación.
- Validación de estructura, rangos, identificadores, ranking y coherencia
  matemática de las respuestas.
- Configuración específica de Android Emulator y cliente HTTP sin registros de
  coordenadas.
- Perfiles equilibrado y orientado a cruces sencillos.
- Estado inicial, carga, resultado, error y descarte de respuestas obsoletas.
- Pantalla accesible con métricas, factores, avisos, descartes y reintento.
- Eliminación de la portada técnica y sus componentes, ya sustituidos por el
  primer flujo funcional.

### Verificaciones

```text
Backend: Ruff correcto y Pytest 58/58.
App: Jest 26/26, ESLint correcto y TypeScript estricto correcto.
Integración directa: HTTP 200 y `fewer_crossings_route` en primer lugar con los
pesos exactos del perfil móvil.
Diff: sin errores de espacios.
```

La validación manual en el Pixel confirmó el orden de ambos perfiles, el error
con FastAPI detenido, la recuperación tras reiniciarlo y la lectura de controles
y resultados mediante TalkBack. El día 5 y la primera semana quedan cerrados.
Las rutas continúan siendo sintéticas; este resultado demuestra la integración
técnica y el cambio explicable de ranking, no la accesibilidad real del corredor.

## 10 de agosto de 2026 — Rutas base reales de la semana 2, día 1

### Decisiones

- ORS utiliza `foot-walking` porque el ámbito son recorridos peatonales para
  personas ciegas o con baja visión; `wheelchair` representaría necesidades de
  movilidad diferentes.
- La respuesta elegida es GeoJSON para disponer de coordenadas explícitas.
- Se solicitan hasta tres alternativas, instrucciones en español y datos
  auxiliares de pendiente, superficie y tipo de vía.
- La prohibición de escalones se transmite a ORS, pero no se interpreta como
  garantía absoluta porque depende de la cobertura de sus datos.
- Las rutas ORS se mantienen como rutas base hasta completar el enriquecimiento
  OSM. No se asigna cero a cruces u obstáculos que ORS no haya medido.
- La caché es local, privada, versionada y ajena a posiciones GPS de navegación.

### Trabajo completado

- Modelos validados para petición, GeoJSON, instrucciones, segmentos,
  procedencia y datos auxiliares.
- Cliente `httpx` asíncrono con tiempo máximo, reintentos acotados y errores
  sanitizados.
- Caché atómica con claves SHA-256 sin credenciales y detección de entradas
  corruptas o reutilizadas para otra consulta.
- Transformación a rutas base con geometría en el orden interno, métricas,
  instrucciones y giros derivados de los códigos oficiales.
- Proveedor interno y comando de comprobación manual para el corredor piloto.
- Bloqueo deliberado de la exposición pública hasta completar OSM.

### Verificaciones

```text
Pruebas específicas de ORS: 33/33.
Backend completo: Pytest 91/91.
Ruff: correcto.
Petición real a ORS: HTTP 200 y 3 rutas base válidas.
Caché: segunda ejecución idéntica sin nueva petición HTTP.
```

Las rutas obtenidas midieron 2.715, 2.734 y 2.868 metros; sus duraciones fueron
1.955, 1.968 y 2.065 segundos, y contuvieron 32, 40 y 29 instrucciones. Estas
medidas validan la integración técnica, no la accesibilidad de los recorridos.

La justificación, los riesgos, la privacidad y el texto reutilizable en la
memoria se detallan en
[Integración de OpenRouteService](research/integracion-openrouteservice.md).

## 10 de agosto de 2026 — Ampliación del conjunto de rutas candidatas

### Problema identificado

Una petición ORS devuelve un conjunto pequeño de alternativas. El ranking solo
puede elegir entre esas rutas y, por tanto, una candidata más adecuada podría
quedar fuera antes del enriquecimiento. Las tres rutas actuales no se
interpretarán como todas las posibilidades.

### Decisión

- Mantener la consulta actual como sistema de referencia de bajo coste.
- Diseñar una ampliación escalonada cuando las rutas sean redundantes o pocas
  sobrevivan a las restricciones.
- Deduplicar geometrías antes de interpretar el tamaño del conjunto.
- Analizar hasta un límite interno pendiente de calibración y mostrar un máximo
  de tres rutas.
- No relajar restricciones críticas si ninguna alternativa resulta compatible.
- Evaluar diversidad, disponibilidad, adecuación, incertidumbre, latencia y
  llamadas; no afirmar una tasa de recuperación (*recall*) sin una verdad de
  referencia.
- Tratar instrucciones y giros como aproximaciones técnicas de complejidad de
  orientación y someter sus escalas a sensibilidad.

### Estado

La decisión y `EXP-005` están documentados. El diseño está aprobado y su
implementación ha comenzado con la deduplicación exacta; la integración actual
de tres rutas continúa siendo el sistema de referencia. La fuente principal es
[Generación y diversidad de rutas candidatas](research/generacion-rutas-candidatas.md).

### Primer incremento implementado: deduplicación exacta

- Se genera una huella SHA-256 a partir de la secuencia de coordenadas ya
  validada por Pydantic.
- La comparación conserva el sentido de la ruta y no redondea coordenadas.
- Se mantiene la primera aparición y se registran los índices de los duplicados
  para permitir auditoría posterior.
- El proveedor ORS elimina estas repeticiones antes de crear rutas base.
- Las rutas con diferente muestreo o pequeñas variaciones pasan después a una
  comparación espacial independiente.

Verificación: 5 pruebas unitarias de deduplicación, 4 del proveedor, 97 pruebas
del backend y Ruff sin incidencias.

### Segundo incremento implementado: similitud espacial calibrada

- Se proyectan las rutas a ETRS89 / UTM zona 30N para medir en metros.
- El solapamiento utiliza la menor cobertura de ambas líneas y se combina con
  su diferencia relativa de longitud.
- Se fijaron antes del barrido diez pares sintéticos: cinco duplicados y cinco
  distintos, incluidos paralelos y desvíos en puntos de decisión.
- Se compararon 6 tolerancias, 5 solapamientos y 3 umbrales de longitud: 90
  configuraciones y 900 predicciones.
- La selección descartó primero cualquier falso positivo y resolvió empates con
  la opción más restrictiva.
- Se adoptaron 2 metros, 98 % de solapamiento y 3 % de diferencia de longitud.
- La configuración obtuvo 100 % en el banco sintético, sin interpretar ese
  valor como exactitud general.
- Las tres rutas ORS reales presentaron solapamientos entre 22,56 % y 31,25 % y
  continuaron separadas.
- Se generaron dos tablas CSV públicas para conservar tanto las métricas de las
  90 configuraciones como sus 900 predicciones individuales.

La fuente principal, los resultados completos y las amenazas a la validez se
encuentran en
[Calibración de la deduplicación espacial](evaluation/calibracion-deduplicacion-espacial.md).

Verificación final: 108/108 pruebas del backend, Ruff correcto, 26/26 pruebas de
la aplicación, ESLint y TypeScript correctos.

## 11 de agosto de 2026 — Preparación OSM de la semana 2, día 2

### Decisiones

- No reutilizar los puntos representativos del estudio de densidad para medir
  coincidencia lineal con las rutas.
- Descargar una instantánea independiente y acotada al corredor piloto.
- Conservar geometrías completas mediante `out body geom`, etiquetas originales,
  fecha base, versión de esquema y huella SHA-256 de la consulta.
- Incluir la red peatonal relevante aunque falten etiquetas de accesibilidad,
  porque la cobertura desconocida debe poder medirse.
- Interpretar valores como indicadores preliminares; ningún elemento aislado
  establece todavía el estado de accesibilidad de una ruta.
- Considerar ambiguas las aceras de un solo lado, los bordillos enrasados, las
  rampas genéricas y las pendientes sin magnitud.
- Exigir contexto `highway` a la evidencia lineal y de acceso para excluir
  edificios y equipamientos ajenos al itinerario.

### Trabajo completado

- Correspondencia auditable entre once familias y todas las dimensiones del
  dominio.
- Consulta estable, cliente asíncrono, cambio de endpoint y errores sanitizados.
- Modelos validados para caja geográfica, nodos, vías y metadatos.
- Caché atómica con permisos `0600` y rechazo de consultas incompatibles.
- Instantánea local de 3.670 elementos, 2.838 vías y 16.630 coordenadas.
- Revisión de los valores reales observados sin dejar valores no reconocidos en
  las claves con reglas preliminares.

### Verificación

```text
Pruebas específicas de preparación OSM: 10/10.
Segunda ejecución: caché válida, sin petición HTTP.
Huella de consulta: 944b1058b3aaa91f8297bf4a40c5eae2976a2bf0ef067045f06c36b98cf75a33.
```

La fuente principal y el texto reutilizable en la memoria se encuentran en
[Preparación de OSM para rutas](research/preparacion-osm-para-rutas.md).
