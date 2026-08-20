# Narración determinista, TalkBack y TTS

Estado: `En implementación`
Última actualización: 17 de agosto de 2026
Responsabilidad principal: `product`

## Problema que resuelve

Comunicar instrucciones y avisos sin depender del mapa visual ni generar
mensajes incompatibles entre pantalla, lector de pantalla y voz automática.

## Requisitos

- Instrucciones deterministas en español.
- Una fuente estructurada común para pantalla y TTS.
- Avisos críticos e incertidumbre no omitibles.
- Controles manuales para avanzar y retroceder.
- Evitar solapamiento entre TalkBack y locuciones automáticas.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Texto libre con LLM | Variación lingüística | Riesgo de omisión o invención | Descartada para el MVP |
| Plantillas deterministas | Reproducibles y fáciles de probar | Menor variedad | Adoptada |
| Una velocidad fija para todas las personas | Configuración mínima | No representa diferencias de experiencia, contexto ni capacidad auditiva | Descartada |
| Velocidad configurable por niveles | Elección comprensible y fácil de probar | El multiplicador depende de la voz instalada | Adoptada |
| Voz automática siempre activa | No exige pulsar un control | Puede interferir con TalkBack y comenzar sin consentimiento | Descartada |
| Voz automática voluntaria y condicionada | Mantiene el control y evita dos voces simultáneas | Requiere una preferencia adicional | Adoptada |

## Decisión adoptada

El backend genera objetos de instrucción validados. La aplicación muestra el
mismo contenido y, según la preferencia local y el estado del lector de
pantalla, decide cuándo enviarlo a TTS. TalkBack lee las etiquetas, los estados
y los cambios relevantes de la interfaz; si está activo, se bloquea la segunda
voz y se reduce el número de anuncios automáticos.

La construcción de una instrucción se separa en tres pasos comprensibles:

1. ORS indica la maniobra básica —por ejemplo, girar a la izquierda—, la calle,
   la distancia, la duración y el punto de la geometría donde sucede.
2. El backend valida esos datos y los convierte en un modelo común que también
   pueden utilizar los recorridos sintéticos de prueba.
3. Una plantilla propia genera una frase breve en español. La misma frase se
   muestra en pantalla, se ofrece a TalkBack y puede enviarse a TTS sin producir
   una segunda versión del mensaje.

No se reutiliza directamente el texto libre del proveedor como única fuente de
la interfaz. Los códigos de maniobra documentados por ORS permiten generar un
texto reproducible y comprobar mediante pruebas qué frase corresponde a cada
acción. El nombre de la calle solo se añade cuando existe; si falta, la
instrucción sigue siendo válida y no se inventa una referencia.

Los avisos de accesibilidad se mantienen separados de la maniobra. Una frase
como «gira a la derecha» describe cómo seguir la geometría, pero no afirma que
el tramo sea seguro o plenamente accesible. Antes de iniciar la navegación, la
pantalla conserva los avisos desfavorables y la información que falta por
confirmar en la ruta seleccionada.

## Justificación

Las plantillas permiten demostrar fidelidad entre datos, explicación y salida
oral. TTS transforma texto en voz y TalkBack lee la interfaz; ninguno modifica
las reglas de seguridad ni la clasificación.

## Datos de entrada y salida

Entrada: maniobra, distancia, referencia de vía, avisos validados, velocidad
seleccionada, preferencia de reproducción automática y estado del lector de
pantalla. Salida: texto visible, etiqueta accesible y frase apta para TTS, o
silencio deliberado cuando TalkBack está activo.

Cada instrucción pública contiene:

- su posición dentro de la secuencia;
- el tipo de maniobra normalizado;
- la frase española generada;
- el nombre de vía, si está disponible;
- la distancia y la duración del tramo;
- la coordenada de la maniobra sobre la geometría de la ruta.

La coordenada se necesita posteriormente para calcular el avance con GPS. En el
día 1 solo se conserva como dato estructurado: no se registra, no se presenta
como una dirección y no activa seguimiento de ubicación.

## Implementación

El día 1 de la tercera semana se divide en cuatro incrementos:

1. incorporar las instrucciones a las rutas reales y sintéticas;
2. generar frases españolas mediante plantillas deterministas;
3. permitir elegir una alternativa ya clasificada;
4. recorrer manualmente sus instrucciones en una pantalla accesible.

