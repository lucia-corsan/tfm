# Resultados de evaluación

Estado: `En implementación`
Última actualización: 14 de agosto de 2026
Responsabilidad principal: `evaluation`

## Resumen ejecutivo

La integración técnica con ORS, la caché y el enriquecimiento OSM ya se han
validado. La evaluación del aprendizaje, el rerouting y la usabilidad completa
permanecen pendientes.

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

Pendiente.

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

Sobre la caché real, las tres alternativas generaron 32, 49 y 27 eventos, con
192, 294 y 162 detalles accesibles. No quedó ninguna instrucción con `-` como
referencia. El volumen confirma que la cadena completa usa la instantánea OSM;
no convierte esos metadatos colaborativos en observaciones garantizadas del
estado actual de la calle.

Estos resultados demuestran coherencia del software con datos reproducibles. No
permiten concluir todavía que las instrucciones sean fáciles de seguir en la
calle, que el momento de cada aviso sea adecuado o que la interacción con TTS y
TalkBack no produzca solapamientos. Esas cuestiones requieren la revisión manual
del emulador y, posteriormente, recorridos simulados o controlados con GPS.

La validación automática alcanza 229 pruebas de backend y 53 de la aplicación,
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
| EXP-004 | 3 rutas válidas; segunda petición evitada | Primera llamada ORS | Cliente y caché propios | Integración técnica superada; accesibilidad pendiente |
| EXP-005A | 100 % en 10 pares; 0 falsos positivos | 10 m, 85 % y 5 % | 2 m, 98 % y 3 % | Umbral conservador integrado; generalización pendiente |
| EXP-006 | 418 elementos; confianza media 0,391 | Corredor de 10 m | Corredor de 5 m | Menos contaminación potencial con cobertura útil; revisión manual pendiente |
