# 5. Implementación

Estado: `En implementación`
Última actualización: 17 de agosto de 2026.

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
restricciones. La búsqueda de calles ya está integrada dentro del área piloto.
El recálculo confirmado también está conectado al mismo proceso para que una
desviación no rebaje las garantías aplicadas durante la comparación inicial.

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
TalkBack. La búsqueda libre de direcciones del área piloto también se validó de
extremo a extremo. La persistencia del perfil y la navegación pertenecen a
fases posteriores.

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

### Primer incremento de navegación

La navegación se implementó primero sin GPS para separar dos problemas: saber
qué instrucción corresponde a cada tramo y decidir automáticamente cuándo debe
avanzarse. OpenRouteService entrega códigos numéricos de maniobra. El backend
traduce los catorce códigos documentados a nombres propios, comprueba su orden y
su posición sobre la geometría y genera una frase breve en español mediante una
plantilla. Cuando no existe nombre de calle, no se inventa ninguna referencia.

La respuesta de comparación incorpora la secuencia completa. Antes de mostrarla,
la aplicación comprueba de nuevo que las instrucciones sean consecutivas y que
cada posición coincida con un punto de la ruta. Cada alternativa aceptada ofrece
el botón «Elegir esta ruta»; las descartadas no pueden iniciar navegación. La
ruta seleccionada se conserva solo en memoria y se abre en una pantalla que
muestra un paso cada vez, con progreso, distancia, duración y controles para
avanzar o retroceder.

Los límites se protegen de forma explícita: no se puede retroceder desde el
primer paso ni avanzar después de la llegada. Finalizar requiere una acción de
la persona y devuelve a la comparación. Durante el recorrido manual se mantiene
un resumen de información desconocida y evidencia desfavorable, junto con el
aviso de que las instrucciones no garantizan accesibilidad completa.

Una comprobación manual con una ruta real permitió detectar dos carencias. En
primer lugar, una referencia de calle con el valor de relleno `-` producía la
frase «Gira a la derecha hacia -». Se añadió una única regla de limpieza que
descarta guiones y expresiones equivalentes a «sin nombre» antes de crear la
frase y antes de enviar la referencia a la aplicación. Cuando no existe un nombre
válido, se conserva la maniobra —por ejemplo, «Gira a la derecha»— sin inventar
una calle.

En segundo lugar, la caracterización OSM se utilizaba para puntuar la ruta y para
el resumen global, pero no se presentaba junto al paso de navegación al que
afectaba. Se incorporó un nivel intermedio de «evento de accesibilidad». Cada
cruce o tramo con escalones se proyecta sobre la geometría y se asigna a la
instrucción que contiene esa posición. Para los cruces se informa por separado
del tipo de paso, semáforo, señal acústica o vibratoria, pavimento podotáctil,
bordillo y rampa. Esta separación permite que TalkBack lea cada dato como un
párrafo independiente y que la persona decida cuándo avanzar.

Una segunda revisión mostró que separar correctamente los datos tampoco bastaba:
«Gira a la derecha», la distancia y las características del cruce seguían siendo
piezas aisladas. La instrucción principal pasó a integrar la acción inmediata,
la distancia posterior a la maniobra y el primer punto de referencia no visual.
Así, una frase real puede indicar: «Gira a la derecha. Después del giro, avanza
34 metros. Al comenzar este tramo, los datos sitúan un cruce peatonal. Constan
estas características: semáforo y señal acústica». Los detalles completos se
mantienen debajo para su consulta secuencial.

Se evitó la promesa «escucharás el semáforo»: OSM acredita que la característica
está declarada, pero no que siga operativa en el momento del recorrido. Tampoco
se introdujeron todavía rumbos cardinales. Sin brújula ni GPS, un rumbo derivado
de pocos puntos puede ser inestable y exigir una orientación absoluta que la
persona no comparte necesariamente. La formulación se evaluará con personas
ciegas antes de considerarla definitiva.

El tratamiento es deliberadamente conservador. Una etiqueta afirmativa en OSM
permite comunicar la característica declarada; una etiqueta negativa produce un
aviso; una etiqueta ausente se expresa como «no se puede confirmar». Por tanto,
la falta de una etiqueta sobre señal acústica nunca se convierte en la afirmación
de que el semáforo no emite sonido. Los objetos se limitan al corredor espacial
de 5 m ya calibrado y se describen como «próximos», pues la cercanía no demuestra
por sí sola el lado exacto de la calle. Los escalones, por su riesgo, solo se
anuncian cuando cumplen la regla estricta de alineación con la ruta.

