# Scoring explicable de adecuación al perfil

Estado: `En implementación`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `research`

## Problema que resuelve

Ordenar rutas peatonales según un perfil sin confundir adecuación, confianza e
incertidumbre y sin permitir que la ausencia de datos beneficie una alternativa.

## Requisitos

- Restricciones críticas antes del scoring.
- Costes normalizados y pesos no negativos.
- `unknown` nunca aporta evidencia positiva.
- Razones derivadas de los factores realmente usados.
- Resultado reproducible mediante funciones puras.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Una única puntuación opaca | Interfaz simple | Oculta confianza y barreras | Descartada |
| Modelo multicriterio explicable | Trazable y personalizable | Exige normalización explícita | Adoptada |

## Decisión adoptada

Se aplicarán primero las restricciones críticas y después un coste multicriterio
normalizado. La adecuación, la confianza y la incertidumbre serán salidas
separadas. Los pesos declarados se normalizarán para sumar uno.

### Política de restricciones críticas

| Restricción del perfil | Evidencia que descarta la ruta |
| --- | --- |
| Evitar escalones | `step_free=unfavorable` o conteo conocido de escalones mayor que cero |
| Exigir acceso peatonal | `pedestrian_access=unfavorable` |
| Evitar cruces incompatibles | `crossing_compatibility=unfavorable` |
| Pendiente máxima | Pendiente numérica conocida superior al límite |
| Desvío máximo | Proporción de desvío superior al límite |

Un estado `unknown` nunca se convierte en una barrera confirmada. La alternativa
puede continuar a la fase de scoring, pero reducirá su confianza, aumentará su
incertidumbre y mostrará un aviso. Esta política evita tanto prometer seguridad
sin evidencia como descartar sistemáticamente las zonas peor documentadas.

## Justificación

El enfoque permite auditar cada recomendación, construir baselines académicos y
mantener las reglas críticas fuera del aprendizaje adaptativo.

## Datos de entrada y salida

Entrada: `MobilityProfile` y `RouteCandidate`. Salida prevista: aceptación o
descarte, adecuación de 0 a 1, confianza, incertidumbre, razones y avisos.

### Correspondencia entre evidencia y costes

El scoring utilizará todas las categorías del estudio OSM, pero evitará sumar
varias veces la infraestructura de un mismo cruce:

- La complejidad del cruce se calculará con los cruces totales y complejos.
- Las ayudas de cruce agruparán semáforos, sonido, vibración, pavimento
  podotáctil y bordillos interpretados.
- La continuidad peatonal agrupará aceras, acceso peatonal, rampas, escalones y
  superficie.
- Pendiente, orientación, distancia e incertidumbre permanecerán como costes
  diferenciados.

Los datos detallados se conservarán para generar avisos y explicaciones. La
interfaz no expondrá un control independiente por cada etiqueta OSM, porque eso
aumentaría la carga cognitiva y permitiría duplicar pesos sobre un mismo
fenómeno. La existencia de una etiqueta nunca será positiva por sí sola: primero
se interpretará su valor como favorable, desfavorable o desconocido.

## Implementación

Los modelos de entrada, los *fixtures*, las restricciones, la normalización, el
cálculo de métricas, las explicaciones estructuradas y el ranking están
implementados como funciones deterministas en `backend/scoring/`.

### Normalización de pesos

Para unos pesos declarados \(w_i\), el coeficiente utilizado en el cálculo es:

```text
peso_normalizado_i = w_i / suma(w)
```

Los modelos de entrada ya garantizan valores no negativos y al menos un peso positivo.
La normalización no modifica el perfil almacenado y produce coeficientes cuya
suma es uno.

### Normalización de costes

Cada coste se acota entre cero —condición más favorable— y uno —mayor coste
modelado—. Se adoptan escalas fijas para que la puntuación de una ruta no cambie
solo porque se añada o retire otra alternativa:

- Desvío: escala lineal entre las proporciones 1 y 3 admitidas por la validación
  de `detour_ratio`.
- Carga de cruces: media del número de cruces respecto a un techo inicial de 20
  y la proporción de cruces complejos.
- Complejidad de orientación: media de instrucciones respecto a 20 y giros
  respecto a 15.
- Pendiente: combina el coste de la evidencia con la pendiente máxima respecto
  al límite técnico del 30 %.
- Incertidumbre: proporción temática de atributos desconocidos.

Los techos de 20 cruces, 20 instrucciones y 15 giros no se presentan como
umbrales universales de accesibilidad. Son escalas técnicas iniciales que se
incluirán en el análisis de sensibilidad y podrán revisarse con evidencia.

Para integrar estado y cobertura, una evidencia temática utiliza:

```text
coste_evidencia = cobertura × coste_estado
                   + (1 − cobertura) × 0,5
```

