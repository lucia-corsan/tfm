# Comparación de rutas en la aplicación móvil

Estado: `Validado`

Última actualización: 11 de agosto de 2026

Responsabilidad principal: `product`

## Problema que resuelve

La lógica de adecuación ya puede ordenar alternativas en el backend, pero una
persona usuaria necesita consultar el resultado desde una interfaz accesible,
comprender por qué cambia el orden y distinguir adecuación, confianza e
incertidumbre. Esta funcionalidad cierra el primer flujo vertical del MVP entre
el perfil, la API y la aplicación Android.

## Requisitos

- Solicitar al backend la comparación de los lugares seleccionados con el perfil
  elegido; Moncloa–Príncipe Pío permanece como recorrido inicial reproducible.
- Mostrar rutas aceptadas y descartadas sin afirmar que una alternativa es
  accesible de forma absoluta.
- Comunicar adecuación, confianza e incertidumbre mediante texto además de
  cualquier recurso visual.
- Exponer razones y avisos derivados del cálculo, sin recrearlos en la app.
- Diferenciar los estados inicial, de carga, de resultado y de error.
- Permitir reintentar una petición fallida.
- Mantener etiquetas, roles, estados y orden de lectura compatibles con
  TalkBack.
- No incluir claves ni otros secretos en variables públicas de Expo.
- No registrar las coordenadas ni el contenido completo de las peticiones.
- Mantener el resultado reproducible mediante el proveedor de datos sintéticos
  durante esta primera semana.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Consumir la API directamente desde la pantalla | Menos archivos iniciales | Mezcla red, estado y presentación; dificulta las pruebas | Descartada |
| Separar tipos, validación, cliente HTTP, estado y componentes | Facilita pruebas, mantenimiento y sustitución del proveedor | Requiere más piezas pequeñas | Adoptada |
| Confiar en una conversión TypeScript sin comprobar la respuesta | Poco código | TypeScript no valida datos recibidos en ejecución | Descartada |
| Añadir una biblioteca de validación | Esquemas declarativos | Incorpora una dependencia para un único límite todavía pequeño | Pospuesta |
| Validación local explícita de la respuesta | Sin dependencia nueva y con fallos controlados | Duplica una parte del esquema del backend | Adoptada para el MVP |
| Codificar la URL del backend en el cliente | Sencillo | Dificulta emulador, dispositivo físico y despliegue | Descartada |
| Variable `EXPO_PUBLIC_API_URL` con valor local predeterminado | Configurable y compatible con Expo | Su contenido es visible en la aplicación compilada | Adoptada solo para una URL no secreta |

## Decisión adoptada

La aplicación tendrá una frontera de red pequeña y explícita:

```text
pantalla → estado de comparación → cliente HTTP → FastAPI
            ↓                         ↓
      estados de interfaz       validación de respuesta
```

Los tipos TypeScript reflejarán los modelos públicos de FastAPI y una función
validará en ejecución la estructura relevante de cada respuesta. Una respuesta
incompatible se tratará como error de datos, en lugar de llegar parcialmente a
la interfaz.

La URL se leerá mediante `process.env.EXPO_PUBLIC_API_URL`. El valor
predeterminado de desarrollo será `http://10.0.2.2:8000/api/v1`, porque Android
Emulator utiliza `10.0.2.2` para acceder al equipo anfitrión. La URL no es un
secreto; ninguna clave de ORS o Mapillary se enviará a la app.

La pantalla ofrecerá inicialmente dos perfiles reproducibles: uno equilibrado
y otro que prioriza reducir la complejidad de los cruces. No constituyen todavía
el editor definitivo del perfil. Su finalidad es demostrar de extremo a extremo
que una preferencia modifica el ranking sin anular las restricciones críticas.

## Justificación

Separar la infraestructura HTTP de la presentación permite probar los fallos de
red sin renderizar componentes y probar la interfaz sin levantar FastAPI. Esta
división reduce el acoplamiento con el proveedor actual y prepara la integración
posterior de ORS sin modificar las pantallas.

La validación en ambos extremos responde al principio de defensa en profundidad:
Pydantic protege el backend y la validación TypeScript evita que una respuesta
incompleta, una versión incompatible o un intermediario defectuoso genere una
recomendación engañosa. No se añade todavía otra dependencia porque el esquema
público es pequeño y estable; la decisión se revisará si aumenta su complejidad.

Para accesibilidad, los cambios dinámicos de carga, resultado y error usarán
regiones anunciadas de forma moderada. Los controles expondrán su selección y
estado ocupado. La información se organizará en el mismo orden visual y de
lectura para evitar depender de una API experimental de orden de foco.

## Datos de entrada y salida

### Entrada

- Origen y destino WGS84 del escenario sintético.
- Restricciones críticas del perfil.
- Pesos graduables declarados.
- URL pública de la API, configurable por entorno.

### Salida

- Alternativas ordenadas con nombre, distancia y duración.
- Adecuación, confianza e incertidumbre expresadas de cero a uno por la API y
  presentadas como porcentajes en la app.
- Hasta tres razones trazables por alternativa.
- Avisos de evidencia desconocida o desfavorable.
- Alternativas descartadas y códigos de incompatibilidad.
- Estado comprensible ante validación incorrecta o fallo de conexión.

## Implementación

Módulos implementados:

- `app/src/api/types.ts`: tipos públicos de la API.
- `app/src/api/validation.ts`: comprobación de respuestas en ejecución.
- `app/src/api/client.ts`: petición HTTP y traducción de errores técnicos.
- `app/src/components/PlaceSearchField.tsx`: selección accesible de origen y
  destino mediante el catálogo local.