El GPS, el avance automático, TTS y el rerouting no formaron parte de este
primer incremento. Esta separación permitió comprobar primero que la secuencia
y los textos eran correctos sin mezclar posibles errores de localización. Los
incrementos posteriores incorporaron esas funciones sobre el mismo modelo.

### 1. Modelo común de instrucciones

ORS representa cada movimiento mediante un número. Por ejemplo, utiliza un
código para girar a la izquierda, otro para continuar recto y otro para indicar
la llegada. El backend traduce los catorce códigos documentados a nombres
propios comprensibles, como `turn_left`, `continue_straight` o `arrive`. Esta
traducción se hace una sola vez, al recibir la respuesta del proveedor. El resto
del sistema no necesita conocer los números internos de ORS.

Cada instrucción conserva siete datos:

- la posición que ocupa dentro del recorrido;
- la maniobra que debe realizarse;
- la frase española que se presentará;
- la calle o referencia aportada por ORS, cuando existe;
- la distancia aproximada del tramo;
- su duración estimada;
- el punto exacto de la línea de la ruta al que corresponde.

La posición y el punto de la ruta se validan. Las instrucciones deben empezar en
uno, continuar sin saltos y avanzar sobre la geometría sin retroceder. Además,
la coordenada incluida en la instrucción debe coincidir con el punto al que hace
referencia. Estas reglas se comprueban tanto en el modelo interno como en la
respuesta pública de la API. Se evita así que un error futuro muestre una
maniobra correcta en un lugar equivocado.

### 2. Plantillas españolas reproducibles

El texto libre enviado por ORS se conserva únicamente como dato de transporte,
pero no se muestra directamente. El backend construye la frase final mediante
plantillas propias para las catorce maniobras. Por ejemplo, la maniobra
normalizada `turn_left` produce «Gira a la izquierda». Si ORS aporta una calle,
se añade esa referencia; si no la aporta, la frase termina sin inventar un
nombre.

Las plantillas añaden únicamente conectores y artículos gramaticales previsibles
para tipos habituales de vía: «hacia la calle», «por el paseo» o «para seguir
por la avenida». El nombre aportado no se sustituye ni se completa con datos
externos. Si el texto no comienza por un tipo de vía conocido, se trata como una
referencia de lugar y se mantiene sin artículo añadido.

Esta decisión permite repetir una prueba y obtener exactamente el mismo texto.
También facilita revisar el español, adaptar una plantilla y comprobar todas
las variantes sin hacer una petición real. La llegada se expresa siempre como
«Has llegado al destino» y no añade una calle, porque esa referencia podría
hacer ambiguo el final del recorrido.

Las instrucciones de los datos sintéticos también se vuelven a generar al
cargarlas. De este modo, las rutas de desarrollo y las rutas reales pasan por
la misma narración y no mantienen dos sistemas de frases diferentes.

### 3. Elección explícita de una ruta

Después de comparar las alternativas, cada ruta aceptada incorpora el botón
«Elegir esta ruta». La aplicación entrega al flujo de navegación exactamente el
objeto seleccionado; no vuelve a clasificar las rutas, no escoge siempre la
primera y no altera el perfil. Las rutas descartadas no ofrecen este botón,
porque han incumplido una restricción crítica.

La elección explícita es necesaria antes de activar cualquier navegación. Da a
la persona el control final después de leer la adecuación, la confianza, la
información desconocida, las razones y los avisos. Más adelante, esta acción
también podrá convertirse en la señal mínima para el aprendizaje de
preferencias, pero en el día 1 todavía no modifica pesos ni guarda elecciones.

### 4. Navegación manual accesible

La primera pantalla de navegación muestra una única instrucción cada vez. La
persona puede avanzar y retroceder mediante dos botones accesibles. El botón
anterior está desactivado en el primer paso y el siguiente, en el último; el
estado no puede salir de esos límites. También se muestra el progreso, la
distancia y duración del tramo y la referencia de calle disponible.

El avance manual no pretende sustituir el GPS del producto final. Funciona como
una etapa de comprobación: permite revisar la secuencia, los textos y el orden
de lectura sin atribuir un fallo de localización a un fallo narrativo. El estado
vive solo mientras la pantalla está abierta y no se escriben posiciones,
direcciones ni instrucciones en una base de datos.

