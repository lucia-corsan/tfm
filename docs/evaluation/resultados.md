# Resultados de evaluación

Estado: `Validado`
Última actualización: 18 de agosto de 2026
Responsabilidad principal: `evaluation`

## Resumen ejecutivo

La integración técnica con ORS, la caché y el enriquecimiento OSM ya se han
validado. El rerouting también se ha validado funcionalmente de extremo a
extremo con GPS simulado, ORS y TalkBack, y su umbral espacial se ha calibrado
con secuencias sintéticas. El núcleo de aprendizaje adaptativo se ha
implementado y `EXP-002` muestra una mejora frente a los pesos declarados fijos
con semillas y conjuntos sintéticos no usados para calibrar; además, un cuarto
perfil quedó completamente reservado para la evaluación. Permanecen pendientes
la prueba física controlada y la evaluación con personas. `EXP-007` trasladó la
configuración congelada a costes de rutas ORS enriquecidas con OSM y obtuvo un
resultado negativo de transferencia: 75 % adaptativo frente a 100 % fijo sobre
tres pares reservados aptos. La integración móvil
del aprendizaje está validada automática y funcionalmente en Android Emulator,
incluida la persistencia después de cerrar y reabrir la app.

## Integración de rutas reales

La primera petición del corredor piloto devolvió HTTP 200 y tres rutas base:
2.715, 2.734 y 2.868 metros, con 32, 40 y 29 instrucciones respectivamente. Una
segunda ejecución idéntica recuperó la respuesta de la caché sin repetir la
petición. Este resultado valida transporte, modelos y reutilización local; no
valida todavía accesibilidad ni calidad de la recomendación.

Las tres alternativas presentan métricas diferentes, pero no se interpretan
como una enumeración completa de rutas. Con la configuración
espacial calibrada, sus solapamientos por pares fueron 23,84 %, 31,25 % y
22,56 %, por lo que las tres se conservaron. `EXP-005` comparará este sistema de
referencia con una colección interna ampliada y deduplicada.

## Deduplicación espacial

`EXP-005A` evaluó 90 configuraciones sobre diez pares sintéticos etiquetados,
con 900 decisiones individuales. La configuración de 2 metros, 98 % de
solapamiento y 3 % de diferencia máxima de longitud obtuvo 100 % de exactitud,
precisión, sensibilidad y F1 en ese banco, sin falsos positivos. La tolerancia
de 1 metro produjo un falso negativo y las de 8 y 10 metros produjeron falsos
positivos. El resultado valida la regla para el incremento técnico, pero no
demuestra una exactitud general del 100 % en rutas reales.

## Enriquecimiento de rutas con evidencia OSM

La instantánea orientada a rutas contiene 3.670 elementos únicos y 16.630
coordenadas completas dentro del corredor piloto. El índice métrico, la
asociación espacial, la agregación de once familias, la cobertura longitudinal y
la incertidumbre están conectados con restricciones y puntuación.

`EXP-006` comparó corredores de 5, 10, 15 y 20 m sobre las mismas tres rutas. El
corredor de 5 m asoció 418 elementos y obtuvo una confianza media de 0,391. Con
10 m se asociaron 532 elementos y la confianza fue 0,409, pero el primer puesto
cambió y los cruces crecieron entre un 26 % y un 50 %. Se seleccionó 5 m para
reducir contaminación espacial. La incertidumbre media permaneció en 0,273 en
los cuatro casos, lo que evita confundir más proximidad con más conocimiento
temático.

## Puntuación estática

La puntuación estática está implementada, cubierta por pruebas y se utiliza como
sistema de referencia de pesos declarados en `EXP-002`, donde alcanza un 78,64 %
de exactitud en la condición principal. Sigue pendiente una evaluación
amplia de su calibración con participantes. En `EXP-007`, sobre tres pares
reales reservados aptos y preferencias latentes sintéticas, alcanzó el 100 % de
primeras posiciones. Ese porcentaje sufre un efecto techo y no se interpreta
como rendimiento general en el área piloto.

## Aprendizaje adaptativo

`EXP-002` separó la selección de hiperparámetros de la evaluación final. Se
examinaron 216 configuraciones sobre tres perfiles y tres semillas de
calibración. La opción seleccionada usa una tasa de 0,06, sensibilidad logística
de 3, regularización de 0,05, tres elecciones de observación, incrementos de
influencia de 0,10, un máximo aprendido del 50 % y un límite de cambio L1 de
0,12 para el vector aprendido.

