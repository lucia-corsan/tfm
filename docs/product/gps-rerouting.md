# GPS en primer plano y rerouting confirmado

Estado: `En implementación`
Última actualización: 16 de agosto de 2026
Responsabilidad principal: `product`

## Problema que resuelve

Mantener una navegación útil cuando la persona se separa de la geometría
recomendada, evitando reaccionar a una única medición GPS imprecisa.

## Requisitos

- GPS únicamente mientras la navegación esté abierta.
- Ignorar muestras con precisión peor de 25 metros.
- Posible desviación a más de 30 metros de la ruta.
- Tres muestras consecutivas durante al menos 10 segundos.
- Confirmación antes de solicitar una nueva ruta.
- Periodo inicial de 60 segundos sin nuevas alertas tras recalcular.
- Conservar la ruta anterior ante errores de ORS.
- No almacenar coordenadas ni incluirlas en registros.
- Mantener siempre el avance y retroceso manuales.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Rerouting automático | Menor interacción | Puede reaccionar a ruido y sorprender | Descartada |
| Confirmación explícita | Control y seguridad | Añade una interacción | Adoptada |
| GPS en segundo plano | Continuidad con pantalla apagada | Mayor complejidad y privacidad | Fuera del MVP |
| Una muestra fuera de ruta | Respuesta inmediata | Muy sensible al ruido GPS | Descartada |
| Evidencia espacial y temporal | Reduce falsas alertas | Retrasa unos segundos la detección | Adoptada |
| Sustituir controles por avance GPS | Interfaz más simple | Deja a la persona sin alternativa ante fallos | Descartada |
| Elegir automáticamente la primera ruta tras confirmar | Reduce la carga durante la marcha y respeta el perfil | La persona no vuelve a comparar las alternativas | Adoptada para el MVP |
| Volver a la pantalla de comparación | Mantiene la elección manual entre alternativas | Interrumpe la navegación y aumenta la carga cognitiva | Descartada durante una desviación |

## Decisión adoptada

La app utiliza `expo-location` y `watchPositionAsync` en primer plano. El
permiso no se solicita al abrir la pantalla: primero se explica que los
controles manuales siguen disponibles y la persona debe pulsar «Activar GPS
durante la navegación». Este gesto explícito evita que el diálogo del sistema
aparezca sin contexto. Un detector TypeScript puro acumula muestras fiables y
alcanza el estado de
confirmación cuando se cumplen todos los umbrales. El día 2 no ejecuta todavía
el rerouting: únicamente produce una señal estable para el flujo del día 3.

El día 3 conserva en memoria la ruta activa, el destino y el perfil completo
con el que se realizó la comparación. Cuando el detector reúne evidencia
suficiente, la app muestra una confirmación accesible. Rechazarla mantiene la
ruta anterior y reinicia la evidencia; aceptarla permite enviar únicamente la
posición actual, el destino y el perfil al backend. El backend genera,
enriquece, filtra y puntúa de nuevo las candidatas. La primera alternativa
aceptada se adopta como nueva ruta porque ya es la mejor clasificada para ese
perfil. La ruta anterior no se sustituye hasta validar una respuesta que
contenga al menos una alternativa aceptada.

## Flujo completo del recálculo

El recorrido funcional puede resumirse así:

> El GPS detecta una desviación estable → la aplicación informa a la persona →
> solicita confirmación → la persona acepta o rechaza → si acepta, se solicitan
> nuevas rutas → las candidatas se vuelven a enriquecer, restringir y puntuar →
> la ruta activa solo se sustituye si la respuesta es válida.

La secuencia detallada es la siguiente.

### 1. Detección de una desviación estable

Cada posición recibida se compara localmente con la geometría de la ruta activa.
Una única lectura lejana no se considera suficiente: se ignoran las mediciones
con una precisión peor de 25 m y se exigen tres muestras fiables situadas a más
de 30 m durante, como mínimo, diez segundos. Una posición fiable que vuelva a
estar dentro del corredor reinicia el recuento. Hasta que no se cumplen todas
las condiciones, la aplicación solo muestra que existe una posible desviación;
no envía coordenadas al backend ni solicita otra ruta.

### 2. Información a la persona

