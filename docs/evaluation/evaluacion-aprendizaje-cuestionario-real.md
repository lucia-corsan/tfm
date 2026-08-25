# Evaluación del aprendizaje a partir del cuestionario real

Estado: `Validado`
Última actualización: 25 de agosto de 2026
Responsabilidad principal: `evaluation`

## Problema que resuelve

`EXP-007` evaluó el aprendizaje sobre rutas ORS enriquecidas con OSM antes de
que existiera el cuestionario definitivo de catorce preguntas. Conservó cuatro
perfiles matemáticos y una aproximación continua a la calidad de la declaración
inicial. Su resultado negativo sigue siendo válido para aquel banco limitado,
pero no permite atribuir el mismo comportamiento a los perfiles que genera hoy
la aplicación.

`EXP-009` añade una evaluación independiente. Utiliza configuraciones completas
del cuestionario, la traducción ordinal 0–3 implementada en la aplicación y las
restricciones de escalones y desvío. No sustituye ni elimina `EXP-007`: responde
a una pregunta posterior y conserva el resultado anterior como control de un
banco con poca capacidad informativa.

## Requisitos

- Utilizar exactamente las categorías y la transformación vigente del
  cuestionario, comprobada mediante casos compartidos entre TypeScript y Python.
- Incluir las catorce respuestas, distinguiendo las diez que modifican rutas de
  las cuatro que configuran voz, presentación y consentimiento.
- Mantener fuera del aprendizaje las restricciones críticas.
- Comparar ruta más corta, pesos declarados fijos y clasificación adaptativa.
- Congelar los parámetros de `EXP-002`; no recalibrarlos con los nuevos
  resultados.
- Separar situaciones informativas de rutas y el banco ORS+OSM limitado.
- Separar una declaración exactamente coherente de una preferencia latente más
  fina que la escala 0–3 no puede expresar.
- Conservar resultados favorables, neutros y negativos.
- No interpretar elecciones simuladas como respuestas de participantes.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Eliminar `EXP-007` y sustituirlo | Evita explicar dos protocolos | Oculta un resultado negativo y rompe la trazabilidad | Descartada |
| Repetir solo `EXP-007` cambiando nombres | Poco esfuerzo | No comprueba la transformación real ni separa calidad del cuestionario y calidad de las rutas | Descartada |
| Evaluar el cuestionario en un banco informativo y en el banco real limitado | Separa capacidad matemática, efecto de la declaración y transferencia | Las preferencias y elecciones siguen siendo simuladas | Adoptada |
| Esperar únicamente a elecciones de usuarios | Mayor validez externa | Impide comprobar ahora la coherencia técnica y requiere un protocolo con participantes | Complemento futuro |

## Decisión adoptada

### Configuraciones del cuestionario

Se fijaron cuatro configuraciones matemáticas completas:

1. prioridad a distancia y certeza;
2. prioridad a cruces y ayudas;
3. prioridad a orientación y certeza;
4. prioridad a continuidad peatonal.

No representan tipos de discapacidad ni arquetipos clínicos. Su función es
activar combinaciones distintas de las nueve dimensiones del modelo y de las
dos restricciones configurables. Los casos completos y el perfil esperado se
versionaron en `shared/onboarding-questionnaire-evaluation.json`.

Las preguntas 1–10 intervienen en rutas: escalones, desvío máximo y ocho
prioridades. Las preguntas 11–13 controlan voz y presentación. La pregunta 14
registra consentimiento. Estas cuatro respuestas se incluyen para comprobar el
flujo completo, pero no se permite que alteren los pesos ni las restricciones.

### Dos condiciones de preferencia

- **Coherencia exacta:** las elecciones simuladas proceden exactamente de los
  pesos declarados por el cuestionario. Mide si aprender modifica
  innecesariamente una declaración que ya representa bien a la persona.
- **Refinamiento latente:** las respuestas conservan las mismas categorías
  ordinales, pero la preferencia simulada asigna diferencias finas dentro de
  ellas. Mide si las elecciones pueden refinar información que la escala
  `ninguna–baja–media–alta` no expresa.

