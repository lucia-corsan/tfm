# Integración del aprendizaje adaptativo en la aplicación móvil

Estado: `Validado`  
Alcance de la validación: `Automática y funcional en Android Emulator`  
Última actualización: `2026-08-18`  
Responsabilidad principal: `research`

## Problema que resuelve

El modelo adaptativo ya puede aprender, de forma reproducible, qué factores
parecen importar a una persona cuando elige entre varias rutas. Sin embargo,
hasta este incremento las elecciones hechas en la aplicación no se conectaban
al modelo y sus resultados no se conservaban al cerrar la app. Por tanto, la
evaluación académica demostraba que el método era viable, pero el prototipo no
mostraba todavía el ciclo completo de aprendizaje.

Esta funcionalidad conecta una elección explícita con el modelo, guarda el
estado solo en el dispositivo y utiliza los pesos resultantes en comparaciones
posteriores. El objetivo no es predecir una discapacidad ni declarar una ruta
segura, sino ajustar gradualmente la importancia relativa de nueve costes que
ya son visibles y explicables.

## Requisitos

- El aprendizaje debe estar desactivado inicialmente y requerir una activación
  consciente.
- Solo se aprende al pulsar «Elegir esta ruta» y cuando se han mostrado al menos
  dos alternativas que superaron las restricciones críticas.
- Las rutas descartadas por seguridad no pueden formar parte de la observación.
- Las tres primeras elecciones se observan sin modificar el orden efectivo.
- Los pesos aprendidos deben ser no negativos y sumar uno.
- La influencia aprendida no puede superar el 50 % de la decisión gradual.
- Desactivar el aprendizaje debe restaurar inmediatamente los pesos declarados,
  sin borrar el historial; reiniciarlo sí debe eliminar el estado aprendido.
- El nuevo orden debe seguir exponiendo adecuación, confianza, incertidumbre,
  razones y avisos.
- El estado debe sobrevivir a un reinicio de la aplicación.
- No deben almacenarse coordenadas, direcciones, audio ni trazas GPS.
- La interfaz debe poder recorrerse con TalkBack y explicar con lenguaje común
  si una elección se ha observado o ya ha influido.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Aprender en un servidor remoto | Una única implementación Python y control centralizado | Requiere enviar elecciones, crea dependencia de red y debilita el enfoque local | Descartada para el MVP |
| Sobrescribir los pesos declarados | Integración rápida con el ranking existente | Se pierde la diferencia entre lo que la persona declaró y lo inferido | Descartada |
| Reimplementar la fórmula en TypeScript sin verificación | Aprendizaje completamente local | Riesgo de que Python y la app calculen resultados distintos | Descartada |
| Modelo local en TypeScript con casos de paridad y persistencia SQLite | Privacidad, funcionamiento sin red para actualizar y trazabilidad | Hay que mantener dos implementaciones pequeñas y comprobar su equivalencia | Adoptada |
| Tabla SQLite relacional completa | Consultas y migraciones muy detalladas | Complejidad desproporcionada para un único estado pequeño por perfil | Descartada por ahora |
| Almacén clave-valor respaldado por SQLite | Persistencia simple, inspeccionable y suficiente para el MVP | No está orientado a consultas analíticas complejas | Adoptada |

## Decisión adoptada

Python continúa siendo la especificación matemática de referencia. La app
incluye una traducción TypeScript de las mismas operaciones puras: normalizar,
calcular la probabilidad por pares, actualizar el gradiente medio, regularizar,
proyectar al simplejo, limitar el cambio aprendido y mezclar pesos declarados y
aprendidos. Un conjunto de casos dorados comprueba que ambas implementaciones
producen los mismos resultados dentro de una tolerancia numérica explícita.

El contrato HTTP incorpora `effective_weights` como campo opcional y separado.
`declared_weights` conserva lo expresado por la persona; `effective_weights`
representa la mezcla vigente que puede ordenar los costes graduales. El backend
aplica primero las restricciones críticas usando el perfil original y solo
después emplea los pesos efectivos. Este orden evita que el aprendizaje
readmita una ruta incompatible.

La persistencia utiliza `expo-sqlite/kv-store`, incluido en Expo Go y respaldado
por una base SQLite que sobrevive a los reinicios. Se guarda, en una única
entrada por perfil, el estado vigente y un historial acotado a las 200
observaciones más recientes. Actualizar ambos dentro del mismo valor evita que
un cierre entre dos escrituras deje el contador y el historial en estados
distintos. La fecha se reduce al día para no conservar una cronología
innecesariamente precisa.