Esta etapa no guarda coordenadas, no sigue la ubicación y no emite voz
automática. Su finalidad es comprobar la coherencia de los datos y de la
interfaz accesible antes de añadir el ruido propio del GPS y la posible
interferencia entre TTS y TalkBack.

### Seguimiento GPS en primer plano

El segundo incremento añadió el seguimiento sin modificar todavía la ruta. La
aplicación explica primero para qué necesita la ubicación y solicita permiso
solo si la persona pulsa el botón de activación. El permiso se limita al uso de
la pantalla de navegación y se crea un único observador de posición. Al cerrar
la pantalla se elimina la
suscripción. Las coordenadas se procesan en memoria para calcular la distancia a
la polilínea activa; no se guardan, no se imprimen en los registros y no se
envían a ORS durante esta fase.

La detección separa precisión, distancia y persistencia temporal. Las muestras
con una precisión peor de 25 m se descartan. Una lectura situada a más de 30 m
solo inicia un estado de posible desviación; se requieren al menos tres muestras
fiables y diez segundos antes de solicitar confirmación. Una lectura fiable
dentro del corredor reinicia la secuencia. Esta política evita interpretar un
salto aislado del GPS como abandono de la ruta.

El avance automático utiliza límites más estrictos porque decidir que se ha
alcanzado una maniobra es distinto de detectar un alejamiento. Solo avanza si la
precisión es de 15 m o mejor y la posición queda a 15 m o menos del siguiente
punto. Cada muestra puede avanzar como máximo un paso. Los botones de avance y
retroceso permanecen disponibles cuando se deniega el permiso, falla el sensor
o la posición es imprecisa.

El detector se implementó como lógica TypeScript independiente de la interfaz,
lo que permite reproducir secuencias GPS sintéticas. La app comunica mediante
TalkBack los estados de espera, permiso denegado, baja precisión, seguimiento,
posible desviación y confirmación necesaria. El recálculo se mantiene fuera de
este incremento inicial, que permitió validar primero la estabilidad de la
señal. El incremento siguiente lo conecta con el backend.

La calibración reutilizó esa misma función pura para evitar evaluar una
imitación del comportamiento real. Se fijaron trece secuencias sintéticas y se
compararon 20, 30 y 40 m, sin cambiar la precisión máxima, el número de muestras
ni el tiempo mínimo. Un script ejecuta las 39 predicciones y conserva dos tablas
CSV. La regla de selección se codificó y probó para impedir escoger manualmente
la configuración después de ver los datos.

Los 30 m obtuvieron el mayor F1 y ninguna falsa alerta en el banco. Mantener el
valor inicial después de calibrarlo no significa aceptar la hipótesis de
antemano: 20 m detectó más desviaciones, pero reaccionó ante dos desplazamientos
benignos, mientras que 40 m omitió dos separaciones. El resultado deberá
revisarse con trazas físicas.

### Recálculo confirmado y conservación de la ruta

El tercer incremento conectó la confirmación de desviación con el recálculo de
rutas. Durante la navegación se conserva únicamente en memoria una sesión con
la ruta activa, el destino y el perfil completo que produjo la comparación. De
este modo, la aplicación puede volver a solicitar alternativas desde la última
posición fiable sin reconstruir ni simplificar las preferencias de la persona.
No se guardan coordenadas en disco ni se incluyen en los registros.

Cuando tres muestras fiables confirman una posible desviación durante al menos
diez segundos, se abre un diálogo accesible. TalkBack recibe primero el título
y después dos acciones inequívocas: «Mantener la ruta actual» y «Calcular una
nueva ruta». Rechazar el recálculo no genera ninguna petición y reinicia la
evidencia acumulada. Confirmarlo autoriza el envío puntual de la posición actual
al backend; esta diferencia materializa el principio de consentimiento en el
propio flujo y evita transmitir ubicación ante una mera lectura ruidosa.