Cuando la evidencia espacial y temporal es suficiente, el estado pasa a
`confirmation_required`. La aplicación conserva visibles la ruta y la
instrucción actuales y abre un diálogo modal. TalkBack sitúa el foco en su
título para evitar que el aviso pase inadvertido. El texto explica que la
posición parece haberse separado de la ruta y que solo se utilizará la última
posición fiable si la persona decide recalcular.

### 3. Confirmación o rechazo

El diálogo ofrece dos acciones explícitas:

- **Mantener la ruta actual:** no se realiza ninguna petición, no se comparte la
  posición y se reinicia la evidencia de desviación. La navegación y los
  controles manuales continúan donde estaban.
- **Calcular una nueva ruta:** se toma una copia de la última posición fiable,
  se pausa temporalmente el detector y comienza el recálculo. Esta acción
  constituye el consentimiento para usar esa posición como nuevo origen.

La confirmación no significa que la ruta antigua desaparezca. Durante todo el
proceso continúa siendo el estado de respaldo de la navegación.

### 4. Solicitud de nuevas rutas

La aplicación envía a `POST /api/v1/routes/reroute` únicamente tres elementos:

1. la posición actual confirmada, como nuevo origen;
2. el destino original;
3. el perfil completo empleado en la comparación inicial, incluidas sus
   restricciones y sus pesos.

Conservar el perfil evita que el recálculo se convierta en una búsqueda genérica
de la ruta más corta. Las coordenadas se mantienen en memoria, no se guardan en
SQLite ni aparecen en los registros. Mientras espera, la interfaz anuncia el
estado de carga, pero no elimina la instrucción de la ruta anterior.

### 5. Generación, enriquecimiento y nueva puntuación

El backend trata la posición confirmada como un origen nuevo y ejecuta de nuevo
la misma cadena que en la comparación inicial:

1. valida la posición, el destino y el perfil;
2. pide candidatas peatonales al proveedor configurado, ORS en el flujo real;
3. asocia a sus geometrías la evidencia de accesibilidad de la instantánea OSM;
4. representa como desconocidos los atributos que no pueden confirmarse;
5. aplica antes del ranking las restricciones críticas del perfil;
6. calcula para cada candidata adecuación, confianza e incertidumbre;
7. ordena las rutas aceptadas según el mismo perfil y conserva también las
   razones y los descartes.

Por tanto, el recálculo no consiste en aceptar directamente la primera ruta que
entrega ORS. Las candidatas vuelven a pasar por el enriquecimiento OSM y por el
sistema explicable de decisión. Mapillary no interviene en esta puntuación del
MVP: aporta contexto sobre cobertura fotográfica y queda reservado para
enriquecimientos experimentales posteriores.

### 6. Validación de la respuesta

La aplicación vuelve a validar la respuesta en tiempo de ejecución, aunque el
backend ya la haya validado. Comprueba su estructura y exige al menos una ruta
aceptada. Una respuesta vacía, incompleta, incoherente o con un error de red o
del proveedor se considera no válida. En cualquiera de esos casos se mantiene
la ruta anterior, se anuncia el problema y se ofrece un reintento; la persona no
queda en una pantalla sin instrucciones.

### 7. Sustitución controlada de la ruta

Solo cuando existe una respuesta válida se adopta la primera ruta aceptada, que
es la alternativa mejor clasificada para el perfil vigente. La sustitución se
realiza como una única transición: cambia la geometría activa, se reinicia la
navegación en la primera instrucción nueva y el detector pasa a utilizar esa
geometría. Después se activa un periodo de 60 segundos sin nuevas alertas para
evitar un ciclo de recálculos provocado por ruido del GPS o por el cambio entre
las dos geometrías.

Esta política separa tres conceptos que no deben confundirse: detectar una
posible desviación no autoriza por sí solo a compartir la ubicación; confirmar
un recálculo no garantiza que el proveedor devuelva una ruta válida; y recibir
una ruta de ORS no basta para adoptarla sin volver a evaluar su evidencia y sus
restricciones.

## Justificación

La confirmación reduce falsos reroutings y mantiene a la persona informada de
qué coordenada se enviará al backend. El GPS y el rerouting son tecnologías
deterministas auxiliares; no constituyen la aportación de IA del TFM.

## Datos de entrada y salida

### Entrada

- latitud y longitud entregadas por Android;
- precisión horizontal estimada, en metros;
- instante de la muestra, en milisegundos;
- geometría activa de la ruta e instrucciones ordenadas;
- destino y perfil completo conservados durante la sesión de navegación.