## Datos de entrada y salida

### Entrada

- Pesos declarados del perfil seleccionado.
- Costes normalizados de la ruta elegida y de una o dos alternativas aceptadas
  no elegidas.
- Identificador técnico del perfil e identificadores opacos de las rutas.
- Consentimiento local para activar el aprendizaje.

### Salida

- Pesos aprendidos normalizados.
- Pesos efectivos empleados en la siguiente comparación.
- Número de elecciones observadas.
- Estado de la actualización: desactivada, observación inicial o influyente.
- Resumen accesible de los factores cuya importancia efectiva más cambió.

### Datos que no se guardan

- Coordenadas de origen, destino o posición GPS.
- Nombres de calles o direcciones buscadas.
- Geometrías de las rutas e instrucciones de navegación.
- Audio, texto dictado o identificadores personales.
- Rutas descartadas por restricciones críticas.
- Identificador del escenario, para evitar que revele indirectamente el
  trayecto aunque no contenga coordenadas.

## Implementación

- `backend/api/models/routes.py`: pesos efectivos opcionales y explícitos.
- `backend/services/route_comparison.py`: restricciones antes del ranking
  gradual adaptado.
- `app/src/features/adaptive-preferences/learner.ts`: núcleo matemático local.
- `app/src/features/adaptive-preferences/storage.ts`: persistencia SQLite
  versionada y validada.
- `app/src/features/adaptive-preferences/useAdaptivePreferences.ts`: ciclo de
  carga, consentimiento, aprendizaje y reinicio.
- `app/src/screens/RouteComparisonScreen.tsx`: controles accesibles y conexión
  de la elección explícita.
- `app/i18n/es.ts`: todos los textos de interfaz y explicaciones.

La dependencia nueva es `expo-sqlite` 57, instalada con el gestor de Expo para
mantener compatibilidad con el SDK del proyecto.

## Pruebas

- Paridad numérica entre casos dorados generados por Python y TypeScript.
- Las tres primeras elecciones no cambian los pesos efectivos.
- La cuarta elección comienza a influir sin superar el límite de mezcla.
- Los pesos permanecen no negativos y suman uno después de muchas elecciones.
- Una única ruta aceptada permite navegar, pero no genera aprendizaje.
- Una ruta descartada no puede usarse como elegida ni como alternativa.
- No se registra ninguna elección si el aprendizaje está desactivado.
- Desactivar conserva los pesos aprendidos, pero restaura los declarados como
  efectivos; reiniciar borra el aprendizaje.
- Un estado persistido válido se recupera tras recrear el controlador.
- Un estado corrupto o de otra versión se descarta de forma segura.
- Los registros persistidos no contienen claves de ubicación, direcciones ni
  geometrías.
- El backend mantiene las restricciones críticas aunque reciba pesos efectivos.

## Resultados

La validación automática del 18 de agosto de 2026 produjo estos resultados:

| Comprobación | Resultado |
| --- | ---: |
| Pruebas del backend | 265 superadas |
| Pruebas de la aplicación | 126 superadas en 21 grupos |
| Análisis estático Python con Ruff | Sin incidencias |
| Análisis estático TypeScript y Expo | Sin incidencias |
| Caso dorado Python–TypeScript | Coincidencia hasta 12 decimales |
| Actualizaciones consecutivas examinadas | 500 con pesos válidos |

Las pruebas cubren tres niveles distintos. En el nivel matemático comprueban el
signo de la actualización, el periodo de observación, los límites y la paridad
entre lenguajes. En el nivel de almacenamiento recrean el controlador para
confirmar que el estado persiste, fuerzan datos dañados para comprobar una
recuperación segura y revisan que el registro no contenga campos de ubicación.
En el nivel de usuario activan el consentimiento, comparan rutas con pesos
efectivos separados, eligen una alternativa y verifican la explicación que
acompaña a la navegación. También se prueba que una ruta descartada no entra en
la observación y que una sola ruta válida no produce aprendizaje.

Estos resultados demuestran coherencia del software y continuidad del flujo,
pero no prueban que la adaptación represente mejor a una persona real.

La comprobación funcional posterior en Android Emulator confirmó que el
contador sobrevivió al cierre desde aplicaciones recientes y a la reapertura de
Expo Go. Las tres primeras elecciones permanecieron en observación y la cuarta
produjo la explicación de cambio. Pausar restauró los pesos declarados sin
borrar el contador; reactivar recuperó la influencia anterior. La cancelación
del reinicio conservó el estado y su confirmación lo devolvió a cero. Con
TalkBack se recorrieron de forma independiente el título, la descripción, el
interruptor, el estado, la nota de privacidad y el reinicio, sin incidencias
notificadas.