Esta segunda condición no presupone que el cuestionario sea incorrecto. Modela
su resolución limitada: dos dimensiones marcadas como «alta» reciben el mismo
valor inicial aunque una pueda importar algo más que la otra.

### Dos bancos de situaciones

- **Banco sintético informativo:** situaciones nuevas de tres alternativas no
  dominadas, generadas con semillas independientes. Permite observar
  compensaciones en las nueve dimensiones y conocer la preferencia de
  referencia.
- **Banco ORS+OSM limitado:** los mismos costes y partición conservados de
  `EXP-007`. Las restricciones se vuelven a aplicar según cada respuesta de
  escalones y desvío. Permite comprobar la transferencia sin ocultar que el
  banco contiene pocas comparaciones y dimensiones constantes.

En ambos bancos se utilizaron veinte semillas, un 10 % de elecciones
inconsistentes, sesenta elecciones de aprendizaje y los puntos de control 0, 3,
5, 10, 20, 40 y 60. En el banco sintético hubo 160 situaciones reservadas por
semilla. En el banco real se conservó la división de pares fijada en `EXP-007`.

## Justificación

El diseño factorial evita atribuir al cuestionario un problema que puede
proceder de las rutas observadas. Si el aprendizaje mejora en el banco
informativo pero no en el limitado, la explicación principal será la falta de
contrastes en las alternativas. Si empeora incluso cuando existen contrastes y
la preferencia latente difiere de la escala ordinal, se cuestionará la utilidad
del algoritmo o de sus parámetros. La condición exacta funciona como control
de seguridad: el sistema no debería prometer mejoras cuando el perfil inicial
ya es suficiente.

## Datos de entrada y salida

### Entrada

- Cuatro casos completos del cuestionario versionados en `shared/`.
- Traducción real `ninguna=0`, `baja=1`, `media=2`, `alta=3`.
- Pesos de escalones y límites de desvío de la aplicación.
- Configuración de aprendizaje congelada de `EXP-002`.
- Generador informativo de `EXP-002` y costes sanitizados de `EXP-007`.

### Salida generada

- Perfil y pesos derivados de cada configuración.
- Disponibilidad de alternativas después de aplicar sus restricciones.
- Exactitud de primera ruta y por pares.
- Arrepentimiento medio y acumulado.
- Evolución por número de elecciones.
- Cambios máximos de los pesos efectivos.
- Comparaciones emparejadas entre clasificación fija y adaptativa.

## Implementación

El experimento se implementó en
`ml/adaptive_preferences/questionnaire_evaluation.py`. El programa realiza de
forma reproducible los siguientes pasos:

1. lee cuatro formularios completos del archivo compartido;
2. reconstruye el perfil con la misma escala ordinal que usa la aplicación;
3. comprueba que el resultado coincide con el perfil esperado;
4. aplica las restricciones de escalones, acceso peatonal, cruces y desvío
   antes de comparar rutas;
5. ejecuta los tres sistemas de referencia en las dos condiciones y los dos
   bancos;
6. agrupa los intervalos por semilla para no tratar los cuatro perfiles que
   comparten situaciones como muestras independientes;
7. guarda todas las ejecuciones, los resúmenes y la figura sin coordenadas ni
   datos personales.

El coste de una ruta continúa siendo una suma ponderada de nueve costes
normalizados:

\[
C(r\mid w)=\sum_{j=1}^{9} w_jc_j(r),
\qquad w_j\geq0,\qquad \sum_{j=1}^{9}w_j=1.
\]

El cuestionario produce los pesos declarados \(w^0\). El sistema fijo utiliza
siempre esos pesos. El sistema adaptativo estima \(w^L_t\) mediante la pérdida
logística por comparaciones pareadas ya validada en `EXP-002` y utiliza una
mezcla conservadora:

\[
w^E_t=(1-\alpha_t)w^0+\alpha_tw^L_t,
\]