### Salida

- estado del permiso y disponibilidad del GPS;
- distancia mínima aproximada a la geometría, calculada solo en memoria;
- estado `on_route`, `possible_deviation` o `confirmation_required`;
- una señal fiable para aproximar el avance a la siguiente maniobra;
- tras una confirmación, una comparación nueva desde la posición actual.

## Implementación

La secuencia de instrucciones, la selección explícita de ruta y el avance
manual constituyen la base del seguimiento. El módulo
`app/src/features/location/geo.ts` calcula distancias locales en metros entre
una muestra y cada segmento de la polilínea. Para las distancias cortas del área
piloto utiliza una aproximación local sobre la esfera terrestre; no transforma
ni envía la posición a otro servicio.

`deviationDetector.ts` implementa una máquina de estados sin dependencias de
React Native. Una lectura con precisión peor de 25 m se descarta y rompe la
secuencia, porque no puede formar parte de tres muestras fiables consecutivas.
Una lectura dentro de 30 m reinicia la evidencia de desviación. Fuera de ese
umbral se requieren al menos tres muestras y diez segundos desde la primera
antes de alcanzar `confirmation_required`.

`useForegroundRouteTracking.ts` solicita exclusivamente permiso en primer
plano después de la activación explícita, inicia `watchPositionAsync` mientras
la navegación permanece abierta y elimina la suscripción al salir. Se solicita
precisión alta, una separación mínima de 3 m
y un intervalo deseado de 3 s. Android puede entregar muestras con otra
frecuencia; por eso el detector confía en los instantes observados y no en el
número de llamadas por sí solo.

El avance automático usa una regla distinta y más restrictiva: precisión máxima
de 15 m y distancia máxima de 15 m al punto de la siguiente maniobra. Solo puede
avanzar una instrucción por muestra y no elimina los controles manuales. Esta
separación evita utilizar el umbral de 30 m —diseñado para detectar desviaciones—
como si fuera suficiente para decidir que una maniobra ya se ha alcanzado.

El segundo día de la tercera semana se limita al seguimiento y a la detección:

1. modelar una muestra mediante coordenadas, precisión e instante;
2. calcular de forma local su distancia mínima a la geometría activa;
3. filtrar mediciones cuya precisión sea peor de 25 m;
4. acumular evidencia temporal sin reaccionar a una lectura aislada;
5. observar la ubicación únicamente mientras la pantalla está montada;
6. aproximar el avance al siguiente punto de maniobra sin retirar los controles
   manuales.

La confirmación interactiva y la llamada de rerouting se mantienen
deliberadamente separadas del detector. Esta separación permite comprobar
primero que la señal de desviación es estable antes de permitir que provoque una
petición externa. La integración utiliza estados distintos para la espera de
decisión, el recálculo en curso, el resultado y el error. Un rechazo reinicia la
evidencia acumulada; un recálculo válido inicia un periodo de 60 segundos sin
nuevas alertas, y un error conserva la ruta y permite reintentar.

## Pruebas automáticas del incremento

- Muestra aislada o imprecisa sin alerta.
- Tres muestras fiables fuera de ruta con confirmación.
- El observador se elimina al desmontar la pantalla.
- Una muestra con precisión entre 15 y 25 m puede informar del seguimiento,
  pero no avanzar automáticamente.
- Una muestra no puede saltar dos instrucciones aunque sus puntos coincidan.

El día 3 añade pruebas del rechazo, el fallo del proveedor, la ausencia de rutas
aceptadas, las peticiones duplicadas, el cierre de la pantalla, el reemplazo y
el periodo de espera. Permanece para la evaluación posterior la comparación
experimental de los umbrales de 20, 30 y 40 m.

## Resultados

La validación automática añade 17 pruebas y eleva la aplicación de 53 a 70
pruebas. Nueve comprueban geometría y detección; cinco verifican la activación
explícita, el permiso, la suscripción, su limpieza y el filtrado del observador;
tres cubren el avance automático. La suite completa, TypeScript y ESLint
terminan sin errores.

Las pruebas demuestran que el estado lógico cumple los umbrales definidos y que
la suscripción respeta el ciclo de vida de la pantalla. No demuestran por sí
solas la utilidad de 15, 25 y 30 m en una calle, por lo que se complementaron
con una validación funcional mediante ubicaciones simuladas y continúa
pendiente un recorrido físico controlado.

