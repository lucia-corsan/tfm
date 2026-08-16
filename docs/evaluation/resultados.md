# Resultados de evaluación

Estado: `En implementación`
Última actualización: 16 de agosto de 2026
Responsabilidad principal: `evaluation`

## Resumen ejecutivo

La integración técnica con ORS, la caché y el enriquecimiento OSM ya se han
validado. El rerouting también se ha validado funcionalmente de extremo a
extremo con GPS simulado, ORS y TalkBack, y su umbral espacial se ha calibrado
con secuencias sintéticas. Permanecen pendientes la prueba física controlada,
el aprendizaje y la evaluación de usabilidad completa.

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

Pendiente.

## Aprendizaje adaptativo

Pendiente.

## Incertidumbre y explicaciones

Pendiente.

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

Estos resultados demuestran coherencia del software con datos reproducibles. No
permiten concluir todavía que las instrucciones sean fáciles de seguir en la
calle, que el momento de cada aviso sea adecuado o que la interacción con TTS y
TalkBack no produzca solapamientos. Esas cuestiones requieren la revisión manual
del emulador y, posteriormente, recorridos simulados o controlados con GPS.

La validación automática alcanza 239 pruebas de backend y 91 de la aplicación,
con Ruff, TypeScript y ESLint sin errores. Falta recorrer manualmente los nuevos
eventos con TalkBack en el emulador; por ello este resultado valida la coherencia
del software, pero todavía no la facilidad de uso del contenido en movimiento.

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
| EXP-003 | F1 90,9 %; 0 falsas alertas; 1 omitida | 30 m iniciales | 20, 30 y 40 m | Se mantienen 30 m; validación física pendiente |
| EXP-004 | 3 rutas válidas; segunda petición evitada | Primera llamada ORS | Cliente y caché propios | Integración técnica superada; accesibilidad pendiente |
| EXP-005A | 100 % en 10 pares; 0 falsos positivos | 10 m, 85 % y 5 % | 2 m, 98 % y 3 % | Umbral conservador integrado; generalización pendiente |
| EXP-006 | 418 elementos; confianza media 0,391 | Corredor de 10 m | Corredor de 5 m | Menos contaminación potencial con cobertura útil; revisión manual pendiente |