La pantalla conserva un resumen de la evidencia desconocida y desfavorable de
la ruta elegida, seguido de la advertencia de que las indicaciones describen el
recorrido pero no garantizan una accesibilidad completa. La maniobra y la
evaluación de accesibilidad se mantienen separadas: saber dónde girar no
demuestra que el cruce, el pavimento o la pendiente sean adecuados.

### 5. Contexto de accesibilidad asociado a cada tramo

La primera comprobación manual con una ruta real reveló que las instrucciones
geométricas eran insuficientes para una persona ciega: ORS indicaba giros y
distancias, mientras que la evidencia sobre cruces permanecía resumida para la
ruta completa. Se adopta por ello un segundo nivel de información, denominado
«evento de accesibilidad». No sustituye la maniobra, sino que describe un objeto
OSM próximo al tramo de esa instrucción.

Cada evento contendrá:

- su orden dentro de la instrucción;
- la distancia aproximada desde el inicio del tramo;
- un resumen, como «Paso de peatones marcado próximo»;
- detalles independientes con atributo, estado y frase;
- la procedencia OSM de la evidencia.

Para cada cruce peatonal cartografiado se distinguirán, cuando proceda:

- tipo o compatibilidad del cruce;
- presencia declarada de semáforo;
- señal acústica o ayuda vibratoria;
- pavimento podotáctil;
- tipo de bordillo;
- rampa o acceso equivalente declarado.

Cada detalle conservará uno de los tres estados del dominio: favorable,
desfavorable o desconocido. Una etiqueta explícita `yes` o equivalente puede
generar una afirmación favorable; un `no` explícito puede generar un aviso
desfavorable; una etiqueta ausente produce «no hay información suficiente». En
particular, no encontrar `traffic_signals:sound` nunca permitirá afirmar que el
semáforo carece de señal acústica.

Los eventos se asignarán al segmento de ORS que contiene su posición proyectada
sobre la ruta y se ordenarán por distancia. Solo se considerarán objetos ya
incluidos en el corredor OSM calibrado de 5 m. La frase utilizará «próximo» para
no presentar la proximidad espacial como pertenencia exacta al lado recorrido.
Los escalones constituyen una excepción crítica: solo se anunciarán como barrera
cuando cumplan la alineación estricta ya utilizada por las restricciones, con
una distancia máxima de 0,5 m y solapamiento lineal mínimo de 3 m.

Los datos sintéticos no recibirán eventos inventados. Sus instrucciones podrán
mostrar que no existe contexto OSM puntual para esa demostración. Las rutas
reales sí utilizarán la instantánea OSM ya descargada y validada.

### 5.1. Resumen operativo de la instrucción

La presentación separada de maniobra, distancia y evidencia es trazable, pero
obliga a quien escucha a construir mentalmente una única indicación. Esto resulta
especialmente problemático cuando ORS no proporciona un nombre de calle: «Gira
a la derecha» no explica cuánto debe avanzarse ni qué referencia no visual se
encontrará después.

La frase principal integrará, en este orden:

1. la acción inmediata y el nombre de vía, si es válido;
2. la distancia que se recorre después de ejecutar la maniobra;
3. la posición aproximada del próximo evento OSM dentro del tramo;
4. únicamente las ayudas favorables o barreras explícitamente declaradas.

Por ejemplo: «Gira a la derecha. Después del giro, avanza 34 metros. Al comenzar
este tramo, los datos sitúan un cruce peatonal. Constan estas características:
semáforo y señal acústica». La redacción no utilizará «escucharás el semáforo», porque una
etiqueta colaborativa no garantiza que el dispositivo siga funcionando en ese
momento.

Los estados desconocidos permanecerán en los detalles consultables, pero no se
enumerarán dentro del resumen principal para evitar una frase excesivamente
larga. Los avisos desfavorables confirmados sí formarán parte del resumen. La
pantalla conservará debajo los datos separados y su procedencia para que la
persona pueda revisarlos uno por uno con TalkBack.

Si un mismo tramo contiene más de un evento, el resumen no utilizará la expresión
genérica «referencias adicionales». Indicará el tipo y las distancias
aproximadas; por ejemplo: «Más adelante, los datos sitúan otros dos cruces
peatonales: uno a unos 11 metros y otro a unos 16 metros desde el inicio del
tramo». De este modo la
persona sabe qué encontrará y puede distinguir esos objetos del detalle
adicional sobre el primer cruce.

