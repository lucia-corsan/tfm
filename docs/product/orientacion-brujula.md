# Comprobación de orientación mediante la brújula

Estado: `En implementación`
Última actualización: 23 de agosto de 2026
Responsabilidad principal: `product`

## Problema que resuelve

Una instrucción como «gira a la derecha» describe una maniobra, pero no permite
comprobar si, después del giro, el teléfono ha quedado aproximadamente orientado
hacia el siguiente tramo. Esta ambigüedad puede ser especialmente relevante para
una persona que no utiliza el mapa visual. La funcionalidad añade una
comprobación voluntaria entre la dirección del teléfono y la geometría de la
ruta activa.

La brújula no localiza a la persona, no observa obstáculos y no demuestra que
sea seguro avanzar. Por ello, Rumbo nunca responde «vas en la dirección
correcta». La formulación positiva es deliberadamente más limitada: «el
teléfono apunta aproximadamente hacia el siguiente tramo de la ruta».

## Requisitos

- Calcular la dirección esperada a partir de la geometría activa, no a partir de
  texto libre.
- Consultar la brújula únicamente tras pulsar «Comprobar orientación».
- Exigir varias lecturas coherentes y descartar las de baja precisión.
- Comunicar el resultado mediante texto visible, un pulso breve y TalkBack o la
  voz TTS de la aplicación, según la configuración activa.
- No superponer TTS a TalkBack.
- Permitir repetir la comprobación en cualquier momento de la instrucción.
- Colocar el botón inmediatamente antes de «Anterior» y «Terminar» para que el
  orden visual y el de lectura coincidan.
- Restablecer el estado al pasar a otra instrucción.
- No guardar, registrar ni enviar medidas del magnetómetro, orientaciones ni
  coordenadas.
- Mantener los controles manuales y no cambiar de instrucción o ruta como
  consecuencia de esta ayuda.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Mostrar una flecha visual | Implementación sencilla | No resuelve el uso sin visión y depende de interpretar el mapa | Descartada como salida principal |
| Usar una única lectura de brújula | Respuesta inmediata | Muy sensible al ruido, la calibración y objetos metálicos | Descartada |
| Comprobar continuamente y corregir automáticamente | Menos acciones manuales | Puede generar locuciones frecuentes, distraer y transmitir una seguridad excesiva | Pospuesta hasta una evaluación con usuarios |
| Usar el rumbo GPS de movimiento | Puede representar la dirección real al caminar | No funciona bien en parada o a velocidad baja y no equivale a la orientación del teléfono | Reservada como posible complemento futuro |
| Brújula bajo demanda con lecturas estables | Funciona en parada, conserva el control de la persona y limita el ruido | Requiere sujetar el teléfono hacia delante y sigue expuesta a interferencias magnéticas | Adoptada para el MVP |

## Decisión adoptada

Se implementa una ayuda determinista bajo demanda. Para cada instrucción se
calcula un rumbo objetivo desde el vértice de la maniobra hacia un punto de la
polilínea situado aproximadamente doce metros más adelante. Al pulsar el botón,
la app observa la brújula durante un máximo de ocho segundos y solo decide si
recibe tres medidas consecutivas con precisión media o alta y con una dispersión
angular máxima de quince grados.

El resultado pertenece a uno de cinco grupos:

| Diferencia angular absoluta | Resultado | Mensaje operativo |
| --- | --- | --- |
| Hasta 25° | Aproximadamente alineado | El teléfono apunta aproximadamente hacia el tramo |
| Más de 25° y hasta 60°, a la izquierda | Ajuste moderado | Girar un poco a la izquierda |
| Más de 25° y hasta 60°, a la derecha | Ajuste moderado | Girar un poco a la derecha |
| Más de 60°, a la izquierda | Separación clara | Girar hacia la izquierda y volver a comprobar |
| Más de 60°, a la derecha | Separación clara | Girar hacia la derecha y volver a comprobar |

Los límites son valores iniciales de ingeniería, no umbrales clínicos ni un
resultado validado con personas ciegas. Se han escogido para que la tolerancia
de alineación sea mayor que la dispersión máxima admitida entre lecturas. La
evaluación física y con usuarios se define en
[Validación de la orientación](../evaluation/validacion-orientacion-brujula.md).

## Justificación

La literatura sobre ayudas de navegación respalda el uso combinado de canales
visuales, auditivos y táctiles, pero también muestra que las reacciones a las
instrucciones varían entre personas. Rodriguez-Sanchez et al. evaluaron una
aplicación que combinaba texto, mapa, audio y vibración con dieciocho personas
con discapacidad visual. Flores et al. observaron que una guía vibrotáctil podía
favorecer un seguimiento más próximo del recorrido, aunque con un coste de
velocidad. Ohn-Bar et al. encontraron diferencias significativas en tiempos y
formas de reacción ante giros. Estas evidencias justifican ofrecer una señal
multimodal y repetible, no imponer una corrección automática idéntica a todas
las personas.