donde \(\alpha_t=0\) durante las tres primeras elecciones y no supera 0,50.
Las fórmulas completas del gradiente, la proyección y la regularización se
mantienen en [Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md).
No se modificó ningún hiperparámetro después de observar este experimento.

La ejecución se reproduce desde la raíz mediante:

```bash
python -m ml.adaptive_preferences.questionnaire_evaluation
```

En total se generaron 6.720 filas de evaluación: cuatro perfiles, dos
condiciones, veinte semillas, dos bancos, siete puntos de control y tres
sistemas. Cada ejecución sintética utilizó 160 situaciones nuevas para medir
el resultado. En el banco ORS+OSM se reutilizó la partición fijada en
`EXP-007`: cuatro pares de aprendizaje resultaron aptos para todos los perfiles;
la evaluación conservó cuatro pares para tres perfiles y tres para el perfil
que excluye escalones.

## Pruebas

- Paridad exacta de los cuatro perfiles entre TypeScript y Python.
- Invariancia ante voz, velocidad, presentación y consentimiento.
- Aplicación por perfil de escalones y desvío.
- Exclusión permanente de acceso peatonal incompatible y cruces incompatibles.
- Separación de situaciones de aprendizaje y evaluación.
- Reproducibilidad por semilla.
- Pesos siempre no negativos y normalizados.

Se añadieron once pruebas Python específicas y una prueba TypeScript
compartida con los cuatro perfiles. Las pruebas comprueban, entre otros
aspectos, que cambiar voz, velocidad, presentación o consentimiento no cambia
el perfil de rutas; que excluir escalones elimina el escenario real afectado;
y que la misma semilla reproduce exactamente la curva. La ejecución específica
finalizó con 11 pruebas Python y 17 pruebas del formulario superadas. La suite
completa terminó con 294 pruebas Python y 183 pruebas de la aplicación, además
de Ruff, ESLint y TypeScript sin errores. Una segunda ejecución produjo los
mismos valores SHA-256 para los cinco CSV y la figura.

## Resultados

### Perfiles producidos por el cuestionario

La tabla resume los pesos normalizados. Los valores completos, incluida la
preferencia latente fina, están en
[`aprendizaje-cuestionario-perfiles.csv`](artifacts/aprendizaje-cuestionario-perfiles.csv).

| Configuración | Escalones | Desvío máximo | Dimensiones con mayor peso declarado |
| --- | --- | ---: | --- |
| Distancia y certeza | Informar | 10 % | Distancia 0,30; incertidumbre 0,20 |
| Cruces y ayudas | Evitar | 50 % | Cruces complejos, ayudas y escalones: 0,167 cada una |
| Orientación y certeza | Informar | 25 % | Orientación e incertidumbre: 0,20 cada una |
| Continuidad peatonal | Excluir | 100 % | Aceras, escalones y superficie: 0,167 cada una |

No son perfiles de personas. Son configuraciones matemáticas que permiten
activar respuestas diferentes del formulario, incluidas las restricciones.

### Resultado final después de 60 elecciones

La métrica principal es la exactitud de la primera ruta: proporción de
situaciones reservadas en las que el sistema coloca primero la alternativa
preferida por la función latente simulada.

| Banco | Condición | Ruta más corta | Pesos fijos | Adaptativo | Diferencia adaptativo − fijo |
| --- | --- | ---: | ---: | ---: | ---: |
| Sintético informativo | Cuestionario coherente | 45,41 % | **100,00 %** | 86,82 % | −13,18 puntos |
| Sintético informativo | Preferencia fina no expresada | 45,50 % | **94,07 %** | 88,40 % | −5,67 puntos |
| ORS+OSM limitado | Cuestionario coherente | 60,42 % | **100,00 %** | 79,17 % | −20,83 puntos |
| ORS+OSM limitado | Preferencia fina no expresada | 60,42 % | **100,00 %** | 85,10 % | −14,90 puntos |