La evaluación final utilizó cuatro perfiles, veinte semillas nuevas y 0 %, 10 %
y 20 % de elecciones inconsistentes. Cada ejecución contuvo 60 elecciones de
entrenamiento y 160 situaciones nuevas. En la condición principal del 10 %, los
resultados globales fueron:

| Sistema | Exactitud de la primera ruta | Exactitud por pares | Arrepentimiento medio | Arrepentimiento acumulado |
| --- | ---: | ---: | ---: | ---: |
| Ruta más corta | 49,34 % | 62,78 % | 0,05054 | 2,9580 |
| Pesos declarados fijos | 78,64 % | 85,27 % | 0,00902 | 0,5513 |
| Clasificación adaptativa | **89,05 %** | **92,35 %** | **0,00238** | **0,2719** |

La mejora emparejada frente al sistema fijo fue de 10,41 puntos porcentuales,
con un intervalo normal aproximado del 95 % entre 9,09 y 11,72 puntos. El
adaptativo mejoró 76 de las 80 combinaciones perfil–semilla y empeoró 4. También redujo el
arrepentimiento medio un 73,6 % y el acumulado un 50,7 %.

La ventaja se conservó bajo el análisis de robustez: 11,24 puntos sin ruido y
8,59 con un 20 % de elecciones inconsistentes. El cuarto perfil, excluido por
completo de la calibración, mejoró de 83,84 % a 87,47 %. Los pesos permanecieron
normalizados y el mayor salto efectivo observado fue de 0,0983. Ese valor es
una medida experimental separada: el límite 0,12 acota el vector aprendido y
no constituye una garantía universal sobre cualquier calendario de influencia.
La exactitud empezó a
mejorar entre las elecciones 5 y 10. El primer punto de control que permaneció
próximo al valor final observado tuvo una mediana de 60 elecciones; como 60 es
también el último punto medido, esto no demuestra convergencia.

La sensibilidad al cuestionario matiza el resultado principal. La adaptación
mejoró 16,41 puntos con una declaración uniforme, 10,41 con un 25 % de señal y
2,98 con un 50 %. Sin embargo, empeoró 4,77 puntos cuando la declaración ya
contenía un 75 % de la señal latente y 12,16 cuando era exacta. El aprendizaje
es útil para corregir perfiles imprecisos, pero no domina al sistema fijo en
todos los puntos de partida; debe permanecer opcional y reversible.

Estas cifras validan la recuperación de una preferencia lineal conocida y la
estabilidad del algoritmo. No permiten afirmar que el sistema haya aprendido
preferencias de personas reales, que la adaptación sea clínicamente útil ni que
una ruta sea segura. El protocolo, las fórmulas, las figuras y todas las
amenazas a la validez se detallan en
[la evaluación de aprendizaje](calibracion-aprendizaje-adaptativo.md).

### Validación técnica de la integración móvil

La evaluación sintética anterior mide el algoritmo; una batería diferente
comprueba que el prototipo ejecuta realmente el ciclo. Python y TypeScript
producen la misma actualización de referencia hasta doce decimales. La app
mantiene pesos no negativos y normalizados tras 500 elecciones, observa las
tres primeras sin cambiar el orden, persiste el estado, se recupera de un dato
dañado y excluye coordenadas y direcciones del registro. Los endpoints de
comparación y recálculo conservan separados los pesos declarados y efectivos y
siguen rechazando una alternativa crítica con cualquier mezcla aprendida.

La suite completa alcanza 283 pruebas del backend y 153 de la aplicación, sin
incidencias en Ruff, ESLint ni TypeScript. Esto valida la coherencia técnica de
la integración, no su utilidad ni comprensibilidad para personas ciegas o con
baja visión. Esa diferencia impide sumar las pruebas de software a la evidencia
de eficacia de `EXP-002`.

### Transferencia a rutas ORS enriquecidas con OSM

`EXP-007` congeló la configuración anterior y sustituyó los costes sintéticos
independientes por costes calculados a partir de rutas ORS y evidencia OSM.
Antes de descargar se fijaron doce pares: ocho para aprendizaje y cuatro
reservados. ORS produjo 31 rutas válidas sobre el mismo grafo; 24 superaron las
restricciones. Debido a descartes, baja disponibilidad y una respuesta externa
incoherente, solo cuatro pares de aprendizaje y tres reservados conservaron al
menos dos alternativas.

