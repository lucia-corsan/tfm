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

La batería completa alcanza 283 pruebas en el backend y 151 en la app, sin
errores de Ruff, ESLint o TypeScript. Se comprobó además que los pesos efectivos
llegan por separado a comparación y recálculo, y que una restricción crítica
continúa descartando la ruta aunque esos pesos favorezcan sus demás
características. Estas pruebas demuestran consistencia de implementación, no
que la adaptación sea útil, comprensible o adecuada para participantes reales.

## Transferencia a costes de rutas ORS y OSM

La evaluación sintética aísla el algoritmo, pero no reproduce las correlaciones
de un recorrido: una ruta más larga puede acumular más cruces y, a la vez,
disponer de más evidencia. Para comprobar ese límite se diseñó `EXP-007` sin
volver a calibrar el modelo. Se fijaron doce pares del área piloto antes de
descargarlos, ocho para aprendizaje y cuatro reservados. ORS generó 31 rutas
válidas sobre el mismo grafo y 24 superaron las restricciones después del
enriquecimiento OSM. Finalmente, cuatro pares de aprendizaje y tres reservados
conservaron al menos dos alternativas.

Las rutas y sus nueve costes proceden del sistema real. Las preferencias
latentes y las elecciones siguen siendo simuladas para conocer la respuesta de
referencia; por tanto, no es un estudio con personas. Se mantuvieron los mismos
cuatro perfiles, 60 elecciones, 10 % de elecciones inconsistentes, veinte
semillas y la configuración congelada de `EXP-002`.

| Sistema | Exactitud primera ruta | Exactitud por pares | Arrepentimiento medio |
| --- | ---: | ---: | ---: |
| Ruta más corta | 75,00 % | 80,56 % | 0,00525 |
| Pesos declarados fijos | **100,00 %** | **97,22 %** | **0,00000** |
| Clasificación adaptativa | 75,00 % | 84,31 % | 0,00525 |

La hipótesis de transferencia no se cumple en este banco. El adaptativo pierde
25 puntos frente al sistema fijo en la primera posición y termina igualando a
la ruta más corta. La evolución aclara que no se trata de una ventaja tardía:
parte de 100 %, se mantiene durante las tres elecciones de observación, baja a
90,42 % tras cinco, a 76,25 % tras diez y termina en 75 %.

El diagnóstico mostró una limitación estructural. En cada uno de los cuatro
pares de aprendizaje aptos, los cuatro perfiles latentes prefirieron la misma
ruta. En consecuencia, ninguna elección reveló qué diferenciaba a una persona
que prioriza distancia de otra que prioriza ayudas en cruces u orientación.
Además, complejidad de orientación fue 1 y pendiente 0,5 en las 24 rutas
aceptadas: una dimensión constante no permite identificar su peso.

Los tres pares reservados tampoco constituyen un banco amplio. En uno, el
perfil de distancia prefiere una ruta distinta de los demás; en los otros dos,
todos coinciden. Los pesos fijos resolvieron correctamente esas primeras
posiciones, lo que genera un efecto techo. El 100 % no debe leerse como eficacia
general, sino como ausencia de margen para mejorar una muestra pequeña.

La figura 10 representa el hallazgo principal. La línea fija permanece en
100 %, la ruta más corta en 75 % y la adaptativa desciende al comenzar las
actualizaciones. Su mensaje no es que «aprender siempre empeora», sino que más
interacciones no compensan ejemplos no discriminantes. La consecuencia de
diseño es mantener la adaptación desactivada inicialmente, opcional y
reversible, y ampliar en el futuro el banco con comparaciones que cubran
compensaciones distintas antes de plantear una activación más amplia.

## Diagnóstico de capacidad informativa

El resultado anterior planteó una pregunta adicional: ¿cómo diferenciar ocho
elecciones realmente variadas de ocho repeticiones de las mismas situaciones?
`EXP-008` evaluó un diagnóstico estructural sobre los bancos contrastados de
`EXP-002` y `EXP-007`. Para cada alternativa no elegida se calculó el vector de
diferencias de costes respecto a la elegida. Después se midieron cinco
propiedades: número de elecciones, magnitud de los contrastes, comparaciones
distintas, dimensiones con variación apreciable y rango de la matriz de
diferencias.

Se fijaron como umbrales ocho elecciones, doce pares y doce comparaciones
distintas, distancia L1 mínima de 0,10, contraste de al menos 0,03 en seis de
las nueve dimensiones y rango mínimo de seis. Se estudiaron 4, 8, 12, 20 y 60
elecciones, cuatro perfiles y veinte semillas: 80 historiales por banco y punto.

| Regla desde ocho elecciones | Sintético informativo | ORS y OSM limitado |
| --- | ---: | ---: |
| Solo contar elecciones | 100 % | 100 % |
| Diagnóstico estructural | **100 %** | **0 %** |

La separación se mantuvo hasta sesenta elecciones. El banco sintético variaba
en las nueve dimensiones y alcanzaba rango nueve. El real variaba solo en cinco
y alcanzaba rango seis. El número de comparaciones distintas reales creció con
el ruido y las repeticiones, pero esa subida no añadió dimensiones ausentes.

El 100 % no se interpreta como exactitud general del diagnóstico. Las semillas
reales comparten las mismas cuatro situaciones y los dos tipos de banco son los
que motivaron el diseño. Además, exigir seis dimensiones podría descartar un
historial legítimo especializado en menos factores. Por ello la función se
conserva como herramienta experimental y no se conecta todavía a una activación
automática. Una futura integración deberá replicarse en más zonas y comparar
pesos fijos y aprendidos en una ventana posterior no usada para actualizar.

La figura 11 contrasta ambas reglas. El panel izquierdo muestra que contar ocho
elecciones acepta indistintamente los dos bancos. El derecho muestra que
comprobar variedad y contraste mantiene bloqueado el banco limitado. La figura
no representa exactitud de rutas, sino la proporción de historiales con
estructura suficiente para plantear una adaptación.

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
- no transfiere automáticamente esa mejora a un banco pequeño de costes reales
  cuando las elecciones de aprendizaje no distinguen los perfiles.

No demuestra que:

- las preferencias sintéticas representen a personas ciegas o con baja visión;
- sesenta elecciones sean una carga aceptable;
- la mejora se conserve con cualquier conjunto de rutas ORS y datos OSM;
- un acierto del modelo implique seguridad o accesibilidad física;
- la probabilidad logística sea confianza en los datos;
- la interacción adaptativa sea comprensible sin una prueba con participantes.

## Amenazas a la validez

La amenaza principal es que el usuario sintético y el modelo comparten una
función lineal; esto favorece la recuperación. Los costes independientes tampoco
reproducen las relaciones entre distancia, pendiente, giros y cobertura OSM.
Las veinte semillas y el perfil reservado reducen el sobreajuste a la
calibración, pero no proporcionan validez poblacional.

En `EXP-007`, las veinte semillas comparten los mismos siete pares aptos y solo
cambian el orden y el ruido simulado. Cuatro pares de aprendizaje no ofrecen
elecciones distintas por perfil, dos costes son constantes y tres pares
reservados producen porcentajes muy discretos. Estas condiciones explican el
resultado y limitan tanto una conclusión favorable como una desfavorable sobre
el uso real del aprendizaje.

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
- [EXP-007 con rutas ORS y OSM](../evaluation/evaluacion-aprendizaje-rutas-reales.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).
- [Calibración del detector de desviación](../evaluation/calibracion-detector-desviacion.md).
