# 6. Evaluación y resultados

Estado: `En implementación`
Última actualización: 18 de agosto de 2026.

## Estrategia general

La evaluación separa los componentes para no atribuir a la inteligencia
artificial resultados que proceden del proveedor de rutas, de la cobertura de
datos o de las reglas de seguridad. Primero se comprueba que ORS genera
candidatas y que el enriquecimiento OSM produce costes válidos. Después se
evalúan las restricciones y la clasificación. Por último, el aprendizaje se
compara manteniendo constantes las rutas, los costes y los filtros críticos.

También se distingue entre validación técnica y utilidad para la población
objetivo. Las pruebas sintéticas permiten conocer la respuesta correcta y
reproducir los resultados; no sustituyen recorridos físicos ni estudios con
personas ciegas o con baja visión.

## Preguntas e hipótesis

1. ¿La clasificación explicable respeta restricciones e incertidumbre?
2. ¿La adaptación predice mejor una preferencia conocida que la ruta más corta
   y los pesos declarados fijos?
3. ¿La ventaja se conserva ante elecciones inconsistentes?
4. ¿Los pesos permanecen interpretables y sus cambios, acotados?
5. ¿La generación y el enriquecimiento proporcionan alternativas distintas y
   evidencia suficiente para que el ranking pueda actuar?
6. ¿El detector de desviación limita las alertas provocadas por ruido GPS?

La hipótesis central de IA establece que el modelo adaptativo aumentará la
exactitud y reducirá el arrepentimiento respecto a los pesos fijos sin producir
violaciones críticas.

## Sistemas de referencia

- **Ruta más corta:** solo considera distancia y representa una decisión sin
  personalización.
- **Clasificación estática:** utiliza el cuestionario inicial y mide el valor de
  la personalización declarada.
- **Clasificación adaptativa:** incorpora elecciones observadas y permite aislar
  el valor añadido del aprendizaje.
- **Generación básica y ampliada:** una petición ORS de hasta tres rutas frente
  a una colección escalonada y deduplicada. Esta comparación pertenece a la
  recuperación de candidatas, no al aprendizaje.

## Conjuntos de datos y perfiles

La validación funcional utiliza *fixtures*, respuestas ORS almacenadas y una
instantánea OSM con fecha base conocida. La evaluación de IA utiliza cuatro
perfiles sintéticos con pesos latentes conocidos: prioridad a distancia,
prioridad a cruces y ayudas, prioridad a orientación y certeza, y prioridad a
continuidad peatonal.

El perfil declarado contiene solo un 25 % de la señal latente y un 75 % de una
distribución uniforme. Así se representa un cuestionario útil pero impreciso,
sin construir un sistema de referencia artificialmente malo. Cada situación
contiene tres rutas con compensaciones sintéticas entre dimensiones y sin una
alternativa completamente peor en todo.

La calibración usa tres perfiles y tres semillas. La evaluación final usa veinte
semillas diferentes, incorpora un cuarto perfil nunca empleado para seleccionar
parámetros y analiza 0 %, 10 % y 20 % de elecciones inconsistentes. Cada una de
las 240 ejecuciones incluye 60 elecciones de entrenamiento y 160 conjuntos
nuevos para medir generalización.

## Métricas

La exactitud de la primera posición cuenta con qué frecuencia el sistema escoge
la alternativa óptima bajo el perfil latente. La exactitud por pares comprueba
el orden relativo de todas las parejas. El arrepentimiento de una decisión es:

\[
R=C(\text{ruta elegida}\mid w^*)-
\min_r C(r\mid w^*).
\]

Un valor cero indica una primera elección correcta; un error pequeño penaliza
menos que uno de gran coste. Se mide tanto la media sobre conjuntos nuevos como
la suma acumulada durante las elecciones de aprendizaje.

La estabilidad se analiza mediante el mayor salto L1, la no negatividad, la
suma unitaria de los pesos y el número de interacciones hasta permanecer cerca
del resultado final. La distancia entre pesos aprendidos y verdaderos se
considera secundaria, porque varios vectores pueden producir el mismo orden.

Para los demás componentes se emplean F1, falsos positivos y negativos,
solapamiento geométrico, cobertura OSM, confianza, incertidumbre, número de
rutas compatibles y latencia. Sin una enumeración completa de caminos no se
afirma una tasa de recuperación exhaustiva.

## Calibración del aprendizaje

Se evaluaron 216 configuraciones que combinaban cuatro tasas de aprendizaje,
tres sensibilidades logísticas, tres niveles de regularización, tres límites de
cambio y dos incrementos de influencia. Las tres primeras elecciones y el
máximo del 50 % se mantuvieron constantes por razones de seguridad.