- `app/src/features/route-comparison/`: perfiles, estado y presentación.
- `app/i18n/es.ts`: todos los textos visibles y accesibles.

No se ha incorporado una biblioteca de gestión de estado global. El flujo solo
pertenece a una pantalla y se implementa con estado local y un hook pequeño.
Cada petición recibe una versión incremental; si se cambia el perfil antes de
recibir la respuesta, el resultado antiguo se ignora para que nunca aparezca
asociado a la selección nueva.

El perfil equilibrado asigna peso `1` a las nueve dimensiones. El perfil de
cruces sencillos asigna peso `8` a `complex_crossings` y mantiene peso `1` en
las ocho dimensiones restantes. Esta elección extrema pero no exclusiva permite
observar el cambio de ranking sin desactivar distancia, pendiente,
incertidumbre ni el resto de la evidencia. En ambos perfiles continúan activas
las mismas restricciones críticas.

La pantalla reemplaza la portada técnica provisional y presenta un flujo único:
selección de lugares y perfil, acción de comparación, estado dinámico y
resultados. Las
tarjetas muestran las tres métricas como texto, los factores recibidos del
backend, los avisos y las rutas descartadas. La app solo transforma códigos y
valores en textos españoles; no recalcula la puntuación.

## Pruebas

- Aceptación de una respuesta completa y válida.
- Rechazo de métricas fuera de rango, identificadores incoherentes y rankings
  no consecutivos.
- Serialización correcta de ambos perfiles.
- Respuesta correcta, error HTTP, respuesta incompatible y fallo de red.
- Transiciones inicial, carga, resultado y error.
- Cambio de la primera ruta al seleccionar el perfil de cruces sencillos.
- Presentación textual de las tres métricas, razones, avisos y descartes.
- Roles, etiquetas, estados de selección y anuncios dinámicos accesibles.
- Paradas independientes para la introducción, los encabezados y cada razón,
  todas identificadas con el idioma `es-ES`.
- Búsqueda de lugares, validación de sus respuestas, propagación de coordenadas
  y bloqueo de origen y destino iguales.

## Resultados

La validación automática de la app alcanza 37 pruebas distribuidas en seis
grupos. Se han comprobado tipos, validación matemática, configuración, cliente
HTTP, perfiles, estado asíncrono e interfaz. ESLint y TypeScript estricto no
detectan errores. Las 157 pruebas del backend siguen superándose, por lo que la
integración móvil no ha modificado el sistema de decisión.

Una comprobación directa contra FastAPI con los pesos exactos del perfil móvil
obtuvo respuesta 200 y el orden `fewer_crossings_route`, `balanced_route`. Por
tanto, el cambio esperado no depende únicamente de la respuesta simulada en las
pruebas de componentes.

La primera prueba manual en el emulador Pixel confirmó los dos órdenes esperados, el
tratamiento del backend apagado y la recuperación mediante reintento. TalkBack
permitió recorrer la selección, el botón, el resumen, las métricas, los avisos y
la alternativa descartada. Una revisión más detallada detectó que algunos textos
estáticos entre las métricas y los avisos no recibían foco y que el motor del
emulador pronunciaba el español con una voz inglesa. Se corrigió la primera
incidencia mediante nodos de lectura independientes y se añadió `es-ES` a los
elementos accesibles. Queda pendiente repetir la comprobación manual con una voz
española instalada antes de considerar cerrado este aspecto.

## Riesgos y limitaciones

- Los datos siguen siendo sintéticos y no permiten extraer conclusiones sobre
  la accesibilidad real del trayecto.
- La dirección `10.0.2.2` es específica de Android Emulator; un dispositivo
  físico necesitará la dirección local del equipo.
- Las variables `EXPO_PUBLIC_*` quedan visibles en el código compilado. Solo se
  utilizarán para configuración no sensible.
- La duplicación del esquema exige pruebas que detecten incompatibilidades al
  evolucionar la API.
- Las tarjetas no sustituirán a una evaluación manual con TalkBack.

## Texto base para la memoria

El primer flujo vertical del prototipo se implementó mediante una separación
entre presentación, estado de interfaz, cliente HTTP y validación de datos. La
aplicación no recalcula la adecuación ni genera explicaciones propias, sino que
presenta los resultados trazables producidos por el backend. Esta decisión evita
divergencias entre la interfaz visual y el sistema de decisión y permite que
TalkBack comunique los mismos factores, advertencias y restricciones que
intervinieron en el ranking. La respuesta se valida también en el dispositivo
para impedir que información incompleta o incompatible se presente como una
recomendación válida.

## Trabajo pendiente

- [x] Implementar y probar los tipos y la validación de respuestas.
- [x] Implementar y probar el cliente HTTP.
- [x] Implementar los perfiles reproducibles y el estado de comparación.
- [x] Construir la pantalla y sus componentes accesibles.
- [x] Validar ambos rankings, el fallo de red, la recuperación y TalkBack en
  Android Emulator.
- [ ] Sustituir el escenario sintético por rutas reales durante la semana 2.

## Referencias y evidencias

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).
- [Variables de entorno en Expo](https://docs.expo.dev/guides/environment-variables/).
- [Accesibilidad en React Native](https://reactnative.dev/docs/accessibility).
- `backend/api/models/routes.py`.
- `tests/api/test_compare_routes.py`.

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
