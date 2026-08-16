# Calibración del detector de desviación de ruta

Estado: `Validado`  
Última actualización: 16 de agosto de 2026  
Responsabilidad principal: `evaluation`

## Problema que resuelve

La aplicación debe advertir cuando la posición se mantiene lejos de la ruta,
pero un aviso demasiado sensible puede interrumpir a la persona por ruido del
GPS o por una diferencia entre la calle y la geometría digital. Un umbral
demasiado amplio produce el problema contrario: tarda en detectar o ignora una
separación real.

La implementación empezó con 30 m como valor razonable de diseño. `EXP-003`
comprueba si ese valor mantiene un equilibrio mejor que 20 y 40 m cuando las
demás condiciones permanecen constantes.

## Requisitos

- Evaluar el mismo código que utiliza la aplicación móvil.
- Fijar los casos y sus resultados esperados antes de seleccionar el umbral.
- Cambiar únicamente el umbral espacial entre configuraciones.
- Mantener 25 m de precisión máxima, tres muestras y diez segundos.
- Incluir desviaciones estables, ruido aislado, mala precisión y reinicios.
- Conservar todas las predicciones y los errores.
- No almacenar coordenadas reales ni trazas de una persona.
- No presentar una calibración sintética como validación física general.

## Alternativas consideradas

| Umbral | Ventaja esperada | Riesgo esperado | Resultado | Decisión |
| ---: | --- | --- | --- | --- |
| 20 m | Detectar antes separaciones moderadas | Reaccionar a sesgos GPS o cartográficos | Detectó los 6 positivos, pero produjo 2 falsas alertas | No seleccionado |
| 30 m | Equilibrar sensibilidad y estabilidad | Omitir casos próximos al límite | 5 de 6 positivos y ninguna falsa alerta | Seleccionado |
| 40 m | Evitar avisos por desplazamientos pequeños | Detectar tarde u omitir desviaciones | Omitió 2 de 6 positivos | No seleccionado |

## Decisión adoptada

Se mantiene **30 metros** como umbral inicial de separación. La aplicación
continúa exigiendo simultáneamente tres muestras fiables durante al menos diez
segundos. El experimento no modifica la precisión máxima de 25 m ni el periodo
de 60 s posterior a un recálculo.

La selección sigue una regla explícita: mayor F1; en caso de empate, menos
falsas alertas, mayor sensibilidad y menor distancia. F1 resume la relación
entre cuántos avisos son correctos y cuántas desviaciones se detectan, pero se
conservan también los conteos para que una sola cifra no oculte los errores.

## Justificación

El umbral de 20 m consiguió la máxima sensibilidad, pero confundió dos
situaciones etiquetadas como permanencia en ruta: un sesgo lateral conocido de
24 m y un desplazamiento de 28 m entre la realidad y la geometría digital. La
confirmación impediría sustituir automáticamente la ruta, pero el diálogo
seguiría interrumpiendo la navegación.

El umbral de 40 m no produjo falsas alertas, pero no detectó las separaciones
estables de 25 y 35 m. El de 30 m tampoco detectó el caso de 25 m, aunque sí el
de 35 m y las separaciones mayores. Obtuvo el F1 más alto y no reaccionó a los
dos desplazamientos benignos, por lo que ofrece el mejor equilibrio observado.

La decisión no es definitiva. Las etiquetas sobre sesgo y desplazamiento
cartográfico son escenarios de diseño, no observaciones representativas de
dispositivos o calles. Un recorrido físico puede obligar a recalibrar el valor.

## Datos de entrada y salida

### Entrada

- Una ruta sintética recta suficientemente larga para evitar sus extremos.
- Trece secuencias preetiquetadas: seis deben producir aviso y siete no.
- Muestras separadas por cinco segundos.
- Precisión de 5 m en lecturas fiables y 35 o 40 m en casos imprecisos.
- Umbrales espaciales de 20, 30 y 40 m.

Los casos positivos incluyen separaciones estables de 25, 35 y 50 m, una salida
gradual, otra posterior a una lectura imprecisa y otra reiniciada por un retorno
puntual. Los negativos incluyen posiciones centradas, ruido ordinario, uno o
dos saltos aislados, lecturas imprecisas y dos desplazamientos sistemáticos sin
salida real.

### Salida

- Una predicción por caso y umbral: 39 decisiones.
- Instante de la primera alerta y latencia en casos positivos.
- Verdaderos positivos y negativos, falsas alertas y desviaciones omitidas.
- Exactitud, precisión, sensibilidad, especificidad y F1.
- Dos archivos CSV sanitizados y versionados.

## Implementación

`deviationCalibration.ts` construye el banco, llama directamente a
`evaluateLocationSample` y calcula las métricas. Comparte así el filtro de
precisión, la distancia a la polilínea y la máquina de estados del producto; no
existe una segunda implementación simplificada del detector.