El endpoint `POST /api/v1/routes/reroute` no aplica un criterio abreviado. Toma
la posición confirmada como nuevo origen y reutiliza la cadena ya validada:
generación de rutas con el proveedor configurado, enriquecimiento OSM,
restricciones críticas, cálculo de adecuación, confianza e incertidumbre y
clasificación según el mismo perfil. La aplicación toma la primera alternativa
aceptada de esa respuesta. Esta automatización se considera proporcionada
porque la persona ya ha confirmado expresamente que desea recalcular y porque
pedir una segunda comparación completa durante una desviación aumentaría la
carga de interacción. No obstante, la selección sigue limitada por las mismas
restricciones críticas y nunca convierte un dato desconocido en evidencia
favorable.

La ruta anterior constituye el estado seguro mientras llega la respuesta. Ni
la carga, ni un fallo de red o del proveedor, ni una respuesta inválida, ni la
ausencia de alternativas aceptables la sustituyen. En esos casos se mantiene la
instrucción que estaba activa, se presenta un error comprensible y se ofrece un
botón para reintentar. Solo una respuesta válida reemplaza la geometría, lleva
la navegación al primer paso de la nueva ruta y activa un periodo de 60 segundos
sin nuevas alertas de desviación. El periodo evita ciclos de recálculo causados
por la inestabilidad del GPS inmediatamente posterior al cambio.

La petición se cancela lógicamente al abandonar la pantalla: aunque una
respuesta de red llegue tarde, no puede modificar una navegación que ya se ha
cerrado. Esta protección, la conservación de la ruta anterior y la ausencia de
persistencia de coordenadas separan el fallo técnico de una pérdida de contexto
para la persona usuaria.

La validación funcional en Android Emulator confirmó las dos decisiones del
diálogo con TalkBack. Rechazar no envió la posición ni alteró la navegación; al
aceptar, ORS devolvió nuevas candidatas que se enriquecieron y puntuaron de
nuevo antes de adoptar la primera alternativa válida. Una segunda prueba, con
el backend detenido de forma deliberada, confirmó que el error no borra la ruta
ni la instrucción actual y que el reintento funciona después de recuperar el
servicio. Por tanto, se ha comprobado la tolerancia funcional a un fallo de red
en el caso piloto, aunque no la fiabilidad estadística de los umbrales GPS.

En conjunto, el flujo establece una cadena de decisiones comprobables. Primero,
el GPS debe aportar evidencia estable de separación; después, la aplicación
informa y solicita permiso para recalcular. Un rechazo conserva la navegación
sin comunicación externa. Una aceptación envía la posición actual, el destino
y el perfil, pero todavía no sustituye la ruta. El backend genera nuevas
candidatas, las enriquece otra vez con OSM, aplica restricciones críticas y
recalcula adecuación, confianza e incertidumbre. Finalmente, la aplicación
valida la respuesta y solo entonces reemplaza la ruta. Así se evita equiparar
una desviación detectada, una petición aceptada o una geometría generada por ORS
con una alternativa ya evaluada y apta para mostrarse.

La especificación completa de cada transición, incluidos el rechazo, los fallos
y el periodo de estabilización, se conserva en
[GPS en primer plano y rerouting confirmado](../product/gps-rerouting.md).

El perfil seleccionado se conserva durante la sesión y se incluye en cada
petición. El backend calcula el ranking sin almacenar usuarios ni preferencias.
El estado adaptativo, en cambio, se conserva por perfil en SQLite dentro del
dispositivo y se conecta con la acción «Elegir esta ruta». Se descartó una base
remota porque exigiría cuentas, sincronización y una superficie de privacidad
innecesarias para el experimento del TFM.

### Estados y accesibilidad

El flujo diferencia estado inicial, carga, éxito y error. Si se cambia el perfil
mientras existe una petición pendiente, su respuesta se descarta mediante un
identificador incremental para impedir que un resultado antiguo se atribuya al
perfil nuevo. La carga y el resultado se anuncian de forma moderada; los errores
se anuncian como avisos prioritarios. Cada control expone rol, etiqueta y estado,
y las métricas se expresan textualmente para no depender del color.

## Núcleo de aprendizaje adaptativo

`backend/feedback` implementa una actualización en línea a partir de una ruta
elegida y una o dos alternativas aceptadas no seleccionadas. Sus modelos
rechazan campos inesperados y solo conservan identificadores opacos y los nueve
costes normalizados. No son necesarias coordenadas, direcciones ni trazas de
navegación para ajustar las preferencias.