La configuración seleccionada fue:

| Parámetro | Valor | Interpretación |
| --- | ---: | --- |
| Tasa de aprendizaje | 0,06 | Paso base moderado |
| Sensibilidad logística | 3 | Convierte diferencias de coste en probabilidades sin saturarlas pronto |
| Regularización | 0,05 | Atrae suavemente los pesos hacia la declaración |
| Observación | 3 elecciones | No cambia el orden al comienzo |
| Incremento de influencia | 0,10 | Introducción progresiva tras observar |
| Influencia máxima | 0,50 | La declaración conserva al menos la mitad |
| Cambio máximo L1 del vector aprendido | 0,12 | Limita el ajuste interno de cada interacción |

La mejor configuración alcanzó un 86,08 % de exactitud media durante los puntos
de aprendizaje de calibración. Las siguientes opciones quedaron a menos de 0,3
puntos, por lo que la elección se interpreta como el resultado de este
protocolo, no como un óptimo universal.

## Resultados del aprendizaje adaptativo

### Condición principal: 10 % de elecciones inconsistentes

| Sistema | Exactitud primera ruta | Exactitud por pares | Arrepentimiento medio | Arrepentimiento acumulado |
| --- | ---: | ---: | ---: | ---: |
| Ruta más corta | 49,34 % | 62,78 % | 0,05054 | 2,9580 |
| Pesos declarados fijos | 78,64 % | 85,27 % | 0,00902 | 0,5513 |
| Clasificación adaptativa | **89,05 %** | **92,35 %** | **0,00238** | **0,2719** |

La adaptación mejoró 10,41 puntos porcentuales sobre los pesos fijos. El
intervalo normal aproximado del 95 % para diferencias emparejadas, calculado
sobre veinte medias agrupadas por semilla, fue de 9,09 a 11,72 puntos. Mejoró
76 de 80 combinaciones perfil–semilla y empeoró 4. El arrepentimiento medio
se redujo un 73,6 % y el acumulado, un 50,7 %.

### Robustez

| Elecciones inconsistentes | Exactitud fija | Exactitud adaptativa | Mejora |
| ---: | ---: | ---: | ---: |
| 0 % | 78,64 % | 89,88 % | +11,24 puntos |
| 10 % | 78,64 % | 89,05 % | +10,41 puntos |
| 20 % | 78,64 % | 87,23 % | +8,59 puntos |

La ventaja disminuye de forma gradual al aumentar el ruido, pero permanece
positiva. El perfil de continuidad peatonal, reservado fuera de la calibración,
pasó de 83,84 % con pesos fijos a 87,47 % con adaptación.

### Sensibilidad a la declaración inicial

| Señal latente en el cuestionario | Exactitud fija | Exactitud adaptativa | Diferencia |
| ---: | ---: | ---: | ---: |
| 0 % | 70,21 % | 86,63 % | +16,41 puntos |
| 25 % | 78,64 % | 89,05 % | +10,41 puntos |
| 50 % | 86,66 % | 89,64 % | +2,98 puntos |
| 75 % | 93,91 % | 89,13 % | −4,77 puntos |
| 100 % | 100,00 % | 87,84 % | −12,16 puntos |

La ventaja del aprendizaje se concentra en cuestionarios poco precisos. Cuando
el perfil inicial ya reproduce bien la preferencia sintética, las actualizaciones
logísticas y las elecciones inconsistentes pueden degradarlo. Este resultado
negativo impide afirmar que la adaptación sea siempre mejor y justifica que la
persona deba activarla expresamente y pueda desactivarla o reiniciarla. El
núcleo se inicializa desactivado; cualquier futura activación por defecto
necesita una calibración conservadora independiente.

### Evolución y estabilidad

Durante las tres primeras elecciones, el sistema adaptativo coincide
exactamente con el fijo. La exactitud pasa al 79,66 % después de cinco
elecciones, 81,55 % después de diez, 85,00 % después de veinte y 89,05 % tras
sesenta. El mayor salto efectivo observado con 10 % de ruido fue 0,0983; ningún
peso se volvió negativo ni dejó de sumar uno. El límite 0,12 se aplica al
vector aprendido y el salto efectivo se mide aparte, porque también depende del
incremento de influencia.

El primer punto de control que permaneció próximo al resultado final tuvo una
mediana de 60 elecciones. Como 60 fue también el último punto observado, el
resultado no demuestra estabilización ni convergencia. Sí existe evidencia de
mejora temprana desde 5–10 interacciones, y ambos matices deben conservarse en
la presentación del producto.

