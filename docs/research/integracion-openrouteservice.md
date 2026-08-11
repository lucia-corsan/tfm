# Integración de OpenRouteService

Estado: `En implementación`
Última actualización: 10 de agosto de 2026
Responsabilidad principal: `research`

## Problema que resuelve

El sistema necesita obtener varias geometrías peatonales reales entre un origen
y un destino. Los *fixtures* de la primera semana permiten probar de forma
reproducible el ranking, pero no representan recorridos calculados sobre la red
viaria actual. OpenRouteService (ORS) se incorpora como generador externo de
alternativas; no sustituye al modelo propio de accesibilidad.

## Requisitos

- Solicitar rutas peatonales mediante la API oficial de ORS.
- Mantener la clave exclusivamente en el backend y fuera de repositorio, caché,
  URL y mensajes de error.
- Enviar las coordenadas en el orden exigido por ORS: longitud y latitud.
- Obtener geometría explícita, distancia, duración, instrucciones y datos
  auxiliares útiles para el enriquecimiento posterior.
- Admitir entre una y tres rutas; ORS puede devolver menos alternativas de las
  solicitadas si no cumplen sus condiciones de diversidad.
- No interpretar la ausencia de atributos de accesibilidad como ausencia de
  barreras.
- Probar el comportamiento nominal, las respuestas inválidas, los límites, los
  fallos externos y la caché sin depender de Internet.
- No registrar cuerpos de petición, coordenadas ni cabeceras de autorización.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Mantener solo *fixtures* | Totalmente reproducible y sin dependencia externa | No permite demostrar rutas reales | Se conserva solo para desarrollo y pruebas |
| Usar directamente el resultado de ORS en el ranking | Integración rápida | Puede convertir «sin dato» en «cero barreras» y producir una confianza falsa | Descartada |
| ORS seguido de enriquecimiento OSM local | Separa generación y evaluación y conserva la incertidumbre | Requiere una fase adicional de procesamiento geoespacial | Adoptada |
| Perfil ORS `wheelchair` | Incluye restricciones útiles para movilidad física | No representa necesariamente las necesidades de personas ciegas o con baja visión | Descartada como perfil general del TFM |
| Perfil ORS `foot-walking` | Genera recorridos peatonales sin asumir un perfil de movilidad distinto | Necesita las reglas y los datos propios del TFM | Adoptada |
| Respuesta JSON con geometría codificada | Formato compacto | Requiere decodificación adicional | Descartada |
| Respuesta GeoJSON | Coordenadas explícitas y formato geoespacial estándar | Respuesta algo mayor | Adoptada |

## Decisión adoptada

El backend utilizará una llamada asíncrona `POST` a
`/v2/directions/foot-walking/geojson`. La clave se enviará en la cabecera
`Authorization`. El cuerpo solicitará:

- origen y destino en orden `[longitud, latitud]`;
- instrucciones en español;
- hasta tres alternativas con parámetros explícitos y versionados;
- información adicional de pendiente, superficie y tipo de vía.

Los parámetros iniciales para las alternativas serán `target_count = 3`,
`share_factor = 0,6` y `weight_factor = 1,4`. No expresan preferencias del
usuario: únicamente limitan cuánto pueden compartir las alternativas y cuánto
puede alejarse su coste del recorrido óptimo de ORS. Su calibración y el número
real de alternativas obtenidas se registrarán durante la evaluación.

Estas tres rutas no constituyen una enumeración exhaustiva. Son el primer
conjunto de candidatas producido por ORS. La limitación, la ampliación escalonada
y su evaluación se desarrollan en
[Generación y diversidad de rutas candidatas](generacion-rutas-candidatas.md).

La respuesta se validará primero mediante modelos internos específicos de ORS.
Durante el día 1 de la segunda semana se almacenará como conjunto de rutas base,
todavía no como `RouteScenario`. La activación en `/routes/compare` se aplaza
hasta enriquecer cada corredor con OSM.

Esta frontera evita un error semántico presente en una conversión prematura: el
modelo actual necesita conteos numéricos de cruces. Asignar cero cuando ORS no
proporciona ese dato reduciría artificialmente el coste de la ruta, aunque su
evidencia se marcase como desconocida.