La actualización se ha mantenido como lógica pura: recibe un estado validado y
devuelve otro nuevo junto con un informe auditable. La función calcula la
probabilidad logística de cada comparación, promedia sus gradientes, añade una
regularización hacia el perfil declarado, ejecuta un paso de descenso y
proyecta el resultado al conjunto de pesos no negativos que suman uno. Si el
cambio propuesto supera 0,12 en distancia L1, se reduce proporcionalmente.

Se conservan tres capas de pesos:

1. Los declarados, que nunca se sobrescriben.
2. Los aprendidos, que se actualizan desde la primera elección una vez activado
   el aprendizaje.
3. Los efectivos, que permanecen iguales a los declarados durante tres
   elecciones y después incorporan hasta un 50 % de los aprendidos.

El estado nuevo se crea desactivado. La interfaz móvil solicita una activación
explícita mediante un interruptor accesible; el simulador también lo activa de
forma expresa para poder medir el algoritmo. Desactivar conserva lo aprendido
sin aplicarlo y reiniciar solicita confirmación antes de eliminar las
observaciones.

La clasificación existente acepta de forma opcional los pesos efectivos, pero
mantiene las restricciones críticas ligadas al perfil original. Esta frontera
se prueba intentando volver a ordenar una ruta rechazada con pesos extremos: la
ruta continúa fuera de las alternativas aceptadas. También se prueban 500
actualizaciones consecutivas, el signo de aprendizaje, las comparaciones sin
información, la equivalencia entre una y dos alternativas, la desactivación, el
reinicio y la serialización reproducible.

El experimento se implementa en `ml/adaptive_preferences/evaluation.py`. El
script separa calibración y evaluación, conserva resultados por ejecución en
CSV y genera dos figuras mediante semillas fijas. De este modo, los números de
la memoria pueden reconstruirse sin depender de una sesión interactiva ni de un
servicio externo. La formulación completa se encuentra en
[Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md) y el protocolo,
en [EXP-002](../evaluation/calibracion-aprendizaje-adaptativo.md).

### Integración local del ciclo adaptativo

La traducción TypeScript reproduce las mismas nueve dimensiones y operaciones
que la referencia Python. No se dio por correcta solo por parecer equivalente:
un caso dorado compartido fija la entrada, cuatro elecciones sucesivas y todas
las salidas relevantes. Las dos plataformas coinciden hasta doce decimales.

La persistencia utiliza el almacén clave-valor de Expo respaldado por SQLite. Un
único valor versionado por perfil contiene el estado y, como máximo, las 200
observaciones más recientes. La escritura conjunta evita desajustes entre el
contador y el historial. Al cargar, se comprueban versión, perfil,
configuración, no negatividad y suma de los pesos. Si el contenido es
incompatible o está dañado, se elimina y se recuperan las preferencias
declaradas; la comparación y la navegación siguen disponibles en modo fijo.

La app solo construye una observación desde la respuesta aceptada que se mostró
en pantalla. Una ruta descartada no puede ser seleccionada por identificador y,
si solo queda una ruta válida, se permite navegar pero no se inventa una señal
comparativa. Tras guardar la actualización, la sesión de navegación conserva
los pesos efectivos para que un posible recálculo aplique el mismo estado. La
explicación comunica si la elección sigue en observación o qué dos dimensiones
han cambiado más, y recuerda que las restricciones y los avisos permanecen.

Se almacenan costes, identificadores técnicos, pesos, día aproximado y estado
anterior y posterior. No se almacenan origen, destino, posición GPS, nombres de
calles, geometrías, instrucciones ni audio. SQLite no está cifrado en este MVP;
la reducción de datos limita el impacto, mientras que SQLCipher se descartó por
requerir compilación nativa y gestión de claves sin aportar valor al experimento
actual.

## Datos y servicios

Caché exploratoria OSM/Mapillary completada. La caché ORS utiliza archivos
atómicos con permisos privados, claves opacas sin credenciales y validación en
cada lectura. La instantánea OSM orientada a rutas también está validada y
almacenada localmente. Su agregación por corredor y la respuesta real de la API
están implementadas; Mapillary permanece como contexto de cobertura y no
modifica el ranking.

## Voz de navegación y control de velocidad