No se añadirá automáticamente un punto cardinal cuando falte la calle. Tras un
giro, «después del giro» y la distancia forman una referencia relativa más
directa; un rumbo calculado sobre un tramo muy corto puede ser inestable y exige
que la persona conozca su orientación absoluta. Los puntos cardinales se
reconsiderarán junto con la brújula y el GPS, y deberán validarse con personas
usuarias antes de incorporarlos.

### 5.2. Cruces duplicados y maniobras demasiado próximas

La revisión de la ruta real detectó dos artefactos que eran formalmente válidos,
pero producían indicaciones difíciles de interpretar. En un tramo de la calle de
Tutor aparecían dos cruces a 80 m y otros dos a 94 m. La inspección de los
identificadores y geometrías mostró que cada pareja describía un solo cruce
físico: OSM lo representaba simultáneamente mediante un nodo situado sobre la
ruta y mediante un pequeño tramo de vía. Contar ambos objetos como cruces
independientes duplicaba la narración y también podía alterar las métricas de la
ruta.

Antes de generar eventos se agrupan ahora las representaciones de cruces cuya
proyección longitudinal sobre la ruta difiere como máximo un metro. El umbral es
deliberadamente pequeño: corrige representaciones prácticamente coincidentes,
pero evita fusionar dos cruces consecutivos o las dos fases relevantes de un
paso con refugio central. Se conserva toda la evidencia de los objetos agrupados;
por ejemplo, el nodo puede aportar `tactile_paving=yes` aunque la geometría de
vía sea la que describe el trazado. La agrupación se aplica tanto a la narración
como al recuento usado por las métricas y la selección de alternativas.

El mismo recorrido contenía además segmentos de ORS de 1,2 a 9,9 m entre dos
maniobras. No se eliminan esos giros, porque pueden describir una decisión real
en un intercambiador, una plaza o una bifurcación. En su lugar, cualquier
segmento inferior a 10 m se une a la maniobra que viene a continuación. Así,
una secuencia antes presentada como dos pantallas independientes se expresa como
«Gira a la derecha. Tras avanzar 2 metros, gira ligeramente a la derecha.
Después del giro, avanza 114 metros». Los eventos de accesibilidad se trasladan
a su distancia acumulada dentro de la instrucción compuesta y mantienen su
orden.

El valor de 10 m es una regla inicial de presentación, no un umbral universal
de movilidad. Su finalidad es evitar que TalkBack obligue a cambiar de pantalla
antes de que la persona haya completado una maniobra casi inmediata. Los
números originales de maniobras y giros de ORS se conservan como características
para medir la complejidad de orientación; la lista mostrada sí disminuye al
agruparlas. De este modo una mejora de presentación no altera por sí sola la
puntuación de la ruta. Esta decisión deberá
revisarse durante las pruebas con GPS y con personas usuarias, especialmente en
cruces con isleta o giros muy seguidos.

Esta estructura sigue dos principios generales de accesibilidad: presentar
instrucciones claras, breves y sin ambigüedad, y conservar un orden secuencial
que mantenga el significado. Android recomienda además comprobar que todos los
elementos sean alcanzables con TalkBack y que los anuncios no sean
innecesariamente extensos. Estos principios orientan el diseño, pero la utilidad
del vocabulario concreto deberá evaluarse con personas ciegas.

### 6. Referencias de vía inválidas

La misma prueba manual mostró la frase «Gira a la derecha hacia -». El guion era
un valor de relleno entregado como nombre de vía y había superado la comprobación
de cadena no vacía. La normalización tratará como ausencia los guiones, variantes
tipográficas, `N/A`, `unknown`, `unnamed`, `null`, `none` y «sin nombre». El
valor normalizado se utilizará tanto para construir la frase como para mostrar
la referencia; por tanto, nunca podrá desaparecer de un canal y permanecer en
el otro.

La interfaz declara `es-ES` en los elementos accesibles y separa encabezados,
párrafos, razones y avisos como paradas de lectura. Esta indicación ayuda a
TalkBack a elegir la pronunciación adecuada, pero la voz disponible y su
variante regional pertenecen a la configuración de síntesis de Android. La app
no cambia esa preferencia global sin consentimiento.