`tsconfig.evaluation.json` compila solo los módulos necesarios en una carpeta
temporal ignorada por Git. `evaluate-deviation-thresholds.cjs` ejecuta el
barrido y escribe los CSV. El comando `npm run evaluate:deviation` reproduce el
experimento sin emulador, ORS ni acceso a Internet.

## Pruebas

Las pruebas comprueban que permanecen los trece identificadores y las dos
clases, se generan las 39 predicciones, no desaparece ninguna configuración,
se conservan los errores, 30 m es seleccionado por la regla declarada y la
latencia solo se calcula para alertas positivas esperadas. También se rechazan
umbrales vacíos, repetidos, desordenados o no positivos.

La verificación completa terminó con 91 pruebas de la aplicación y 239 del
backend, además de TypeScript, ESLint y Ruff sin errores.

```bash
cd app
npm run evaluate:deviation
npm test -- --runTestsByPath __tests__/deviationCalibration.test.ts
```

## Resultados

| Umbral | Exactitud | Precisión | Sensibilidad | Especificidad | F1 | Falsas alertas | Omitidas | Latencia media |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 m | 84,6 % | 75,0 % | 100,0 % | 71,4 % | 85,7 % | 2 | 0 | 10,0 s |
| **30 m** | **92,3 %** | **100,0 %** | **83,3 %** | **100,0 %** | **90,9 %** | **0** | **1** | **11,0 s** |
| 40 m | 84,6 % | 100,0 % | 66,7 % | 100,0 % | 80,0 % | 0 | 2 | 12,5 s |

La mediana de latencia fue de diez segundos en las tres configuraciones porque
ese es el mínimo temporal cuando la separación ya supera el umbral. La media
aumenta con el umbral por el caso gradual: 20 m avisó tras 10 s desde el inicio
etiquetado, 30 m tras 15 s y 40 m tras 20 s.

No se genera un gráfico: solo existen tres configuraciones y la tabla muestra
con mayor legibilidad las métricas y los errores absolutos. Los CSV permiten
crear una figura después si la maquetación final lo requiere.

## Riesgos y limitaciones

- El banco es sintético, pequeño y construido alrededor de una ruta recta.
- Las etiquetas de los desplazamientos benignos son supuestos de diseño.
- No se simulan edificios altos, túneles ni distintos modelos de teléfono.
- La precisión declarada por Android no garantiza el error real.
- La frecuencia física de muestras puede ser distinta a cinco segundos.
- No se recalibran todavía los 25 m de precisión, las tres muestras, los diez
  segundos ni el periodo de 60 s.
- El emulador no reproduce el comportamiento físico de una antena GPS.

## Texto base para la memoria

El umbral espacial se calibró mediante trece secuencias GPS sintéticas
preetiquetadas y configuraciones de 20, 30 y 40 m. Se mantuvieron constantes el
filtro de precisión, el número de muestras y la duración mínima, evaluando la
misma función utilizada por la aplicación. Los 30 m obtuvieron 92,3 % de
exactitud y un F1 de 90,9 %, con cinco de seis desviaciones detectadas y ninguna
falsa alerta. Los 20 m elevaron la sensibilidad al 100 %, pero generaron dos
avisos indebidos; los 40 m redujeron la sensibilidad al 66,7 %. Se conservó por
tanto 30 m como compromiso inicial. Es una calibración reproducible de
ingeniería, no una estimación general del rendimiento en exteriores.

## Trabajo pendiente

- [x] Comparar 20, 30 y 40 m con el detector de producción.
- [x] Conservar predicciones y resúmenes reproducibles.
- [x] Verificar la selección mediante pruebas automáticas.
- [ ] Repetir el protocolo con trazas físicas anonimizadas y consentimiento.
- [ ] Revisar los demás parámetros si la evidencia física revela fallos.
- [ ] Probar al menos dos dispositivos y distintos entornos urbanos.

## Referencias y evidencias

- Código: `app/src/features/location/deviationCalibration.ts`.
- Pruebas: `app/__tests__/deviationCalibration.test.ts`.
- Resultados: `artifacts/rerouting-umbrales-resumen.csv` y
  `artifacts/rerouting-umbrales-predicciones.csv`.
- [GPS y recálculo confirmado](../product/gps-rerouting.md).
- [Expo, `expo-location`](https://docs.expo.dev/versions/latest/sdk/location/).

## Revisión previa a la publicación

- [x] La ortografía y la concordancia son correctas.
- [x] Los términos estadísticos están definidos en contexto.
- [x] El estado coincide con la implementación y las pruebas.
- [x] El documento no contiene secretos, trazas reales ni rutas locales.