| Sistema | Exactitud de la primera ruta | Exactitud por pares | Arrepentimiento medio |
| --- | ---: | ---: | ---: |
| Ruta más corta | 75,00 % | 80,56 % | 0,00525 |
| Pesos declarados fijos | **100,00 %** | **97,22 %** | **0,00000** |
| Clasificación adaptativa, 60 elecciones | 75,00 % | 84,31 % | 0,00525 |

La adaptación no transfirió la mejora de `EXP-002`. Los cuatro perfiles
sintéticos escogieron la misma ruta en cada uno de los cuatro pares de
aprendizaje aptos. Además, orientación y pendiente fueron constantes en las 24
rutas aceptadas. El sistema recibió elecciones, pero no ejemplos capaces de
distinguir los perfiles. Los pesos fijos ya acertaban todas las primeras
posiciones reservadas, de modo que tampoco existía margen para mejorarlos en
esta muestra.

La figura 10 muestra que el adaptativo coincide inicialmente con el sistema
fijo, baja al 90,42 % tras cinco elecciones y termina en 75 %. No se han
reajustado los hiperparámetros ni sustituido pares después de observarlo. Este
resultado negativo demuestra que un aprendizaje correctamente implementado no
garantiza una mejora cuando los contextos observados son pequeños,
correlacionados y poco informativos. Refuerza la decisión de mantener la
función desactivada al inicio, opcional y reversible.

El protocolo, la incidencia de ORS, la disponibilidad por par, la figura y los
CSV sanitizados se encuentran en
[EXP-007](evaluacion-aprendizaje-rutas-reales.md).

### Diagnóstico de capacidad informativa

`EXP-008` estudió el problema revelado por la transferencia negativa: una
secuencia larga puede repetir pocas comparaciones y no identificar
preferencias. Se analizaron dos bancos contrastados en cinco puntos entre 4 y
60 elecciones. Cada punto reunió 80 combinaciones de cuatro perfiles y veinte
semillas. En el sintético las semillas generan situaciones; en el real solo
cambian el orden y el ruido de los mismos cuatro pares aptos.

| Regla después de 8 elecciones | Banco sintético informativo | Banco ORS y OSM limitado |
| --- | ---: | ---: |
| Solo contar elecciones | 100 % suficiente | 100 % suficiente |
| Contraste, variedad, dimensiones y rango | **100 % suficiente** | **0 % suficiente** |

La diferencia persistió hasta 60 elecciones. El banco sintético presentó
contraste en las nueve dimensiones y rango nueve; el real, solo en cinco
dimensiones y rango seis. El contador de comparaciones distintas del banco real
aumentó de 9,4 a 15,9 por repeticiones y elecciones inconsistentes, pero esto no
creó variación en los factores ausentes.

El resultado valida técnicamente el diagnóstico para estos dos bancos, no una
regla universal. No se conecta todavía al ranking: hacerlo exigiría más zonas,
perfiles concentrados en pocas dimensiones y una ventana posterior que compare
predicciones fijas y adaptativas sobre elecciones no usadas para entrenar. La
política de producto sigue siendo aprendizaje voluntario y desactivado al
inicio. El protocolo, la figura y los artefactos están en
[EXP-008](diagnostico-capacidad-informativa.md).

## Incertidumbre y explicaciones

La incertidumbre, la confianza, los avisos y las razones están implementados y
cubiertos por pruebas estructurales. Sigue pendiente evaluar sistemáticamente
la fidelidad y la comprensión de las explicaciones con rutas reales y con
personas usuarias; esa ausencia impide presentarlas todavía como validadas en
uso.

## GPS y rerouting

El primer incremento de GPS incorpora cálculo local de distancia a la ruta,
activación voluntaria, permiso exclusivamente en primer plano y limpieza de la suscripción al abandonar
la pantalla y un detector espacial y temporal. Se rechazan muestras con más de
25 m de imprecisión y se exigen tres lecturas fiables fuera de 30 m durante al
menos 10 s. El avance automático aplica 15 m tanto a la precisión máxima como a
la proximidad a la siguiente maniobra y solo avanza un paso por muestra.