### 7. Síntesis de voz y velocidad configurable

No se establece una única «velocidad para personas ciegas». La experiencia con
lectores de pantalla, la audición, la familiaridad con la voz sintética y la
complejidad del mensaje producen necesidades distintas. Choi et al. observaron
en un estudio de veinte días con diez personas ciegas o con baja visión que los
participantes utilizaban lectores de pantalla a velocidades diferentes y
querían controlar la velocidad de forma directa según la tarea y la longitud
del contenido. El resultado no permite trasladar un valor universal al español
ni a una indicación de movilidad, pero sí respalda que el control pertenezca a
la persona usuaria.

La aplicación ofrece cuatro niveles para su propia voz:

| Nombre mostrado | Multiplicador enviado al motor | Finalidad inicial |
| --- | ---: | --- |
| Lenta | 0,8 | Facilitar una primera escucha pausada |
| Normal | 1,0 | Valor inicial y referencia del motor |
| Rápida | 1,25 | Reducir la espera sin un salto extremo |
| Muy rápida | 1,5 | Atender a usuarios habituados a voz acelerada |

Los valores son multiplicadores, no palabras por minuto. Android define 1,0
como la velocidad normal del motor, 0,5 como aproximadamente la mitad y 2,0
como aproximadamente el doble. Sin embargo, el ritmo real depende de la voz,
el idioma, el fabricante y la pronunciación; por eso la interfaz usa nombres
cualitativos y la memoria no atribuye una cifra exacta de palabras por minuto.
Los cuatro niveles son hipótesis de diseño conservadoras dentro del rango
técnico, no una calibración clínica ni una preferencia demostrada para todo el
colectivo.

La velocidad normal y la reproducción manual son los valores iniciales. La
persona puede pulsar «Escuchar instrucción», detener la voz de inmediato o
activar voluntariamente «Reproducir cada instrucción automáticamente». Al
cambiar de paso, recalcular la ruta o cerrar la navegación, la aplicación
interrumpe la frase anterior y vacía la cola antes de reproducir otra. La salida
solicita `es-ES` y un tono normal, pero no sustituye la voz instalada en Android.

Durante este MVP, la preferencia vive en el estado de la navegación y no sale
del dispositivo. No se envía al backend ni interviene en la puntuación. Es
razonable ofrecerla en la configuración inicial de la aplicación, pero se
pospone su persistencia hasta incorporar el repositorio local común del perfil
y del aprendizaje. Guardarla ahora con un mecanismo aislado duplicaría la
lógica y dificultaría reiniciarla junto con el resto de preferencias. La
evolución prevista es almacenar localmente el identificador del nivel y el
interruptor automático; nunca audio ni historial de frases.

### 8. Convivencia con TalkBack

TalkBack y el TTS de la aplicación son dos canales distintos que pueden utilizar
el mismo altavoz. React Native permite consultar si existe un lector de pantalla
activo y recibir cambios mientras la app está abierta. El MVP aplica la
siguiente política:

1. mientras se comprueba el estado, no se permite emitir voz propia;
2. con TalkBack activo, se ocultan la escucha manual, la velocidad y la
   reproducción automática de la app, porque ninguna de ellas modifica el
   lector de pantalla;
3. la nueva instrucción sigue disponible como texto y se marca como única
   región dinámica moderada del bloque, de modo que TalkBack puede comunicar el
   cambio con sus propios ajustes sin repetir también el contador;
4. sin lector de pantalla, la persona puede escuchar manualmente o activar el
   modo automático;
5. si TalkBack se activa durante una locución, se detiene la voz de la app.

Los estados críticos de desviación, recálculo y error mantienen anuncios
prioritarios. Esta prioridad no se aplica a cada cambio ordinario de paso, para
no interrumpir constantemente la exploración de la interfaz. La decisión sigue
la recomendación de Android 16 de utilizar regiones dinámicas para cambios
críticos o relevantes y reservarlas para los casos necesarios, en lugar de
forzar anuncios generales.

