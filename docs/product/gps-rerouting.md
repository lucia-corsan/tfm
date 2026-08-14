# GPS en primer plano y rerouting confirmado

Estado: `En implementación`
Última actualización: 14 de agosto de 2026
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

## Decisión adoptada

La app utiliza `expo-location` y `watchPositionAsync` en primer plano. El
permiso no se solicita al abrir la pantalla: primero se explica que los
controles manuales siguen disponibles y la persona debe pulsar «Activar GPS
durante la navegación». Este gesto explícito evita que el diálogo del sistema
aparezca sin contexto. Un detector TypeScript puro acumula muestras fiables y
alcanza el estado de
confirmación cuando se cumplen todos los umbrales. El día 2 no ejecuta todavía
el rerouting: únicamente produce una señal estable para el flujo del día 3.

## Justificación

La confirmación reduce falsos reroutings y mantiene a la persona informada de
qué coordenada se enviará al backend. El GPS y el rerouting son tecnologías
deterministas auxiliares; no constituyen la aportación de IA del TFM.

## Datos de entrada y salida

### Entrada

- latitud y longitud entregadas por Android;
- precisión horizontal estimada, en metros;
- instante de la muestra, en milisegundos;
- geometría activa de la ruta e instrucciones ordenadas.

### Salida

- estado del permiso y disponibilidad del GPS;
- distancia mínima aproximada a la geometría, calculada solo en memoria;
- estado `on_route`, `possible_deviation` o `confirmation_required`;
- una señal fiable para aproximar el avance a la siguiente maniobra.

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

La confirmación interactiva y la llamada de rerouting permanecen
deliberadamente fuera de este incremento. Separar ambas fases permite comprobar
primero que la señal de desviación es estable antes de permitir que provoque una
petición externa.

## Pruebas automáticas del incremento

- Muestra aislada o imprecisa sin alerta.
- Tres muestras fiables fuera de ruta con confirmación.
- El observador se elimina al desmontar la pantalla.
- Una muestra con precisión entre 15 y 25 m puede informar del seguimiento,
  pero no avanzar automáticamente.
- Una muestra no puede saltar dos instrucciones aunque sus puntos coincidan.

Permanecen para el día 3 y la evaluación posterior el rechazo de la
confirmación, el fallo externo de ORS y la comparación experimental de los
umbrales de 20, 30 y 40 m.

## Resultados

La validación automática añade 17 pruebas y eleva la aplicación de 53 a 70
pruebas. Nueve comprueban geometría y detección; cinco verifican la activación
explícita, el permiso, la suscripción, su limpieza y el filtrado del observador;
tres cubren el avance automático. La suite completa, TypeScript y ESLint
terminan sin errores.

Las pruebas demuestran que el estado lógico cumple los umbrales definidos y que
la suscripción respeta el ciclo de vida de la pantalla. No demuestran todavía la
precisión real del emulador ni la utilidad de 15, 25 y 30 m en una calle. Esa
evidencia requiere ubicaciones simuladas y, posteriormente, un recorrido
controlado.

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
- [ ] Implementar el endpoint de rerouting.
- [ ] Ejecutar recorridos simulados y controlados.

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