El primer incremento elevó la aplicación a 70 pruebas: 17 cubren geometría, estados de
desviación, activación explícita, permiso denegado, alta y baja del observador y
avance automático.
TypeScript y ESLint finalizan sin errores.

El segundo incremento implementa `POST /api/v1/routes/reroute`, conserva en
memoria el destino y el perfil completo, exige confirmación antes de enviar la
posición y vuelve a ejecutar generación, enriquecimiento, restricciones y
ranking. La app adopta la primera ruta aceptada solo cuando toda la respuesta es
válida. Rechazar no genera ninguna petición; un fallo o cero alternativas
aceptadas conserva la ruta previa. Durante la petición se impiden duplicados y
tras un éxito se suspenden nuevas alertas durante 60 segundos.

Este incremento añade 8 pruebas de backend y 13 de aplicación. Cubren modelos,
HTTP, OpenAPI, conservación del perfil, rechazo, éxito, errores, respuestas sin
rutas válidas, cierre durante la petición, sustitución de instrucciones y
periodo de espera.

La validación manual del 16 de agosto de 2026 utilizó Android Emulator con un
Pixel 9, Android 16, TalkBack, ubicaciones simuladas y el proveedor ORS. Se
comprobaron dos ramas del diálogo. Al mantener la ruta no se produjo ninguna
petición de recálculo y se conservaron la ruta y la instrucción activas. Al
aceptar, el backend respondió con nuevas alternativas enriquecidas y puntuadas,
la app adoptó una respuesta válida, reinició la navegación en la primera
instrucción y anunció el periodo de 60 segundos sin alertas.

También se detuvo deliberadamente el backend antes de confirmar un recálculo.
La aplicación mostró un error recuperable sin eliminar la ruta ni la
instrucción anterior. Después de reiniciar el servicio, el botón de reintento
completó el recálculo. TalkBack permitió recorrer en orden el título, la
explicación, las dos decisiones, el estado de error y la acción de reintento.

Durante la prueba, unas coordenadas que habían servido como desviación respecto
a la ruta inicial quedaron próximas a la geometría recalculada y fueron
clasificadas correctamente como parte del recorrido. La alerta apareció al
usar puntos medidos respecto a la ruta activa. Esta observación evidencia que
el detector cambia de referencia tras el recálculo y evita evaluar una nueva
desviación contra una geometría obsoleta.

Esta es una validación funcional de un caso reproducible, no una calibración de
los umbrales. La calibración posterior `EXP-003` comparó 20, 30 y 40 m sobre
trece secuencias sintéticas preetiquetadas, manteniendo constantes la precisión,
el número de muestras y la duración mínima.

El umbral de 20 m alcanzó una sensibilidad del 100 %, pero produjo dos falsas
alertas y un F1 de 85,7 %. El de 40 m no produjo falsas alertas, aunque omitió
dos de las seis desviaciones y redujo el F1 al 80,0 %. El valor de 30 m obtuvo
92,3 % de exactitud, 100 % de precisión, 83,3 % de sensibilidad y un F1 de
90,9 %, con una desviación omitida y ninguna falsa alerta. Por ello se mantiene
como configuración inicial del MVP. La latencia media fue de 11 s y la mediana,
de 10 s.

Este resultado valida una decisión reproducible sobre un banco de diseño; no
estima el rendimiento físico del GPS. Los demás parámetros y su idoneidad en
exteriores continúan pendientes de recorridos controlados.

## Narración y navegación manual

La cadena de instrucciones se ha validado automáticamente desde la respuesta de
ORS hasta la pantalla. Los catorce códigos documentados se traducen a maniobras
propias y frases españolas deterministas. Backend y app rechazan secuencias
desordenadas, referencias inexistentes o coordenadas que no coincidan con la
geometría. La interfaz permite escoger una alternativa, avanzar y retroceder sin
salirse de los límites y terminar mediante una acción explícita.

La revisión manual descubrió una referencia de relleno procedente de ORS y la
ausencia de contexto OSM en el paso concreto. Tras la corrección, los guiones y
otros marcadores de ausencia ya no se pronuncian como nombres de calle. Los
cruces y escalones se sitúan dentro de la secuencia y sus detalles se entregan
como unidades independientes: tipo de cruce, semáforo, ayuda acústica o
vibratoria, pavimento podotáctil, bordillo y rampa. Las pruebas verifican además
que una etiqueta ausente se conserva como desconocida y nunca se transforma en
una ausencia afirmada.