El rerouting añade 8 pruebas de backend y 13 de aplicación. El total alcanza
239 pruebas de backend y 83 de la app. La validación automática confirma que la
posición no se envía al rechazar, que solo se admite una petición simultánea,
que el perfil se conserva, que la ruta anterior sobrevive a cualquier fallo y
que una respuesta válida reinicia las instrucciones y activa 60 segundos sin
nuevas alertas.

El 16 de agosto de 2026 se validó manualmente el recorrido completo en un Pixel
9 de Android Emulator con Android 16, TalkBack, el backend local y ORS. Una
secuencia de posiciones simuladas fuera de la geometría activa produjo primero
el estado de posible desviación y, tras cumplir el número de muestras y el
tiempo mínimo, abrió el diálogo accesible. TalkBack recorrió el título, la
explicación y las acciones de mantener o recalcular.

El rechazo cerró el diálogo, conservó la ruta y la instrucción, y no provocó la
petición de recálculo. La aceptación generó nuevas candidatas desde la posición
confirmada, volvió a aplicar enriquecimiento OSM, restricciones y puntuación,
sustituyó la ruta con una respuesta válida, regresó a la primera instrucción y
activó el periodo de espera. Para comprobar la recuperación, se detuvo el
backend antes de confirmar otra desviación: la aplicación mantuvo la ruta y la
instrucción anteriores, mostró un error y permitió reintentar. Tras reiniciar el
servicio, el reintento terminó correctamente.

La repetición inicial de unas coordenadas antiguas no generó una alerta porque
el primer recálculo había cambiado la geometría y esos puntos quedaban próximos
al nuevo recorrido. Al seleccionar posiciones situadas a más de 30 m de la ruta
activa, la detección volvió a funcionar. Este resultado confirma que el
detector evalúa siempre la geometría vigente, pero también obliga a definir las
desviaciones simuladas respecto a cada ruta recalculada.

## Riesgos y limitaciones

- Cañones urbanos y túneles degradan la precisión.
- La geometría de la ruta también puede contener imprecisiones.
- No habrá ubicación con pantalla apagada en el MVP.
- La aproximación al siguiente punto no demuestra que una persona haya
  completado un cruce; los controles manuales permanecen disponibles.
- Expo Go permite probar este seguimiento en primer plano, pero la configuración
  nativa del texto de permiso deberá comprobarse también en una compilación de
  desarrollo.

## Texto base para la memoria

El seguimiento GPS se implementó exclusivamente durante la pantalla de
navegación y sin persistencia de coordenadas. La distancia a la ruta se calcula
localmente y una desviación no se deduce de una sola lectura: se descartan
muestras con precisión peor de 25 m y se exigen tres observaciones fiables fuera
de 30 m durante al menos 10 s. El avance de instrucciones aplica una condición
más estricta de 15 m de precisión y proximidad. La separación entre seguimiento,
avance y rerouting reduce reacciones ante ruido y permite validar cada decisión
antes de solicitar una ruta externa.

## Trabajo pendiente

- [x] Implementar el detector puro.
- [x] Integrar permisos y GPS en primer plano.
- [x] Añadir estados accesibles y avance automático conservador.
- [x] Implementar el endpoint y la confirmación de rerouting.
- [x] Ejecutar el recorrido simulado de extremo a extremo con ORS y TalkBack.
- [ ] Ejecutar un recorrido físico controlado.
- [ ] Comparar experimentalmente los umbrales de 20, 30 y 40 m.

## Referencias y evidencias

- [Expo, `expo-location`](https://docs.expo.dev/versions/latest/sdk/location/):
  documenta `requestForegroundPermissionsAsync`, `watchPositionAsync`, la
  suscripción limitada al primer plano y la eliminación mediante
  `LocationSubscription`.
- [Android Developers, solicitud de permisos en tiempo de ejecución](https://developer.android.com/training/permissions/requesting):
  recomienda explicar para qué se necesita un permiso y mantener un flujo útil
  cuando no se concede.
- Pruebas: `app/__tests__/geo.test.ts`,
  `app/__tests__/deviationDetector.test.ts`,
  `app/__tests__/useForegroundRouteTracking.test.ts` y
  `app/__tests__/useManualNavigation.test.ts`.