Los intervalos normales aproximados del 95 % de la exactitud adaptativa fueron
85,71–87,93 % y 87,52–89,28 % en el banco sintético, y 79,17–79,17 % y
84,49–85,72 % en el banco real limitado. El intervalo sin amplitud no significa
certeza poblacional: las veinte semillas reutilizan las mismas rutas reales y,
en esa condición, terminan con el mismo orden agregado.

La comparación por pares conduce a la misma conclusión:

| Banco | Condición | Exactitud fija por pares | Exactitud adaptativa por pares | Arrepentimiento fijo | Arrepentimiento adaptativo |
| --- | --- | ---: | ---: | ---: | ---: |
| Sintético informativo | Coherente | **100,00 %** | 90,89 % | 0,00000 | 0,00312 |
| Sintético informativo | Refinamiento | **95,79 %** | 92,21 % | 0,00067 | 0,00252 |
| ORS+OSM limitado | Coherente | **100,00 %** | 87,74 % | 0,00000 | 0,00324 |
| ORS+OSM limitado | Refinamiento | **97,92 %** | 89,20 % | 0,00000 | 0,00314 |

### Comparación emparejada

Cada resultado adaptativo se comparó con el fijo sobre el mismo perfil, la
misma semilla y las mismas situaciones. En la condición sintética coherente,
el adaptativo perdió las 80 comparaciones. Con refinamiento latente ganó 8,
empató 4 y perdió 68. En el banco real coherente ganó 0, empató 20 y perdió 60;
con refinamiento ganó 0, empató 39 y perdió 41. El intervalo del 95 % para la
diferencia media adaptativo − fijo fue:

- banco sintético coherente: de −14,29 a −12,07 puntos;
- banco sintético con refinamiento: de −6,52 a −4,82 puntos;
- banco real coherente: −20,83 puntos, sin variación entre semillas;
- banco real con refinamiento: de −15,51 a −14,28 puntos.

### Evolución temporal

Las tres primeras elecciones no cambian el ranking, como exige el periodo de
observación. En la condición de refinamiento del banco informativo se observa
una mejora pequeña y transitoria tras cinco elecciones: 94,34 % adaptativo
frente a 94,07 % fijo, es decir, +0,27 puntos. A partir de diez elecciones la
ventaja desaparece y la exactitud termina en 88,40 %. Con una preferencia
exactamente coherente no existe nada que corregir: el adaptativo baja a 97,59 %
en cinco elecciones y a 86,82 % en sesenta.

Este comportamiento indica que el algoritmo detecta inicialmente parte de la
señal fina, pero la configuración congelada de `EXP-002`, el 10 % de elecciones
inconsistentes y el aumento de la influencia aprendida acumulan ajustes que no
se sostienen en las situaciones reservadas. El mayor salto efectivo fue 0,0900,
dentro del límite empírico observado, por lo que el problema no es una
actualización única descontrolada sino el efecto acumulado de varias
actualizaciones pequeñas.

### Interpretación

El resultado completa, y no reemplaza, los experimentos anteriores:

- `EXP-002` demostró que el algoritmo puede recuperar una señal cuando el
  perfil inicial contiene solo un 25 % de ella.
- `EXP-007` mostró que esa mejora no se transfiere a un banco real pequeño y
  poco discriminante.
- `EXP-009` muestra que el cuestionario actual proporciona una inicialización
  mucho más informativa en estas simulaciones. En tal punto de partida, la
  configuración adaptativa actual no aporta una mejora estable.

La condición de refinamiento era la oportunidad más favorable para aprender:
los pesos verdaderos diferían de las categorías 0–3 sin contradecirlas. Aun
así, el fijo ya alcanzó 94,07 % en situaciones informativas y 100 % de primera
ruta en el banco real. Ese efecto techo deja poco margen y hace que los errores
de actualización pesen más que las posibles correcciones.

La conclusión de producto no es eliminar el componente de IA, sino cambiar la
afirmación que se hace sobre él. El cuestionario debe ser la referencia
principal; el aprendizaje continúa siendo una función experimental, voluntaria
y reversible. Antes de aumentar su influencia deben cumplirse dos condiciones:
disponer de comparaciones realmente informativas y demostrar en una ventana
posterior que el modelo aprendido supera al perfil fijo. Los resultados apoyan
reducir o suspender la adaptación cuando no existe esa evidencia, no activarla
solo por haber acumulado muchas elecciones.