Sobre la caché real, las tres alternativas conservan 27, 38 y 23 cruces
navegacionales tras agrupar las dobles representaciones nodo-vía, con 162, 228
y 138 detalles accesibles. No quedó ninguna instrucción con `-` como
referencia. El volumen confirma que la cadena completa usa la instantánea OSM;
no convierte esos metadatos colaborativos en observaciones garantizadas del
estado actual de la calle.

Estos resultados demuestran coherencia del software con datos reproducibles. La
revisión posterior del emulador confirmó la coordinación funcional sin
solapamientos entre TTS y TalkBack. Aun así, no permiten concluir que las
instrucciones sean fáciles de seguir en la calle ni que el momento de cada aviso
sea adecuado. Esas cuestiones requieren recorridos controlados y evaluación con
personas usuarias.

La validación automática alcanza 283 pruebas de backend y 157 de la aplicación,
distribuidas estas últimas en veinticinco grupos. Se ha ampliado con casos
específicos de voz, velocidad y detección del lector de pantalla, además de
Ruff, TypeScript y ESLint. La política comprobada solicita `es-ES`, transmite
el multiplicador elegido, detiene la cola anterior y no llama al motor de voz
cuando TalkBack está activo. La validación auditiva del 17 de agosto distinguió
los cuatro niveles, confirmó la detención, el modo automático, la sustitución
de frases, el cierre sin audio residual y la ausencia de dos voces simultáneas.
También se recorrieron los párrafos previstos con TalkBack sin encontrar
incidencias. Esto valida el caso funcional del emulador, pero todavía no la
inteligibilidad ni la preferencia de una muestra de personas usuarias.

Tras la prueba se simplificó la coordinación: con TalkBack activo se ocultan los
controles exclusivos de `expo-speech` y se muestra una explicación breve. Solo
el texto de la nueva instrucción actúa como región dinámica moderada; el
contador deja de anunciarse por separado. Desviaciones, recálculos y errores
mantienen prioridad alta. La medida reduce ruido y conserva la separación entre
lector de pantalla e indicaciones propias. La comprobación manual posterior
confirmó que aparece únicamente la explicación de TalkBack y que el cambio de
paso produce un solo anuncio de instrucción.

## Accesibilidad y usabilidad

La pantalla de comparación se ha recorrido correctamente con TalkBack en
Android 16. La validación manual cubrió los perfiles, las rutas aceptadas y
descartadas, los fallos recuperables, la procedencia de los datos, los atributos
desconocidos y la búsqueda de una dirección real del área piloto. La prueba
confirma el funcionamiento técnico y el orden de lectura en el emulador; no
sustituye una evaluación de usabilidad con participantes.

## Tabla maestra

| Experimento | Métrica principal | Sistema de referencia | Sistema evaluado | Interpretación |
| --- | ---: | ---: | ---: | --- |
| EXP-002 | 89,05 % frente a 78,64 %; mejora de 10,41 puntos | Pesos declarados fijos | Clasificación adaptativa | Recupera una señal sintética conocida; integración móvil automática superada y usuarios pendientes |
| EXP-003 | F1 90,9 %; 0 falsas alertas; 1 omitida | 30 m iniciales | 20, 30 y 40 m | Se mantienen 30 m; validación física pendiente |
| EXP-004 | 3 rutas válidas; segunda petición evitada | Primera llamada ORS | Cliente y caché propios | Integración técnica superada; accesibilidad pendiente |
| EXP-005A | 100 % en 10 pares; 0 falsos positivos | 10 m, 85 % y 5 % | 2 m, 98 % y 3 % | Umbral conservador integrado; generalización pendiente |
| EXP-006 | 418 elementos; confianza media 0,391 | Corredor de 10 m | Corredor de 5 m | Menos contaminación potencial con cobertura útil; revisión manual pendiente |
| EXP-007 | 75,00 % frente a 100,00 % fijo | Pesos declarados fijos | Clasificación adaptativa sobre costes ORS+OSM | Transferencia no observada; conjunto pequeño, señal no discriminante y efecto techo |
| VAL-002 | 4 niveles; 0 llamadas TTS con TalkBack; validación auditiva sin incidencias | Voz normal y manual | TTS configurable y condicionado | Coordinación funcional superada; evaluación con usuarios pendiente |
