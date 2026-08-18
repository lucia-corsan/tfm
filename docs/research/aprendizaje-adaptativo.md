# Aprendizaje adaptativo de preferencias

Estado: `En implementación`
Última actualización: 18 de agosto de 2026
Responsabilidad principal: `research`

## Problema que resuelve

El cuestionario inicial permite que una persona indique qué aspectos valora al
caminar —por ejemplo, reducir cruces complejos, evitar recorridos difíciles de
seguir o preferir información más completa—. Sin embargo, una declaración
inicial puede ser aproximada: no siempre es fácil traducir una preferencia
cotidiana a nueve pesos numéricos antes de haber comparado rutas reales.

El aprendizaje adaptativo utiliza únicamente elecciones explícitas entre rutas
ya consideradas compatibles. Su objetivo no es descubrir si una ruta es
segura, sino ajustar gradualmente la importancia relativa de los costes
graduables. Así, si una persona elige repetidamente una alternativa algo más
larga pero con cruces más sencillos, el sistema puede aprender que, dentro de
los límites declarados, esa diferencia importa más de lo que reflejaba el
cuestionario.

## Alcance de este incremento

El día 1 de la semana 4 incorpora y valida:

- el modelo matemático de comparación por pares;
- la actualización en línea después de cada elección explícita;
- tres fases separadas de pesos: declarados, aprendidos y efectivos;
- límites de cambio, regularización, proyección y periodo de observación;
- la conexión opcional de los pesos efectivos con la clasificación existente;
- una calibración sintética separada de la evaluación final;
- una comparación con la ruta más corta y los pesos declarados fijos.

Todavía no se presenta como completada la integración móvil. La persistencia en
SQLite, el registro de «Elegir esta ruta», la pantalla para desactivar o
restablecer el aprendizaje y la explicación visual de los cambios corresponden
al siguiente incremento. Esta separación permite validar primero el núcleo de
IA sin mezclar errores de interfaz o almacenamiento.

## Requisitos

- Aprender solo de una acción explícita: «Elegir esta ruta».
- Iniciar el aprendizaje desactivado y exigir una activación explícita.
- Comparar únicamente rutas que hayan superado las restricciones críticas.
- No inferir preferencias cuando solo exista una alternativa aceptada.
- Mantener las primeras tres elecciones en modo de observación.
- Conservar pesos no negativos cuya suma sea uno.
- Regularizar los pesos hacia las preferencias declaradas.
- Promediar la señal cuando haya dos alternativas no elegidas.
- Limitar el cambio máximo del vector aprendido producido por una interacción
  y registrar por separado el salto de los pesos efectivos.
- Limitar al 50 % la influencia de los pesos aprendidos.
- Permitir desactivar el aprendizaje sin borrar su estado y restablecerlo por
  completo cuando lo solicite la persona.
- No almacenar coordenadas, direcciones, audio ni recorridos GPS.
- Mantener la confianza y las restricciones fuera de la probabilidad de
  preferencia. La incertidumbre sí interviene como uno de los nueve costes no
  negativos, pero continúa mostrándose también como salida independiente.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Pesos declarados fijos | Muy simple, estable y fácil de explicar | No corrige una declaración inicial imprecisa | Se conserva como sistema de referencia y modo sin aprendizaje |
| Reglas manuales del tipo «si elige X, aumenta Y» | Fácil de programar | Atribuye toda una elección a una sola causa y escala mal a nueve dimensiones | Descartada |
| Modelo por comparaciones pareadas | Aprende directamente de la alternativa elegida y conserva coeficientes interpretables | Necesita varias elecciones y una calibración cuidadosa | Adoptada |
| Red neuronal profunda | Puede modelar relaciones no lineales | Exige más datos, dificulta la explicación y no aporta una ventaja justificada en el MVP | Descartada |
| LLM como decisor | Puede generar texto flexible | No garantiza reproducibilidad ni el cumplimiento de restricciones | Descartada |
| Aprendizaje en un servidor | Facilita sincronización entre dispositivos | Requiere cuentas y expone más datos personales | Descartada para el MVP |