Esta decisión es deliberadamente más estricta que limitar únicamente la
reproducción automática. Evita que al pulsar un botón TalkBack anuncie el
control al mismo tiempo que `expo-speech` comienza una segunda frase. W3C
desaconseja el audio automático que interfiere con lectores de pantalla y
recomienda ofrecer mecanismos próximos para detenerlo. Aunque WCAG se dirige a
contenido web, el principio de no interferencia resulta aplicable a este flujo
móvil. La velocidad configurada aquí no modifica TalkBack: quien use el lector
de pantalla debe ajustar su ritmo en Android.

## Pruebas

- Traducción de los catorce códigos documentados por ORS.
- Una frase española completa para cada tipo de maniobra.
- Composición de maniobra, distancia y primer evento en un resumen operativo.
- Agrupación de nodos y vías OSM que representan el mismo cruce.
- Conservación y composición secuencial de maniobras separadas por menos de 10 m.
- Exclusión de estados desconocidos y promesas no verificables del resumen.
- Ausencia y limpieza de referencias de calle.
- Secuencia consecutiva y posición válida sobre la geometría.
- Rechazo de instrucciones incoherentes en backend y app.
- Selección de la ruta exacta activada por la persona.
- Avance, retroceso y límites de la navegación manual.
- Estado accesible de controles y lectura independiente del contexto.
- Cierre únicamente después de pulsar «Terminar navegación».
- Valor normal y reproducción automática desactivada al iniciar.
- Correspondencia entre los cuatro niveles y los multiplicadores enviados.
- Idioma `es-ES` y tono normal en cada locución.
- Interrupción de la frase previa antes de escuchar una instrucción nueva.
- Ausencia de voz propia mientras TalkBack está activo o su estado es incierto.
- Activación automática solo después de una preferencia explícita.
- Detención al cambiar de instrucción, producirse un error o cerrar la pantalla.

## Resultados

El incremento automático queda validado con 231 pruebas del backend y 53 de la
aplicación, además de Ruff, TypeScript y ESLint sin errores. Las pruebas cubren
los catorce tipos de ORS, la narración determinista, las posiciones sobre la
geometría, la validación de la respuesta móvil, la elección de ruta y el avance
manual. También cubren la limpieza de valores de relleno, la asociación espacial
de cruces y escalones, los tres estados de evidencia, el orden de los eventos y
su lectura como párrafos separados. Este resultado demuestra consistencia del
software, no usabilidad real ni exactitud en exteriores.

La revisión visual del 14 de agosto detectó dos defectos que no se apreciaban en
las pruebas anteriores. ORS podía utilizar `-` como referencia de calle, dando
lugar a «Gira a la derecha hacia -». Además, la pantalla solo mostraba el resumen
global de la ruta y no comunicaba en qué instrucción se encontraban los cruces,
las señales acústicas, el pavimento podotáctil, los bordillos o los escalones.

La primera incidencia se corrigió con una normalización común al texto y al campo
de referencia. La segunda se resolvió creando eventos OSM situados dentro de cada
tramo. La aplicación muestra primero la maniobra y después un bloque de
accesibilidad cuyos encabezados, resúmenes y detalles son focos independientes.
De esta forma TalkBack puede avanzar párrafo a párrafo y no salta desde las
métricas directamente al aviso global de la ruta.

La comprobación con la caché real del recorrido piloto encontró inicialmente
32, 49 y 27 registros de cruce en las tres rutas. Tras corregir las dobles
representaciones nodo-vía, quedaron 27, 38 y 23 cruces navegacionales, con 162,
228 y 138 detalles independientes, respectivamente. Las 32, 40 y 29
instrucciones originales de ORS se transformaron en 23, 30 y 21 indicaciones
compuestas. No queda ningún segmento inferior a 10 m como instrucción aislada;
la única distancia menor puede formar parte de la llegada y se anuncia dentro
de la misma frase. Ninguna instrucción conserva `-` como referencia de calle.
Estas cifras demuestran que la asociación se ejecuta sobre las rutas reales
preparadas; no demuestran que cada etiqueta de OSM sea completa o esté
actualizada.

TalkBack ya había leído correctamente la pantalla de comparación en un Pixel 9
virtual con Android 16. Una revisión anterior corrigió la omisión de párrafos
estáticos y separó cada texto relevante como parada de lectura. La declaración
`es-ES` ayuda a escoger el idioma, aunque la voz concreta sigue dependiendo de
la configuración de Android.