Los costes de estado son cero para `favorable`, uno para `unfavorable` y 0,5
para `unknown`. De este modo, la cobertura no observada permanece neutralmente
incierta, una condición favorable bien cubierta reduce el coste y un dato
desconocido nunca se convierte en evidencia positiva. La incertidumbre se
mantiene además como dimensión separada para que el usuario pueda priorizar la
calidad de la información.

### Adecuación, confianza e incertidumbre

Las tres métricas responden a preguntas diferentes y no se fusionan en una sola
cifra:

```text
contribución_i = peso_normalizado_i × coste_i
coste_total = suma(contribución_i)
adecuación = 1 − coste_total
```

La adecuación queda entre cero y uno y representa el ajuste gradual al perfil,
no una garantía de seguridad. Las rutas que incumplen restricciones críticas se
excluyen del ranking con independencia de esta cifra.

La confianza inicial es la media de la cobertura de los once atributos
temáticos cuyo estado es conocido. Un atributo `unknown` aporta confianza cero,
aunque conserve cobertura parcial, porque su estado no se ha podido determinar.
Esta aproximación no pondera todavía la fiabilidad relativa de cada proveedor;
esa calibración corresponde a la integración y evaluación con datos reales.

La incertidumbre continúa siendo la proporción de atributos temáticos marcados
como desconocidos. Por ello, confianza e incertidumbre no son necesariamente
complementarias: una ruta sin atributos desconocidos puede seguir teniendo
confianza menor que uno si la cobertura de los datos conocidos es parcial.

### Ranking y explicación estructurada

Las rutas con violaciones críticas se separan antes de ordenar. Las restantes se
clasifican por mayor adecuación y, en caso de empate, por mayor confianza, menor
incertidumbre, menor distancia y finalmente por identificador estable. Este
último criterio no tiene significado para el usuario; garantiza resultados
reproducibles.

Cada explicación conserva la dimensión, el coste de la ruta, la contribución
ponderada y, cuando existen otras alternativas aceptadas, su ventaja frente al
coste medio de las demás. Solo se consideran dimensiones con peso activo. Los
avisos se generan directamente a partir de evidencias `unknown` o `unfavorable`
y conservan atributo, estado, cobertura y nota original.

La capa de presentación traducirá estas estructuras a español mediante
plantillas deterministas. De esta manera, la interfaz visual, TalkBack y TTS
compartirán la misma fuente y no podrán describir una ventaja o una limitación
que no aparezca en el cálculo.

## Pruebas

- Escalones confirmados con prohibición descartan la ruta.
- Un atributo desconocido nunca mejora el índice.
- Cambiar pesos produce el orden esperado.
- Los pesos normalizados son no negativos y suman uno.
- Las explicaciones coinciden con los términos del cálculo.

## Resultados

La validación técnica del escenario sintético produce, con el perfil
predeterminado:

| Resultado | Adecuación | Confianza | Incertidumbre |
| --- | ---: | ---: | ---: |
| Alternativa equilibrada | 0,8031 | 0,7541 | 0,0000 |
| Alternativa con cruces más sencillos | 0,7958 | 0,6927 | 0,0909 |
| Alternativa más sencilla de seguir | Excluida | — | — |

La tercera alternativa se excluye por evidencia confirmada de cruces
incompatibles con la restricción predeterminada. Si se desactiva esa restricción
y solo se pondera la distancia, la ruta más corta pasa a la primera posición.
Si solo se pondera la carga de cruces, la alternativa con cruces más sencillos
pasa a ser la recomendada. Estos resultados prueban el funcionamiento técnico
del perfil y no constituyen todavía una evaluación con datos reales o usuarios.

La suite completa alcanza 41 pruebas y verifica límites, restricciones,
normalización, `unknown` sin beneficio, trazabilidad de contribuciones,
personalización del orden, avisos y serialización reproducible.

## Riesgos y limitaciones

- Las escalas fijas iniciales requieren análisis de sensibilidad y calibración.
- Una fórmula interpretable no elimina sesgos de cobertura de OSM.
- La confianza inicial no pondera todavía la fiabilidad relativa de las fuentes.
- Los resultados actuales proceden de *fixtures* sintéticos.

## Texto base para la memoria

El recomendador se formula como un sistema multicriterio explicable precedido
por restricciones simbólicas. Esta separación impide compensar una barrera
crítica con ventajas en distancia. Los costes se normalizan mediante escalas
fijas, se ponderan según el perfil y producen una adecuación trazable hasta cada
término. Confianza e incertidumbre se calculan de forma independiente a partir
de estado y cobertura. Las razones y los avisos conservan las variables del
cálculo, lo que permite que interfaz, TalkBack y TTS compartan explicaciones
fieles.

## Trabajo pendiente

- [x] Implementar restricciones críticas.
- [x] Definir normalización de costes.
- [x] Implementar adecuación, confianza, explicaciones y ranking.
- [ ] Ejecutar análisis de sensibilidad.
- [ ] Calibrar costes y confianza con rutas reales enriquecidas.
