# 5. Implementación

Estado: `En implementación`  
Última actualización: 11 de agosto de 2026.

## Backend

FastAPI, configuración por entorno, modelos Pydantic y pruebas con pytest. El
ranking explicable ya aplica restricciones críticas, costes normalizados,
adecuación, confianza, incertidumbre, razones y avisos sobre *fixtures*
reproducibles. `POST /api/v1/routes/compare` expone ya este resultado mediante
modelos validados, proveedor intercambiable y errores sanitizados.

La base de ORS ya está implementada mediante modelos de transporte, cliente
`httpx` asíncrono, reintentos acotados, errores sanitizados, caché privada y
extracción de rutas base. Las respuestas GeoJSON conservan geometría, distancia,
duración, instrucciones y datos auxiliares. El proveedor real las asocia con la
instantánea OSM y las convierte en candidatos puntuables antes de aplicar
restricciones. También quedan pendientes búsqueda y rerouting.

Una prueba contra el servicio real devolvió tres alternativas de 2.715, 2.734 y
2.868 metros. Sus instrucciones fueron 32, 40 y 29, respectivamente. La
repetición de la consulta no generó tráfico HTTP, lo que confirmó la lectura de
la caché. Estas medidas demuestran la integración técnica, pero no se utilizan
como resultado de accesibilidad antes del enriquecimiento OSM.

La preparación de OSM ya dispone de modelos para nodos y vías, una consulta
estable con geometrías completas, un cliente asíncrono con cambio de endpoint y
una caché local validada. La instantánea del corredor contiene 3.670 elementos
únicos, de los cuales 2.838 son vías, y conserva 16.630 coordenadas. Las reglas
preliminares cubren las diez familias del estudio y el acceso peatonal. Un índice
`STRtree` en `EPSG:25830` recupera la evidencia dentro de 5 m, agrega etiquetas
relacionadas y calcula coberturas por unión de intervalos. Los escalones y
restricciones de acceso solo se confirman a 0,5 m y, en vías, con 3 m de
alineación. Esta evidencia alimenta ya el ranking real.

La cobertura lineal se implementó inicialmente mediante una unión geométrica
bidimensional. Al detectar valores no monótonos para corredores anidados, se
reformuló como unión de intervalos sobre la distancia acumulada de la ruta. La
solución elimina el doble conteo de segmentos solapados y reduce la sensibilidad
a la segmentación y a la precisión numérica de geometrías casi coincidentes.

Estas tres rutas constituyen el sistema de referencia de generación, no todas
las posibilidades. Se ha propuesto un agregador escalonado que podrá analizar
hasta un límite interno de rutas únicas, ampliar la búsqueda si quedan pocas
alternativas compatibles y devolver solo las tres mejor clasificadas. La
deduplicación exacta ya se ejecuta antes de extraer las rutas base. Utiliza una
huella SHA-256 de la secuencia validada de coordenadas, conserva la primera
aparición y registra los índices coincidentes. No aplica redondeo ni similitud
espacial en esta primera fase.

La segunda fase proyecta las líneas con pyproj a ETRS89 / UTM zona 30N y emplea
Shapely para medir la longitud de cada ruta contenida en un corredor alrededor
de la otra. La regla simétrica calibrada exige 2 metros de tolerancia, 98 % de
solapamiento y menos del 3 % de diferencia de longitud. Se integró después de
comparar 90 configuraciones y priorizar las que no eliminaban ninguna ruta
distinta. La ampliación escalonada y el experimento de coste-beneficio
permanecen pendientes.

## Aplicación Android

La aplicación utiliza Expo SDK 57, React Native 0.86 y TypeScript estricto. El
primer flujo vertical ya permite seleccionar un perfil reproducible, solicitar
la comparación al backend y presentar rutas ordenadas, razones, avisos y
alternativas descartadas. La pantalla se validó manualmente en Android Emulator
con ambos perfiles, fallo y recuperación del backend y navegación mediante
TalkBack. Búsqueda, persistencia del perfil y navegación pertenecen a fases
posteriores.

### Separación de responsabilidades en la app

La implementación móvil se divide en tipos, validación, cliente HTTP, estado y
componentes. Esta separación evita que una pantalla mezcle transporte,
decisiones y presentación. También permite simular el backend en Jest y probar
los estados de carga y error sin conexión de red.

TypeScript comprueba el código durante el desarrollo, pero sus tipos desaparecen
en ejecución. Por ello, la respuesta HTTP se valida de nuevo antes de mostrarse:
se comprueban rangos de coordenadas y métricas, identificadores, orden de las
rutas y coherencia entre pesos normalizados, contribuciones, coste total y
adecuación. Una respuesta incompatible produce un error controlado y nunca una
tarjeta parcial.

La dirección de FastAPI se configura mediante `EXPO_PUBLIC_API_URL`. Para el
emulador Android se utiliza `http://10.0.2.2:8000/api/v1`; las claves de los
proveedores permanecen exclusivamente en el backend. Tampoco se registran las
coordenadas o el cuerpo de las peticiones.

### Demostración de personalización

Se incluyen dos perfiles de desarrollo. El equilibrado asigna el mismo peso a
las nueve dimensiones. El segundo multiplica por ocho la importancia de los
cruces complejos y mantiene activas las demás dimensiones. Este diseño produce
un cambio observable de recomendación sin convertir el ejemplo en un perfil que
ignore por completo pendiente, distancia o incertidumbre. Las restricciones
críticas son idénticas y permanecen fuera del ranking gradual.

La aplicación no recalcula la recomendación. Traduce a español los factores y
avisos estructurados del backend, garantizando que la interfaz visual y TalkBack
describan las mismas variables empleadas por el sistema de decisión.

### Estados y accesibilidad

El flujo diferencia estado inicial, carga, éxito y error. Si se cambia el perfil
mientras existe una petición pendiente, su respuesta se descarta mediante un
identificador incremental para impedir que un resultado antiguo se atribuya al
perfil nuevo. La carga y el resultado se anuncian de forma moderada; los errores
se anuncian como avisos prioritarios. Cada control expone rol, etiqueta y estado,
y las métricas se expresan textualmente para no depender del color.

## Datos y servicios

Caché exploratoria OSM/Mapillary completada. La caché ORS utiliza archivos
atómicos con permisos privados, claves opacas sin credenciales y validación en
cada lectura. La instantánea OSM orientada a rutas también está validada y
almacenada localmente. Su agregación por corredor y la respuesta real de la API
están implementadas; Mapillary permanece como contexto de cobertura y no
modifica el ranking.

## Calidad

Ruff, pytest, ESLint, TypeScript, Jest, Expo Doctor y CI separada. El backend
mantiene 157 pruebas superadas y la aplicación alcanza 43 pruebas en
seis grupos, además de superar lint y comprobación estricta de tipos.

## Decisiones e incidencias

No duplicar el journal: seleccionar aquí únicamente decisiones que expliquen la
implementación final y enlazar evidencias.

## Fuentes internas

- [Journal](../journal.md).
- [Entorno](../operations/entorno-desarrollo.md).
- [Incidencias](../operations/incidencias.md).
- [Especificación de la API](../product/especificacion-api.md).
- [Comparación en la app](../product/comparacion-rutas-app.md).
- [Integración de ORS](../research/integracion-openrouteservice.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Preparación de OSM para rutas](../research/preparacion-osm-para-rutas.md).
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).