La síntesis de voz se incorporó después de validar la secuencia de instrucciones,
el GPS y el recálculo. Esta ordenación evita atribuir al motor de voz un error
que en realidad proceda de la geometría o de la asociación con OSM. El motor no
redacta ni modifica indicaciones: recibe exactamente el resumen determinista que
ya aparece en pantalla. Por tanto, la salida oral conserva las mismas
limitaciones y avisos y no constituye un componente de inteligencia artificial.

No se definió una velocidad específica para «usuarios ciegos». La bibliografía
muestra una gran variación ligada a la experiencia y al tipo de tarea, y un
estudio cualitativo de Choi et al. (2020) documenta tanto el uso de velocidades
superiores al habla convencional como la necesidad de cambiarlas directamente.
La aplicación ofrece cuatro niveles relativos —0,8; 1,0; 1,25 y 1,5—, con 1,0
como valor inicial. Son multiplicadores del motor de Android y no equivalen a
un número fijo de palabras por minuto. Esta precisión evita presentar como
resultado medido lo que todavía es una hipótesis de interfaz.

La reproducción automática está desactivada inicialmente. La persona puede
escuchar y detener la instrucción actual o activar voluntariamente la lectura
de cada nuevo paso. Antes de emitir una frase se interrumpe la anterior, y la
voz también se cancela al abandonar la pantalla. El idioma solicitado es
`es-ES`, aunque la voz concreta depende del paquete instalado en Android.

La convivencia con TalkBack utiliza `AccessibilityInfo` para consultar y
observar el estado del lector de pantalla. Mientras ese estado sea desconocido
no se permite iniciar `expo-speech`. Cuando TalkBack está activo, los controles
exclusivos de la segunda voz se ocultan, aparece una explicación breve y
cualquier locución en curso se detiene. La instrucción sigue siendo un nodo de
texto accesible y actúa como única región dinámica moderada cuando cambia; el
contador no genera un segundo anuncio. Las desviaciones, los recálculos y los
errores conservan prioridad alta. Se adopta esta política para impedir que dos
locuciones compitan por el mismo canal y para reducir anuncios redundantes.

La validación auditiva en Android Emulator distinguió las cuatro velocidades y
confirmó la detención, la reproducción automática voluntaria, la sustitución de
una frase obsoleta, el cierre sin audio residual y la ausencia de solapamiento
con TalkBack. El recorrido secuencial alcanzó los párrafos comprobados sin
incidencias. Este resultado verifica un caso funcional, pero no sustituye la
evaluación con personas ciegas o con baja visión.

La velocidad y el modo automático se conservan únicamente durante la navegación
actual. No se envían al backend ni afectan a la clasificación. Su persistencia
se incorporará al repositorio local común del perfil y de los pesos aprendidos,
en vez de introducir un almacenamiento temporal que después deba migrarse.

## Calidad

Ruff, pytest, ESLint, TypeScript, Jest, Expo Doctor y CI separada. El backend
mantiene 265 pruebas superadas y la aplicación alcanza 126 pruebas en veintiún
grupos, además de superar lint y comprobación estricta de tipos. En navegación
se prueban los catorce tipos de maniobra, la coherencia geométrica, las frases,
la limpieza de referencias, la asociación de evidencia a cada tramo, la ruta
elegida, el avance, el retroceso, los límites y la finalización explícita. La
prueba manual de rerouting con TalkBack, ORS y GPS simulado también está
superada. La revisión de todos los eventos de accesibilidad durante un recorrido
físico completo se mantendrá separada de esta validación funcional.

## Decisiones e incidencias

No duplicar el journal: seleccionar aquí únicamente decisiones que expliquen la
implementación final y enlazar evidencias.

## Fuentes internas

- [Journal](../journal.md).
- [Entorno](../operations/entorno-desarrollo.md).
- [Incidencias](../operations/incidencias.md).
- [Especificación de la API](../product/especificacion-api.md).
- [Comparación en la app](../product/comparacion-rutas-app.md).
- [Narración y navegación manual](../product/narracion-talkback-tts.md).
- [GPS en primer plano y rerouting confirmado](../product/gps-rerouting.md).
- [Integración de ORS](../research/integracion-openrouteservice.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Preparación de OSM para rutas](../research/preparacion-osm-para-rutas.md).
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).
- [Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md).
- [Evaluación del aprendizaje](../evaluation/calibracion-aprendizaje-adaptativo.md).
- [Integración móvil del aprendizaje](../research/integracion-aprendizaje-adaptativo-app.md).