Rumbo utiliza un único pulso corto para indicar «la comprobación ha terminado».
No se han creado patrones de vibración para izquierda y derecha porque esos
patrones exigirían aprendizaje y validación específica. La dirección se
comunica de forma explícita mediante texto y voz. Esta decisión evita presentar
como intuitivo un código táctil que todavía no se ha estudiado.

La funcionalidad es determinista y no forma parte del modelo de inteligencia
artificial. Tampoco modifica el índice de adecuación, el aprendizaje adaptativo
ni las restricciones de seguridad. Su valor académico reside en el diseño
accesible y en la gestión explícita de la incertidumbre del sensor.

## Datos de entrada y salida

### Entrada

- Geometría WGS84 de la ruta activa.
- Índice geométrico asociado a la instrucción actual.
- `trueHeading` de Expo Location cuando está disponible; en caso contrario,
  `magHeading`.
- Nivel de precisión de la brújula, de 0 a 3 según Expo.
- Estado de TalkBack y preferencias locales de TTS.

### Salida

- Estado visible: esperando, comprobando, alineado, ajuste, separación clara,
  precisión insuficiente, sensor no disponible o geometría insuficiente.
- Diferencia angular firmada, conservada solo en memoria para clasificar el
  mensaje.
- Un pulso de vibración de 100 ms cuando termina la comprobación.
- Un anuncio español mediante TalkBack o, si TalkBack está desactivado y la voz
  propia está habilitada, mediante TTS con la velocidad guardada.

## Cálculo explicado paso a paso

### 1. Rumbo esperado de la ruta

El rumbo inicial entre el punto de la maniobra \((\varphi_1, \lambda_1)\) y el
punto posterior \((\varphi_2, \lambda_2)\) se calcula mediante:

\[
\theta = \operatorname{atan2}\left(
\sin(\Delta\lambda)\cos(\varphi_2),
\cos(\varphi_1)\sin(\varphi_2)-
\sin(\varphi_1)\cos(\varphi_2)\cos(\Delta\lambda)
\right)
\]

El resultado se convierte a grados y se normaliza al intervalo \([0, 360)\).
No se utiliza necesariamente el vértice inmediatamente siguiente: dos puntos
casi coincidentes amplifican errores numéricos. El algoritmo busca primero un
punto situado al menos a doce metros y, si el tramo termina antes, usa el último
punto distinto disponible.

### 2. Estabilidad circular

Los grados son circulares: 359° y 1° están separados por 2°, no por 358°. Por
ello se calcula una media circular:

\[
\bar{\theta} = \operatorname{atan2}\left(
\sum_i \sin(\theta_i), \sum_i \cos(\theta_i)
\right)
\]

Se necesitan tres lecturas con nivel de precisión 2 o 3. Ninguna puede quedar a
más de 15° de la media circular. Si no se cumple esta condición antes de ocho
segundos, se informa de precisión insuficiente o de sensor no disponible; no se
elige la lectura «menos mala».

### 3. Diferencia mínima

La diferencia firmada se lleva al intervalo \([-180, 180)\):

\[
\Delta = \operatorname{wrap}_{[-180,180)}
(\theta_{ruta} - \theta_{teléfono})
\]

Un valor negativo requiere girar el teléfono hacia la izquierda; uno positivo,
hacia la derecha. La interfaz no muestra grados porque una cifra aparentemente
precisa podría ocultar la incertidumbre real del magnetómetro.

## Implementación

- `app/src/features/orientation/routeOrientation.ts`: cálculo geográfico,
  aritmética circular, filtros y clasificación pura.
- `app/src/features/orientation/useRouteOrientation.ts`: observación temporal
  de `Location.watchHeadingAsync`, límite de ocho segundos y limpieza de la
  suscripción.
- `app/src/features/orientation/orientationFeedback.ts`: selección excluyente
  entre TalkBack y TTS y pulso de vibración.
- `app/src/screens/NavigationScreen.tsx`: estado visible y botón de comprobación
  situado antes de los controles «Anterior» y «Terminar».
- `app/i18n/es.ts`: mensajes, etiquetas y ayudas accesibles en español.

La suscripción se elimina al obtener un resultado, al cambiar de instrucción,
al repetir la comprobación o al salir de la pantalla. El resultado anterior se
asocia a la clave de la instrucción; por ello no permanece visible al avanzar.

## Pruebas

Las pruebas automáticas comprueban:

- normalización de ángulos negativos y superiores a 360°;
- giro mínimo al cruzar el norte, por ejemplo de 350° a 10°;
- rumbos cardinales y búsqueda de un punto estable por delante;
- ausencia de dirección al final de la geometría;
- media circular de 358°, 1° y 3°;
- rechazo de lecturas imprecisas o dispersas;
- las cinco clases de orientación;
- que el sensor no se activa antes de pulsar el botón;
- cierre de la suscripción tras un resultado y al cambiar de instrucción;
- error por tiempo máximo y ausencia de geometría suficiente;
- vibración común a todos los resultados;
- anuncio con TalkBack sin TTS simultáneo;
- TTS en `es-ES` y con la velocidad local cuando TalkBack está desactivado;
- respeto a la preferencia que desactiva la voz propia.

