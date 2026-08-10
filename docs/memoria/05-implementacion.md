# 5. Implementación

Estado: `En implementación`  
Última actualización: 9 de agosto de 2026.

## Backend

FastAPI, configuración por entorno, modelos Pydantic y pruebas con pytest. El
ranking explicable ya aplica restricciones críticas, costes normalizados,
adecuación, confianza, incertidumbre, razones y avisos sobre *fixtures*
reproducibles. `POST /api/v1/routes/compare` expone ya este resultado mediante
modelos validados, proveedor intercambiable y errores sanitizados. Quedan
pendientes ORS, búsqueda y rerouting.

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

Caché exploratoria OSM/Mapillary completada. Pendientes integración ORS y
enriquecimiento por corredor.

## Calidad

Ruff, pytest, ESLint, TypeScript, Jest, Expo Doctor y CI separada. Tras el día 5,
el backend mantiene 58 pruebas superadas y la aplicación alcanza 26 pruebas en
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