La integración actual mantiene 282 pruebas de backend y 126 pruebas de la
aplicación distribuidas en veintiún grupos. Los casos específicos de voz cubren la
configuración inicial, los cuatro multiplicadores, el idioma, la interrupción,
los eventos del motor, el cambio de instrucción, el cierre de la pantalla y la
activación o desactivación dinámica del lector. Ruff, TypeScript y ESLint
también finalizan sin errores.

La navegación con GPS, el avance automático y el recálculo confirmado ya están
integrados y se han validado funcionalmente con ubicaciones simuladas y
TalkBack. El 17 de agosto se completó además la comprobación auditiva del TTS:
los cuatro niveles se distinguieron, la detención manual y automática funcionó,
una instrucción nueva sustituyó a la anterior, la voz se canceló al terminar la
navegación y no se produjo solapamiento con TalkBack. El recorrido secuencial
permitió alcanzar los párrafos y controles previstos. No se encontraron
incidencias en este caso de prueba. Después de esa validación, los controles sin
efecto para TalkBack se ocultaron y se eliminó el posible anuncio duplicado del
contador. La comprobación posterior confirmó que solo se muestra la explicación
de TalkBack y que una nueva instrucción se anuncia una vez, sin repetir el
contador.

## Riesgos y limitaciones

- Dos canales de voz simultáneos pueden solaparse si el sistema operativo no
  comunica correctamente el estado del lector; el valor seguro es mantener la
  voz propia bloqueada mientras el estado sea desconocido.
- Una plantilla necesita referencias espaciales comprensibles, no solo nombres
  de calles procedentes de ORS.
- Las instrucciones sintéticas sirven para probar la interfaz, pero no describen
  observaciones reales del entorno.
- Una instrucción de giro no demuestra por sí misma la accesibilidad del punto;
  la evidencia OSM se presenta mediante eventos separados para evitar confundir
  orientación y accesibilidad.
- La duración de cada tramo procede de ORS y es una estimación, no una medida
  personalizada de la velocidad de la persona.
- La prueba manual usa datos sintéticos cuando el backend está en modo
  `fixture`; sus calles y métricas no deben presentarse como observaciones del
  recorrido real.
- La agrupación longitudinal de un metro corrige coincidencias cartográficas,
  pero todavía necesita contrastarse con pasos divididos por refugios centrales.
- La agrupación de maniobras inferiores a 10 m mejora la continuidad oral, pero
  deberá calibrarse con velocidad real, precisión GPS y evaluación de usuarios.
- Los multiplicadores de velocidad no equivalen a las mismas palabras por
  minuto en todas las voces o dispositivos.
- Los cuatro niveles y el valor normal por defecto requieren validación con
  personas ciegas y con baja visión, incluidas usuarias noveles y expertas.
- La preferencia se conserva durante la navegación actual, pero todavía no
  persiste al reiniciar la aplicación.

## Texto base para la memoria

Se implementó una primera navegación manual para aislar y validar la cadena de
comunicación antes de incorporar el GPS. OpenRouteService aporta la secuencia
geométrica y el tipo de cada maniobra; el backend traduce los catorce códigos a
un modelo independiente del proveedor y genera frases españolas mediante
plantillas reproducibles. La aplicación valida de nuevo la secuencia, permite
elegir una alternativa y muestra un paso cada vez con controles de avance y
retroceso accesibles. Los avisos sobre evidencia desconocida o desfavorable se
mantienen separados de la maniobra, por lo que una indicación correcta nunca se
presenta como garantía de accesibilidad. TalkBack y TTS son canales de acceso a
información validada, no componentes de decisión ni aportaciones propias de
inteligencia artificial. La voz de la app se ofrece con cuatro velocidades y
reproducción automática voluntaria; cuando el sistema detecta TalkBack, la voz
propia se bloquea para impedir locuciones simultáneas. La selección se mantiene
local y no altera la clasificación.

## Trabajo pendiente

- [x] Definir e implementar el modelo de instrucciones.
- [x] Implementar plantillas españolas.
- [x] Implementar la navegación manual accesible.
- [x] Validar manualmente los controles de voz con y sin TalkBack.
- [x] Sanear referencias de vía inválidas procedentes de ORS.
- [x] Asociar y mostrar eventos OSM por instrucción.
- [x] Evitar cruces duplicados por representaciones nodo-vía coincidentes.
- [x] Integrar maniobras inferiores a 10 m en indicaciones secuenciales.
- [x] Integrar TTS y política de solapamiento con TalkBack.
- [x] Confirmar manualmente el anuncio único después de ocultar los controles
  de voz propios con TalkBack.