## Justificación

ORS resuelve un problema de cálculo de caminos y proporciona distancia,
duración, geometría e instrucciones. No certifica la accesibilidad del recorrido
para el perfil estudiado. Los pasos de peatones, semáforos, señales acústicas o
vibratorias, pavimento podotáctil, bordillos, aceras, rampas y escalones deben
obtenerse y evaluarse mediante el enriquecimiento OSM y las reglas del TFM.

La separación permite atribuir correctamente la aportación académica. ORS genera
candidatos; el sistema propio representa evidencia favorable, desfavorable o
desconocida, aplica restricciones de seguridad, calcula adecuación, confianza e
incertidumbre y, posteriormente, aprende preferencias. ORS no se presenta como
un componente de inteligencia artificial desarrollado en el TFM.

El uso asíncrono de `httpx` evita bloquear FastAPI durante una petición externa.
La caché reduce consumo de cuota, latencia y variabilidad experimental. Las
pruebas con respuestas simuladas permiten reproducir fallos sin enviar
coordenadas ni requerir una clave real en integración continua.

## Datos de entrada y salida

### Entrada a ORS

- Dos coordenadas WGS84 transformadas de `(latitud, longitud)` a
  `[longitud, latitud]`.
- Perfil fijo `foot-walking`.
- Idioma español e instrucciones activadas.
- Parámetros de alternativas versionados.
- `extra_info`: pendiente, superficie y tipo de vía.
- Restricción `avoid_features: ["steps"]` únicamente cuando el perfil prohíba
  escalones. Esta restricción no reemplaza la posterior comprobación OSM.

### Salida interna

- Una colección de entre una y tres rutas base.
- Para cada ruta: geometría `LineString`, distancia, duración, segmentos,
  instrucciones y datos auxiliares solicitados.
- Metadatos técnicos mínimos necesarios para validar la respuesta; no se
  propagarán identificadores o campos innecesarios a la aplicación.

### Datos que ORS no confirma

- Número y complejidad de cruces.
- Compatibilidad de un cruce con el perfil.
- Presencia de semáforo, señal acústica o vibratoria.
- Pavimento podotáctil y rebajes de bordillo.
- Continuidad o calidad de las aceras.
- Ausencia confirmada de escalones en todas las condiciones.

Hasta completar el enriquecimiento, estos aspectos no podrán recibir evidencia
positiva.

## Implementación

- `backend/routing/ors_models.py`: modelos estrictos de petición y respuesta.
- `backend/routing/ors_cache.py`: clave determinista y almacenamiento local de
  respuestas validadas.
- `backend/routing/ors_client.py`: cliente HTTP asíncrono y errores sanitizados.
- `tests/routing/`: pruebas unitarias y de integración simulada.
- `data/raw/ors/`: ubicación local prevista para la caché, ignorada por Git.

Los modelos, el cliente, la caché y el proveedor interno de rutas base están
implementados. `python -m backend.routing.check_ors` permite comprobar el
corredor piloto con configuración local y solo muestra resúmenes sin
coordenadas. La integración pública con el proveedor intercambiable permanece
desactivada hasta que exista una transformación segura tras el enriquecimiento
OSM.

## Pruebas

- El cuerpo usa longitud antes que latitud.
- La clave solo aparece en la cabecera de la petición simulada.
- Se aceptan entre una y tres rutas GeoJSON válidas.
- Se rechazan geometrías no lineales, colecciones vacías y métricas inválidas.
- Se conservan instrucciones y datos auxiliares sin inferir accesibilidad.
- Una respuesta almacenada evita una segunda petición HTTP.
- La clave de caché no contiene credenciales y cambia cuando cambia la consulta.
- Errores HTTP, tiempo de espera, red y JSON inválido producen excepciones
  internas estables sin URL, coordenadas, cuerpo ni clave.
- Todas las pruebas pueden ejecutarse sin conexión y sin `ORS_API_KEY` real.

## Resultados