### Protocolo de comprobación manual en Android

1. Iniciar FastAPI, Metro y el emulador con los mismos comandos del entorno de
   desarrollo.
2. Mantener un mismo perfil, activar «Aprender de mis elecciones», comparar y
   elegir una ruta entre al menos dos alternativas válidas.
3. Regresar a la comparación. El estado debe indicar «1 de 3 elecciones» y la
   navegación debe explicar que la observación todavía no cambia el orden.
4. Cerrar la app desde la vista de aplicaciones recientes, sin borrar sus datos,
   y volver a abrir el proyecto. El contador del mismo perfil debe continuar en
   uno.
5. Repetir la comparación y la elección hasta cuatro veces. Las tres primeras
   deben permanecer en observación; la cuarta debe anunciar que la
   personalización se ha actualizado y mencionar como máximo dos dimensiones.
6. Pausar el interruptor. Los pesos efectivos deben volver a los declarados y
   las nuevas elecciones no deben registrarse. Al reactivarlo, debe recuperarse
   la influencia anterior.
7. Pulsar «Reiniciar lo aprendido», cancelar una vez para comprobar que nada se
   borra y confirmar después. El contador debe volver a cero sin cambiar el
   perfil declarado.
8. Con TalkBack activo, recorrer título, descripción, interruptor, estado,
   privacidad y reinicio. Todos deben ser paradas separadas y el interruptor
   debe anunciar si está activado o desactivado.

Opcionalmente, con Metro abierto se puede pulsar `Shift+M` y seleccionar el
complemento de `expo-sqlite` para inspeccionar el almacén. Debe existir una
entrada por perfil y no deben aparecer coordenadas, direcciones, geometrías,
instrucciones, audio ni identificadores del escenario.

## Riesgos y limitaciones

- La fórmula existe en Python y TypeScript. Los casos de paridad reducen, pero
  no eliminan, el coste de mantener ambas versiones.
- Una elección no demuestra una preferencia estable; por eso existen tres
  observaciones iniciales, regularización y límites de influencia.
- Los identificadores de ruta sirven para auditar la elección, pero pueden
  cambiar entre proveedores. El aprendizaje utiliza los costes, no memoriza una
  ruta concreta.
- El almacenamiento SQLite normal de Expo no está cifrado. Los datos guardados
  se han minimizado y no incluyen localización ni identidad; SQLCipher queda
  fuera del MVP porque exige una compilación nativa y gestión de claves.
- La evaluación actual es sintética. La integración demuestra funcionamiento,
  no eficacia con participantes ni mejora universal para cualquier perfil.

## Texto base para la memoria

El prototipo integró el aprendizaje adaptativo mediante un ciclo local y
consentido. La selección explícita de una ruta se transformó en comparaciones
por pares únicamente frente a alternativas previamente admitidas por las reglas
críticas. El estado distinguió entre preferencias declaradas, aprendidas y
efectivas, lo que conservó la trazabilidad y permitió desactivar la influencia
sin borrar las observaciones. Los pesos efectivos se enviaron al backend en un
campo separado y se aplicaron exclusivamente después del filtrado de
restricciones. La persistencia se implementó sobre SQLite en el dispositivo y
se limitó a vectores de costes, alternativa seleccionada, día aproximado y
estados anterior y posterior. No se almacenaron coordenadas, direcciones ni
trazas GPS. Esta arquitectura materializa el carácter local, explicable y
acotado del componente de inteligencia artificial.

## Trabajo pendiente

- [x] Ejecutar y registrar las pruebas automáticas de backend y aplicación.
- [x] Verificar en Android que el estado sobrevive a cerrar y volver a abrir la
  aplicación.
- [ ] Evaluar con participantes si las explicaciones de cambios son
  comprensibles y útiles.
- [ ] Repetir la evaluación con elecciones de rutas reales enriquecidas.

## Referencias y evidencias

- [Diseño matemático del aprendizaje adaptativo](aprendizaje-adaptativo.md).
- [Calibración y evaluación sintética](../evaluation/calibracion-aprendizaje-adaptativo.md).
- [Documentación oficial de Expo SQLite 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).
- [Reglas de seguridad](../safety.md).

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