## Decisión adoptada

Se implementa un modelo lineal y explicable de aprendizaje en línea mediante
comparaciones pareadas. La probabilidad logística se inspira en
Bradley–Terry y en el planteamiento de *RankNet*, pero los parámetros aprendidos
no son puntuaciones fijas de cada ruta: son pesos compartidos de sus
características. Por ello, la denominación precisa es «modelo logístico lineal
por comparaciones pareadas», no un modelo Bradley–Terry puro.

Cada interacción compara la ruta elegida con todas las alternativas aceptadas
que se mostraron y no fueron seleccionadas. La actualización se proyecta al
simplejo —el conjunto de vectores no negativos que suman uno—, se regulariza
hacia la declaración inicial y se limita antes de influir en el recomendador.

## Conceptos y notación

| Símbolo | Significado en lenguaje llano |
| --- | --- |
| \(c(r)\) | Vector de nueve costes normalizados de la ruta \(r\); cero es más favorable y uno, menos favorable |
| \(w^0\) | Pesos declarados y normalizados en el cuestionario inicial |
| \(w^L_t\) | Estimación aprendida después de \(t\) elecciones |
| \(w^E_t\) | Pesos efectivos usados para ordenar rutas |
| \(a\) | Ruta elegida explícitamente |
| \(b\) | Una alternativa aceptada pero no elegida |
| \(\beta\) | Sensibilidad de la probabilidad a una diferencia de coste |
| \(\eta\) | Tasa de aprendizaje o tamaño base del paso |
| \(\lambda\) | Fuerza que acerca la estimación a la declaración inicial |
| \(\alpha_t\) | Influencia permitida de lo aprendido en la elección \(t\) |

Las nueve dimensiones coinciden exactamente con la puntuación explicable:
distancia, cruces complejos, ayudas en cruces, evidencia de acera, escalones,
superficie, complejidad de orientación, pendiente e incertidumbre. No se crea
una segunda representación incompatible del perfil.

## Formulación matemática explicada paso a paso

### 1. Coste de una ruta

Los pesos satisfacen:

\[
w_i \geq 0, \qquad \sum_{i=1}^{9} w_i = 1.
\]

El coste gradual de una ruta es la suma ponderada de sus costes:

\[
C(r\mid w)=w^\top c(r)=\sum_{i=1}^{9}w_i c_i(r).
\]

Cuanto menor sea \(C\), mejor se ajusta la ruta a esas preferencias. Las
restricciones críticas ya se han aplicado antes; esta fórmula nunca decide si
una barrera prohibida puede compensarse con otra ventaja.

### 2. Diferencia entre la ruta elegida y otra alternativa

Para una elección de \(a\) frente a \(b\), se calcula:

\[
\Delta_{a,b}=c(b)-c(a).
\]

El orden es importante. Si la ruta elegida tiene un coste menor en una
dimensión, el componente correspondiente de \(\Delta\) es positivo. Esta
convención hace que una elección coherente aumente la importancia de aquello
en lo que la ruta elegida era mejor.

### 3. Probabilidad asignada a la elección observada

\[
P(a \succ b\mid w)=\sigma\!\left(\beta w^\top\Delta_{a,b}\right),
\qquad
\sigma(z)=\frac{1}{1+e^{-z}}.
\]

Esta cifra expresa cuánto encaja la elección con los pesos actuales. No es la
confianza en los datos, ni la probabilidad de que una ruta sea accesible, ni una
medida de seguridad.

### 4. Función de pérdida

Si aparecen \(m\) alternativas no elegidas, se promedia su pérdida logística y
se añade una regularización hacia los pesos declarados:

\[
\mathcal{L}_t(w)=
-\frac{1}{m}\sum_{j=1}^{m}
\log P(a \succ b_j\mid w)
+\frac{\lambda}{2}\lVert w-w^0\rVert_2^2.
\]

El promedio evita que una pantalla con tres rutas cause por sí sola un paso dos
veces mayor que una pantalla con dos. La regularización reduce la posibilidad
de que unas pocas elecciones ruidosas borren la declaración inicial.