La figura 12 resume las cuatro comparaciones finales. Su mensaje no es que el
aprendizaje sea inútil en general, sino que su valor depende de cuánto sabe ya
el perfil y de la calidad de las rutas observadas.

## Riesgos y limitaciones

- Los cuatro casos son matemáticos, no una tipología de personas ciegas.
- La preferencia latente es conocida porque se simula; no procede de usuarios.
- El banco sintético comparte la familia lineal del modelo.
- El banco ORS+OSM conserva la baja diversidad identificada en `EXP-007`.
- La escala ordinal y los refinamientos finos son decisiones de modelado que
  deberán contrastarse con participantes.
- El 10 % de elecciones inconsistentes es un supuesto de robustez, no una tasa
  estimada en personas usuarias.
- Las cuatro configuraciones comparten el modelo lineal con el clasificador;
  no cubren preferencias contextuales o no lineales.
- En el banco real, las veinte semillas cambian orden y ruido, pero no aportan
  veinte conjuntos de calles independientes.
- El 100 % fijo sobre pocas situaciones representa un efecto techo, no eficacia
  general ni validación del cuestionario con población objetivo.

## Texto base para la memoria

Tras incorporar el cuestionario definitivo se ejecutó un experimento adicional
que conserva la evaluación anterior y utiliza la transformación real de sus
respuestas. El protocolo separó la calidad del perfil inicial de la capacidad
informativa de las rutas mediante dos condiciones de preferencia y dos bancos
de situaciones. Después de sesenta elecciones, el sistema adaptativo quedó
entre 5,67 y 20,83 puntos por debajo del perfil fijo en las cuatro
comparaciones. Incluso al simular una preferencia fina no expresada por la
escala ordinal, la pequeña mejora observada en la quinta elección no se mantuvo.
El cuestionario funcionó como una inicialización fuerte dentro de este modelo,
mientras que las actualizaciones acumularon ruido o señal insuficiente. El
resultado no constituye evidencia con personas ni invalida la capacidad
algorítmica demostrada con perfiles imprecisos; justifica conservar el perfil
declarado como ancla y exigir validación temporal antes de aplicar aprendizaje.

## Trabajo pendiente

- [x] Implementar la lectura validada de los casos compartidos.
- [x] Ejecutar las cuatro condiciones experimentales.
- [x] Generar artefactos, tablas y una figura legible.
- [x] Incorporar resultados y conclusiones a la memoria.
- [ ] Complementar las simulaciones con elecciones de participantes.

## Referencias y evidencias

- [Perfil inicial y preferencias](../product/perfil-inicial-preferencias.md).
- [Calibración del aprendizaje](calibracion-aprendizaje-adaptativo.md).
- [Transferencia sobre rutas ORS+OSM](evaluacion-aprendizaje-rutas-reales.md).
- [Diagnóstico de capacidad informativa](diagnostico-capacidad-informativa.md).
- `shared/onboarding-questionnaire-evaluation.json`.
- [`aprendizaje-cuestionario-perfiles.csv`](artifacts/aprendizaje-cuestionario-perfiles.csv).
- [`aprendizaje-cuestionario-ejecuciones.csv`](artifacts/aprendizaje-cuestionario-ejecuciones.csv).
- [`aprendizaje-cuestionario-resumen.csv`](artifacts/aprendizaje-cuestionario-resumen.csv).
- [`aprendizaje-cuestionario-comparaciones.csv`](artifacts/aprendizaje-cuestionario-comparaciones.csv).
- [`aprendizaje-cuestionario-disponibilidad.csv`](artifacts/aprendizaje-cuestionario-disponibilidad.csv).
- [`aprendizaje-cuestionario.png`](../figures/aprendizaje-cuestionario.png).

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