## Resultados

Las 29 pruebas directamente relacionadas con el cálculo, el observador, los
canales y la pantalla finalizan sin errores. La suite completa de la aplicación
alcanza 182 pruebas superadas en 28 grupos; TypeScript y ESLint también aceptan
la implementación. Esta evidencia demuestra la corrección interna de las
fórmulas, los filtros, el ciclo de vida y la selección de canales. No demuestra
todavía la precisión del magnetómetro en la calle ni la utilidad para una
persona ciega; ambas comprobaciones permanecen pendientes y no se sustituyen
por el emulador.

## Riesgos y limitaciones

- Los objetos metálicos, imanes, vehículos, edificios y una mala calibración
  pueden alterar el campo magnético.
- `trueHeading` requiere permiso de ubicación en Expo. Sin él se utiliza norte
  magnético, que puede diferir del norte geográfico usado por la geometría.
- La app compara el eje del teléfono, no la orientación corporal ni el rumbo
  real al caminar.
- El teléfono debe sujetarse aproximadamente hacia delante; otras posiciones
  pueden producir un resultado técnicamente coherente pero inútil.
- Los umbrales 15°, 25° y 60° necesitan calibración física y validación con
  usuarios; no deben describirse como universales.
- Un resultado alineado no detecta obstáculos, obras, tráfico, bordillos ni
  cambios no cartografiados.
- La vibración solo confirma la finalización y no debe interpretarse como una
  orden direccional.
- El rumbo GPS durante el movimiento podría complementar la brújula, pero se
  mantiene fuera de esta primera versión hasta comparar estabilidad y consumo.

## Texto base para la memoria

Se incorporó una comprobación de orientación bajo demanda para reducir la
ambigüedad posterior a una maniobra sin convertir el sensor en una garantía de
seguridad. El sistema obtiene de la geometría un rumbo hacia un punto situado
varios metros por delante y lo compara con la media circular de tres lecturas de
brújula con precisión suficiente. Las medidas inestables no producen una
respuesta direccional. El resultado se comunica de forma multimodal mediante
texto, vibración y TalkBack o TTS, evitando locuciones simultáneas. Los mensajes
describen la orientación aproximada del teléfono y conservan controles manuales
para repetir la comprobación. Esta función es determinista, no interviene en el
ranking adaptativo y permanece sujeta a una evaluación física y con usuarios.

## Trabajo pendiente

- [ ] Ejecutar el protocolo físico con un dispositivo Android real.
- [ ] Comparar los umbrales de alineación de 20°, 25° y 30°.
- [ ] Comprobar el comportamiento cerca de posibles interferencias magnéticas.
- [ ] Evaluar comprensión, carga y utilidad con personas ciegas o con baja visión.
- [ ] Estudiar si el rumbo GPS en movimiento mejora la estabilidad sin aumentar
  falsos mensajes.
- [ ] Decidir con usuarios si conviene ofrecer comprobaciones automáticas tras
  un giro; no activarlas antes de esa evaluación.

## Referencias y evidencias

- [Expo Location: `watchHeadingAsync` y precisión de `LocationHeadingObject`](https://docs.expo.dev/versions/latest/sdk/location/).
- [Android Developers: sensores de posición y campo geomagnético](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position).
- Rodriguez-Sanchez, M. C., Moreno-Alvarez, M. A., Martin, E., Borromeo, S. y
  Hernandez-Tamames, J. A. (2014). *Accessible smartphones for blind users: A
  case study for a wayfinding system*. Expert Systems with Applications,
  41(16), 7210–7222. [https://doi.org/10.1016/j.eswa.2014.05.031](https://doi.org/10.1016/j.eswa.2014.05.031).
- Flores, G., Kurniawan, S., Manduchi, R., Martinson, E., Morales, L. M. y
  Sisbot, E. A. (2015). *Vibrotactile Guidance for Wayfinding of Blind
  Walkers*. IEEE Transactions on Haptics, 8(3), 306–317.
  [https://doi.org/10.1109/TOH.2015.2409980](https://doi.org/10.1109/TOH.2015.2409980).
- Ohn-Bar, E., Guerreiro, J., Kitani, K. y Asakawa, C. (2018). *Variability in
  Reactions to Instructional Guidance during Smartphone-Based Assisted
  Navigation of Blind Users*. Proceedings of the ACM on Interactive, Mobile,
  Wearable and Ubiquitous Technologies, 2(3), artículo 131.
  [https://doi.org/10.1145/3264941](https://doi.org/10.1145/3264941).
- Pruebas: `app/__tests__/routeOrientation.test.ts`,
  `app/__tests__/useRouteOrientation.test.ts`,
  `app/__tests__/orientationFeedback.test.ts` y
  `app/__tests__/NavigationScreen.test.tsx`.

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