Se añadieron 33 pruebas específicas de ORS: 12 de modelos y transformación, 10
del cliente HTTP, 7 de caché y 3 del proveedor interno, además de la prueba
existente que comprueba que el proveedor real aún no se expone en la API. La
regresión completa del backend supera 91 de 91 pruebas y Ruff no detecta
incidencias.

La prueba manual del 10 de agosto de 2026 obtuvo una respuesta HTTP 200 y tres
rutas base válidas para el corredor piloto:

| Ruta base | Distancia | Duración | Instrucciones |
| --- | ---: | ---: | ---: |
| `ors_route_1` | 2.715 m | 1.955 s | 32 |
| `ors_route_2` | 2.734 m | 1.968 s | 40 |
| `ors_route_3` | 2.868 m | 2.065 s | 29 |

La segunda ejecución devolvió exactamente los mismos resúmenes sin realizar
otra petición HTTP, lo que verifica el uso de la caché. Las diferencias entre
alternativas muestran un intercambio inicial entre longitud, tiempo y número de
instrucciones: la tercera es 153 metros más larga que la primera, pero contiene
tres instrucciones menos. Esto no permite recomendarla todavía, porque faltan
los atributos de accesibilidad y el número de instrucciones no mide por sí solo
la dificultad de orientación.

## Riesgos y limitaciones

- ORS puede devolver una sola ruta aunque se soliciten tres.
- Una petición limitada a tres alternativas puede omitir un recorrido que
  resultaría mejor después del enriquecimiento OSM.
- La disponibilidad, cuota y latencia dependen de un servicio externo.
- La geometría puede cambiar cuando ORS u OSM actualizan sus grafos.
- La opción de evitar escalones depende de los datos conocidos por ORS y no es
  una garantía absoluta.
- La caché de rutas contiene ubicaciones. Será local, ignorada por Git y no se
  utilizará para guardar posiciones GPS de navegación.
- Los datos auxiliares de ORS se conservarán, pero no se traducirán
  automáticamente a evidencia favorable hasta definir y probar su semántica.

## Texto base para la memoria

La generación de alternativas se desacopló de su evaluación de accesibilidad.
OpenRouteService se utilizó mediante su perfil peatonal para obtener hasta tres
geometrías GeoJSON, junto con distancia, duración, instrucciones y datos
auxiliares. Las respuestas se validaron y almacenaron en una caché local para
mejorar la reproducibilidad y reducir la dependencia del servicio externo. Sin
embargo, las rutas no se incorporaron directamente al ranking: ORS no confirma
atributos como señalización acústica, pavimento podotáctil o compatibilidad de
cruces. Asignar cero a esos conteos ausentes habría confundido falta de datos con
ausencia de barreras. Por ello, se estableció una fase obligatoria de
enriquecimiento OSM previa a la aplicación de restricciones y puntuaciones. Esta
decisión conserva el principio de seguridad según el cual lo desconocido nunca
constituye evidencia positiva.

## Trabajo pendiente

- [x] Validar los modelos internos con respuestas representativas.
- [x] Implementar y probar el cliente HTTP asíncrono.
- [x] Implementar y probar la caché local.
- [x] Extraer rutas base sin inferir evidencia de accesibilidad.
- [x] Realizar una petición manual controlada con una clave local.
- [x] Eliminar geometrías exactamente duplicadas antes del enriquecimiento.
- [x] Calibrar e integrar la deduplicación espacial conservadora.
- [x] Preparar una instantánea OSM validada con geometrías completas.
- [ ] Enriquecer las geometrías con el conjunto OSM del área piloto.
- [ ] Activar ORS en `/routes/compare` únicamente tras validar el enriquecimiento.
- [ ] Calibrar los parámetros de generación de alternativas con rutas reales.
- [ ] Comparar la consulta actual con una colección interna ampliada y
  deduplicada.

## Referencias y evidencias

- [Servicio Directions de ORS](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/).
- [Peticiones y formatos de respuesta](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types).
- [Información adicional de las rutas](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/extra-info/).
- [Tipos de instrucciones](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/instruction-types).
- [Opciones de routing](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/routing-options).
- [Códigos de error](https://giscience.github.io/openrouteservice/api-reference/error-codes).
- [Preparación de OSM para rutas](preparacion-osm-para-rutas.md).

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