Las figuras 7 y 8 muestran respectivamente la evolución de la exactitud y del
arrepentimiento acumulado. Los datos completos por ejecución permanecen
versionados para permitir otro análisis sin repetir la simulación.

### Verificación de la integración en la aplicación

La mejora de `EXP-002` no basta para demostrar que la app aplique el modelo de
forma correcta. Por ello se añadió una validación técnica independiente. Un
caso dorado compartido confirmó que Python y TypeScript producen la misma
actualización hasta doce decimales. La app mantuvo pesos válidos durante 500
actualizaciones, respetó las tres elecciones iniciales de observación y excluyó
las rutas descartadas. También se recreó el almacenamiento para confirmar la
recuperación del estado y se inyectaron datos dañados para verificar la vuelta
segura al perfil declarado.

La batería completa alcanzó 265 pruebas en el backend y 126 en la app, sin
errores de Ruff, ESLint o TypeScript. Se comprobó además que los pesos efectivos
llegan por separado a comparación y recálculo, y que una restricción crítica
continúa descartando la ruta aunque esos pesos favorezcan sus demás
características. Estas pruebas demuestran consistencia de implementación, no
que la adaptación sea útil, comprensible o adecuada para participantes reales.

## Resultados de datos, rutas y GPS

La calibración espacial de rutas seleccionó 2 m de tolerancia, 98 % de
solapamiento y 3 % de diferencia de longitud. Alcanzó 100 % en diez pares
sintéticos sin falsos positivos y mantuvo separadas las tres rutas ORS reales.
Este resultado valida el incremento técnico, no una exactitud general del
100 %.

La sensibilidad del enriquecimiento comparó corredores OSM de 5, 10, 15 y
20 m. El valor de 5 m asoció 418 elementos. Ampliar a 10 m incorporó un 27,3 %
más, pero solo elevó la confianza media 1,8 puntos y cambió el primer puesto. Se
seleccionó 5 m para reducir la atribución de elementos de calles vecinas.

El detector de desviaciones se evaluó con trece secuencias sintéticas y umbrales
de 20, 30 y 40 m. Los 30 m obtuvieron 92,3 % de exactitud y F1 de 90,9 %, sin
falsas alertas y con una de seis desviaciones omitida. Se mantiene como valor
inicial; el emulador no sustituye mediciones físicas.

## Qué demuestran y qué no demuestran los resultados

La evaluación demuestra que:

- la implementación aprende de ejemplos en vez de limitarse a ejecutar reglas;
- generaliza a conjuntos sintéticos que no participaron en la actualización;
- supera dos sistemas sin aprendizaje en la condición principal del protocolo;
- mantiene pesos acotados y las restricciones fuera del modelo;
- degrada su rendimiento de forma gradual ante elecciones inconsistentes;
- aporta valor sobre todo cuando la declaración inicial es imprecisa y puede
  perjudicar una declaración ya exacta.

No demuestra que:

- las preferencias sintéticas representen a personas ciegas o con baja visión;
- sesenta elecciones sean una carga aceptable;
- la mejora se conserve con las correlaciones de rutas ORS y datos OSM reales;
- un acierto del modelo implique seguridad o accesibilidad física;
- la probabilidad logística sea confianza en los datos;
- la interacción adaptativa sea comprensible sin una prueba con participantes.

## Amenazas a la validez

La amenaza principal es que el usuario sintético y el modelo comparten una
función lineal; esto favorece la recuperación. Los costes independientes tampoco
reproducen las relaciones entre distancia, pendiente, giros y cobertura OSM.
Las veinte semillas y el perfil reservado reducen el sobreajuste a la
calibración, pero no proporcionan validez poblacional.

La zona piloto, la cobertura colaborativa, la ausencia de una enumeración de
todos los caminos y el uso de emulador limitan además la generalización del
sistema completo. La siguiente evaluación debe incorporar costes de rutas
reales enriquecidas y, después, un protocolo con personas y consentimiento.

## Fuentes internas

- [Plan de evaluación](../evaluation/plan-evaluacion.md).
- [Experimentos](../evaluation/experimentos.md).
- [Resultados](../evaluation/resultados.md).
- [Limitaciones](../evaluation/limitaciones.md).
- [Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md).
- [EXP-002](../evaluation/calibracion-aprendizaje-adaptativo.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).
- [Calibración del detector de desviación](../evaluation/calibracion-detector-desviacion.md).