- [ ] Persistir la velocidad y el modo automático junto con el perfil local.
- [ ] Evaluar comprensión y preferencia de velocidad con personas usuarias.

## Referencias técnicas

Fuentes técnicas y académicas consultadas el 14, el 16 y el 17 de agosto de
2026:

| Fuente | Aportación aplicada al diseño |
| --- | --- |
| [W3C WAI, *Writing for Web Accessibility*](https://www.w3.org/WAI/tips/writing/) | Recomienda instrucciones claras y contenido conciso. Se aplicó al colocar primero la acción, usar frases breves y retirar formulaciones ambiguas. |
| [W3C WAI, *Use Clear and Understandable Content*](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/) | Recomienda vocabulario sencillo, bloques cortos, contenido inequívoco y separación de cada instrucción. Sustenta el resumen operativo y los detalles consultables por separado. |
| [W3C WAI, WCAG 2.2, criterio 2.4.3 sobre orden del foco](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) | Establece que la navegación secuencial debe preservar significado y operabilidad. Se aplicó al orden TalkBack: maniobra, contexto próximo, detalles y controles. |
| [W3C WAI, WCAG 2.2, criterio 1.3.3 sobre características sensoriales](https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html) | Indica que una instrucción no debe depender exclusivamente de dirección, posición o sonido. Por ello la señal acústica se combina con distancia, tipo de elemento y texto estructurado. |
| [Android Developers, *Test your app's accessibility*](https://developer.android.com/guide/topics/ui/accessibility/testing) | Propone recorrer todos los elementos con TalkBack, verificar que sean alcanzables y que los anuncios sean comprensibles y no innecesariamente extensos. Define el procedimiento de validación manual. |
| [Android Developers, *Behavior changes: all apps — Android 16*](https://developer.android.com/about/versions/16/behavior-changes-all#accessibility) | Desaconseja los anuncios de accesibilidad disruptivos y propone regiones dinámicas para cambios críticos. Sustenta un anuncio moderado único por instrucción y prioridad alta solo para estados críticos. |
| [openrouteservice, *Instruction Types*](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/instruction-types) | Documenta los catorce códigos de maniobra recibidos de ORS. Se utilizaron para crear las plantillas españolas deterministas. |
| [Expo Router 57](https://docs.expo.dev/versions/v57.0.0/sdk/router/) | Documenta la navegación entre pantallas de la aplicación; no determina el contenido lingüístico de las instrucciones. |
| [Expo, `expo-speech`](https://docs.expo.dev/versions/latest/sdk/speech/) | Documenta la síntesis, el idioma, el multiplicador `rate`, los eventos y `stop()`. Se utiliza para emitir y cancelar la voz de la app. |
| [React Native, `AccessibilityInfo`](https://reactnative.dev/docs/accessibilityinfo) | Permite consultar y observar el estado del lector de pantalla. Sustenta el bloqueo dinámico de la segunda voz. |
| [Android Developers, `TextToSpeech`](https://developer.android.com/reference/android/speech/tts/TextToSpeech#setSpeechRate(float)) | Define 1,0 como ritmo normal y los valores inferiores o superiores como multiplicadores relativos. |
| [W3C WAI, WCAG 2.2, criterio 1.4.2 sobre control de audio](https://www.w3.org/WAI/WCAG22/Understanding/audio-control) | Explica que el audio automático puede interferir con lectores de pantalla y que debe poder detenerse. Se adopta como principio de no interferencia. |
| [Choi et al. (2020), «Nobody Speaks that Fast!»](https://doi.org/10.1145/3313831.3376569) | Estudio cualitativo con diez personas con discapacidad visual; respalda la variabilidad individual y el control directo de la velocidad. No fija el valor óptimo del proyecto. |

Estas fuentes establecen principios generales y mecanismos técnicos, pero no
demuestran que una frase concreta sea óptima para todas las personas ciegas. La
redacción final requiere evaluación con usuarios del colectivo y registro de los
cambios derivados de esa evaluación.