El gradiente que implementa el código es:

\[
\nabla\mathcal{L}_t(w)=
\frac{1}{m}\sum_{j=1}^{m}
\beta\left[\sigma\!\left(\beta w^\top\Delta_{a,b_j}\right)-1\right]
\Delta_{a,b_j}
+\lambda(w-w^0).
\]

En lenguaje llano, el primer término desplaza los pesos hacia las dimensiones
que explican la ruta elegida; el segundo tira suavemente de ellos hacia el
cuestionario inicial. Cuando el modelo ya asignaba una probabilidad alta a la
elección, el factor \(\sigma-1\) se aproxima a cero y el ajuste es menor.

### 5. Actualización y proyección

La actualización sin restricciones sería:

\[
\widetilde{w}_{t+1}=w^L_t-\eta\nabla\mathcal{L}_t(w^L_t).
\]

Después se proyecta al simplejo:

\[
w'_{t+1}=\Pi_{\mathcal{S}}(\widetilde{w}_{t+1}),
\qquad
\mathcal{S}=\{w:w_i\geq0,\ \sum_i w_i=1\}.
\]

La proyección evita pesos negativos o una suma distinta de uno. Es equivalente
a buscar el vector válido más próximo al paso propuesto.

### 6. Límite por interacción

Si la distancia \(L_1\) propuesta supera \(\delta_{\max}\), se interpola entre
el estado anterior y el nuevo:

\[
w^L_{t+1}=w^L_t+
\min\!\left(1,
\frac{\delta_{\max}}{\lVert w'_{t+1}-w^L_t\rVert_1}
\right)(w'_{t+1}-w^L_t).
\]

La configuración seleccionada usa \(\delta_{\max}=0{,}12\). Este parámetro se
denomina `maximum_learned_update_l1` en el código porque limita el vector
aprendido, no el efectivo. Como la suma de los pesos permanece en uno, mover
seis puntos porcentuales de una dimensión a otra produce una distancia
\(L_1\) de 0,12: se cuentan tanto la masa retirada como la añadida.

### 7. Mezcla segura con la declaración inicial

Los pesos efectivos son:

\[
w^E_t=(1-\alpha_t)w^0+\alpha_t w^L_t.
\]

Para las tres primeras elecciones, \(\alpha_t=0\). A partir de la cuarta,
aumenta en 0,10 hasta un máximo de 0,50:

\[
\alpha_t=
\begin{cases}
0, & t\leq3,\\
\min(0{,}50,\ 0{,}10(t-3)), & t>3.
\end{cases}
\]

Por tanto, los pesos declarados conservan siempre al menos la mitad de la
influencia. La estimación interna sí se actualiza durante la observación, pero
no cambia el orden mostrado hasta la cuarta elección.

El salto efectivo combina dos cambios: la actualización de \(w^L\) y el
incremento de \(\alpha_t\). Por ello, \(\delta_{\max}\) no constituye por sí
solo una cota matemática del salto efectivo. El experimento registra ambos
valores y la configuración seleccionada alcanzó como máximo 0,0983 en los
pesos efectivos, por debajo de 0,12, pero esta es una observación empírica del
protocolo evaluado y no una garantía para cualquier configuración válida.

## Ejemplo numérico sencillo

Para facilitar la lectura se muestran solo tres dimensiones; el código utiliza
las nueve. Supónganse unos pesos de 0,40 para distancia, 0,40 para cruces
complejos y 0,20 para incertidumbre.

| Ruta | Distancia | Cruces complejos | Incertidumbre | Coste total |
| --- | ---: | ---: | ---: | ---: |
| A, elegida | 0,60 | 0,20 | 0,10 | \(0,40·0,60+0,40·0,20+0,20·0,10=0,34\) |
| B, no elegida | 0,30 | 0,70 | 0,40 | \(0,40·0,30+0,40·0,70+0,20·0,40=0,48\) |

La ruta A es más larga, pero sus costes de cruce e incertidumbre son menores.
La diferencia es \((-0,30; 0,50; 0,30)\), su producto con los pesos es 0,14 y,
con \(\beta=3\), el margen es 0,42. La probabilidad logística de elegir A es
aproximadamente 0,603. La elección encaja con el modelo, aunque no de forma
abrumadora; por ello el ajuste es gradual y no una regla absoluta.

## Capas de protección

| Capa | Función | ¿Puede modificarla el aprendizaje? |
| --- | --- | --- |
| Restricciones críticas | Excluir escalones prohibidos, acceso peatonal incompatible, cruces incompatibles, pendiente o desvío máximos | No |
| Costes normalizados | Representar las características graduables de una ruta | No |
| Pesos declarados | Conservar la intención expresada por la persona | No; solo puede modificarlos la persona |
| Pesos aprendidos | Estimar prioridades latentes a partir de elecciones | Sí, con límites |
| Pesos efectivos | Mezclar declaración y aprendizaje para ordenar rutas aceptadas | Sí, hasta un 50 % |
| Confianza | Exponer la cobertura de la evidencia | No interviene en la probabilidad de preferencia |
| Incertidumbre | Exponer ausencia de evidencia y penalizarla como coste no negativo | Su peso puede ajustarse, pero nunca se oculta ni se convierte en ventaja |

Una ruta rechazada sigue rechazada con cualquier vector de pesos. Una mayor
incertidumbre continúa siendo un coste y, por tanto, sí puede influir en el
coste total y en la probabilidad de elección. El aprendizaje puede ajustar su
importancia, pero nunca convertirla en una ventaja ni dejar de mostrar el
porcentaje de información desconocida y sus avisos. La confianza, en cambio,
permanece fuera del vector aprendido.

## Datos de entrada y salida

### Entrada

- Pesos declarados normalizados.
- Costes normalizados de la ruta elegida.
- Costes de las demás rutas aceptadas y mostradas.
- Identificadores opacos de esas rutas.
- Número de elecciones anteriores y configuración acotada.

No se aprende de rutas que el sistema había descartado ni de una pantalla con
una sola ruta aceptada, porque en ninguno de esos casos existe una comparación
válida. `build_pairwise_choice` construye la entrada desde el resultado
completo de una clasificación ya filtrada y rechaza un identificador elegido
que no pertenezca a sus rutas aceptadas. La futura interfaz móvil deberá usar
esta vía y conservar el identificador de la comparación realmente mostrada.

### Salida

- Pesos aprendidos y efectivos antes y después.
- Número de elecciones observadas.
- Estado: desactivado, observación o influencia activa.
- Probabilidad y pérdida logística por pares antes y después del ajuste. El
  término de regularización se aplica al gradiente, pero no se mezcla con este
  diagnóstico para que su significado permanezca explícito.
- Cambio \(L_1\) total y cambio de cada dimensión.

Esta salida permite auditar y explicar el ajuste sin reconstruirlo a partir de
un registro GPS.

## Implementación

- `backend/feedback/models.py`: configuración, comparación, estado y resultado
  validados con Pydantic.
- `backend/feedback/learner.py`: probabilidad, gradiente, proyección, límites,
  mezcla, construcción desde rutas aceptadas, desactivación y reinicio como
  funciones puras.
- `backend/scoring/scorer.py`: acepta opcionalmente pesos efectivos sin
  sobrescribir los declarados.
- `backend/scoring/ranking.py`: aplica primero las mismas restricciones y usa
  después los pesos efectivos únicamente en el coste gradual.
- `ml/adaptive_preferences/evaluation.py`: calibración y evaluación sintética
  reproducibles.

Se crea un modelo validado nuevo después de cada actualización; no se muta el
estado anterior. El orden de las dimensiones es único y estable. La función
logística se calcula de forma numéricamente estable para evitar desbordamientos.

### Estado real de implementación

El núcleo de aprendizaje, su conexión opcional con la clasificación, sus
pruebas y el experimento `EXP-002` están implementados. La clasificación usada
por la API sigue recibiendo pesos declarados hasta que la app almacene y envíe
los efectivos en el siguiente incremento. Esta cautela evita afirmar que una
funcionalidad ya está disponible para la persona usuaria cuando todavía solo
está validada en el núcleo de dominio.

## Pruebas

Las pruebas automáticas comprueban, entre otros casos:

- que el signo de la comparación favorece el menor coste;
- que las tres primeras elecciones no cambian los pesos efectivos;
- que la cuarta activa una influencia de 0,10;
- que, tras 500 actualizaciones, todos los pesos siguen siendo no negativos y
  suman uno;
- que el cambio de cada interacción no supera el límite;
- que una o dos alternativas no elegidas producen pasos comparables;
- que costes idénticos no inventan una preferencia;
- que desactivar y restablecer tienen el comportamiento documentado;
- que una ruta con una violación crítica no reaparece por cambiar los pesos;
- que la entrada de aprendizaje construida desde una clasificación contiene
  solo las rutas aceptadas y realmente elegibles;
- que la incertidumbre nunca se vuelve favorable;
- que iguales entradas producen exactamente la misma salida serializada;
- que una simulación con semilla fija es reproducible;
- que el modelo mejora ante una preferencia sintética conocida.

## Resultados

La calibración y la evaluación completas se documentan en
[EXP-002](../evaluation/calibracion-aprendizaje-adaptativo.md). En la condición
principal, que introduce un 10 % de elecciones sintéticas inconsistentes, la
exactitud al seleccionar la primera ruta fue:

| Sistema | Exactitud final | Arrepentimiento medio |
| --- | ---: | ---: |
| Ruta más corta | 49,3 % | 0,0505 |
| Pesos declarados fijos | 78,6 % | 0,0090 |
| Clasificación adaptativa | 89,0 % | 0,0024 |

La mejora adaptativa frente a los pesos fijos fue de 10,4 puntos porcentuales
en 80 combinaciones de cuatro perfiles y veinte semillas. Como los perfiles
comparten las rutas de cada semilla, el intervalo aproximado del 95 % se calculó
sobre veinte medias agrupadas y fue de 9,1 a 11,7 puntos. No se interpreta como eficacia
clínica: demuestra que la implementación recupera una señal de preferencias
conocida bajo los supuestos del simulador.

El resultado depende de cuánta información recoge el cuestionario inicial. Con
un 10 % de elecciones inconsistentes, la adaptación mejoró la exactitud en 16,41,
10,41 y 2,98 puntos cuando la declaración contenía respectivamente un 0 %, 25 %
y 50 % de la señal latente. En cambio, empeoró 4,77 puntos con un 75 % de señal
y 12,16 con una declaración sintéticamente exacta. El aprendizaje no se presenta,
por tanto, como universalmente superior: debe ser opcional, reversible y objeto
de una futura regla de activación conservadora.

## Riesgos y limitaciones

- El usuario sintético elige con la misma familia lineal que el modelo aprende;
  esto favorece al sistema evaluado.
- La configuración se seleccionó suponiendo que el cuestionario contenía un
  25 % de la señal latente. El análisis de sensibilidad demuestra que puede
  perjudicar un perfil inicial ya muy preciso.
- Los costes sintéticos son independientes y no reproducen todas las
  correlaciones de rutas ORS enriquecidas con OSM.
- Los perfiles sintéticos son instrumentos matemáticos, no arquetipos clínicos
  de personas ciegas o con baja visión.
- La mejora de clasificación no implica recuperar exactamente el vector de
  pesos: varios vectores pueden inducir el mismo orden en las rutas observadas.
- El primer punto de control que permaneció próximo al resultado final tuvo una
  mediana de 60 elecciones. Como 60 es el último punto observado, esta medida no
  demuestra estabilización ni convergencia. Se observan mejoras desde 5–10
  elecciones, pero no debe prometerse una adaptación rápida.
- El límite del 50 % protege la declaración inicial, aunque también impide
  corregirla por completo si estuviera muy alejada de la preferencia real.
- Una elección puede depender del contexto y no de una preferencia estable.
- Falta evaluación con rutas reales, pruebas longitudinales y participantes.

## Texto base para la memoria

La contribución de aprendizaje automático se formuló como una clasificación
lineal en línea por comparaciones pareadas. Cada elección explícita se convirtió
en diferencias entre los costes de la ruta seleccionada y las alternativas
aceptadas no elegidas. Una pérdida logística actualizó una estimación de pesos,
regularizada hacia el perfil inicial y proyectada al simplejo para conservar
coeficientes no negativos y normalizados. Se añadió un periodo de observación,
un límite de cambio por interacción y una mezcla cuya influencia aprendida no
supera el 50 %. Las restricciones críticas se aplicaron antes del modelo y no
formaron parte de los parámetros entrenables. Esta arquitectura mantiene la
adaptación subordinada a la seguridad y permite explicar cada modificación.

En una evaluación sintética con conjuntos y semillas no usados en la
calibración, cuatro perfiles —uno de ellos completamente reservado— y un 10 %
de elecciones inconsistentes, la
clasificación adaptativa alcanzó un 89,0 % de exactitud frente al 78,6 % de los
pesos declarados fijos y redujo el arrepentimiento medio de 0,0090 a 0,0024. El
resultado valida la implementación y aporta evidencia preliminar del valor de
la adaptación en un entorno controlado; no demuestra todavía utilidad con
personas usuarias ni en recorridos físicos. Una sensibilidad adicional mostró
que esta ventaja desaparece y se invierte cuando el cuestionario sintético ya
representa con gran fidelidad la preferencia latente. Por ello, el diseño
conserva el sistema fijo, inicia el aprendizaje desactivado y mantiene la
activación, la desactivación y el reinicio como controles explícitos.

## Trabajo pendiente

- [x] Fijar la formulación y calibrar sus hiperparámetros.
- [x] Implementar actualización, límites, desactivación y reinicio.
- [x] Crear perfiles sintéticos y sistemas de referencia.
- [x] Medir exactitud, arrepentimiento, estabilidad y robustez al ruido.
- [ ] Persistir el estado en SQLite dentro del dispositivo.
- [ ] Conectar «Elegir esta ruta» con una comparación local válida.
- [ ] Permitir activar el aprendizaje de forma explícita y mostrar y anunciar
  sus cambios de preferencia de forma comprensible.
- [ ] Repetir la evaluación con costes de rutas ORS enriquecidas con OSM.
- [ ] Calibrar una activación que proteja perfiles iniciales ya precisos.
- [ ] Diseñar una evaluación con participantes y consentimiento informado.

## Referencias y evidencias

- Bradley, R. A. y Terry, M. E. (1952). «Rank Analysis of Incomplete Block
  Designs: I. The Method of Paired Comparisons». *Biometrika*, 39(3/4),
  324–345. <https://doi.org/10.1093/biomet/39.3-4.324>.
- Burges, C. et al. (2005). «Learning to Rank Using Gradient Descent».
  *Proceedings of the 22nd International Conference on Machine Learning*,
  89–96. <https://doi.org/10.1145/1102351.1102363>.
- Robbins, H. y Monro, S. (1951). «A Stochastic Approximation Method». *The
  Annals of Mathematical Statistics*, 22(3), 400–407.
  <https://doi.org/10.1214/aoms/1177729586>.
- Zinkevich, M. (2003). «Online Convex Programming and Generalized
  Infinitesimal Gradient Ascent». Carnegie Mellon University,
  informe CMU-CS-03-110.
  <https://www.cs.cmu.edu/~maz/publications/techconvex.pdf>.
- Duchi, J., Shalev-Shwartz, S., Singer, Y. y Chandra, T. (2008). «Efficient
  Projections onto the l1-Ball for Learning in High Dimensions».
  *Proceedings of ICML 2008*, 272–279.
  <https://doi.org/10.1145/1390156.1390191>.
- Código: `backend/feedback/`, `backend/scoring/ranking.py` y
  `backend/scoring/scorer.py`.
- Pruebas: `tests/feedback/` y `tests/scoring/`.
- Experimento y artefactos:
  [calibración y evaluación](../evaluation/calibracion-aprendizaje-adaptativo.md).

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
