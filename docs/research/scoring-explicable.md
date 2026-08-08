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

## Justificación

El enfoque permite auditar cada recomendación, construir baselines académicos y
mantener las reglas críticas fuera del aprendizaje adaptativo.

## Datos de entrada y salida

Entrada: `MobilityProfile` y `RouteCandidate`. Salida prevista: aceptación o
descarte, adecuación de 0 a 1, confianza, incertidumbre, razones y avisos.

## Implementación

Los modelos de entrada y los fixtures están validados. Las funciones de
restricciones, normalización y scoring corresponden al día 3.

## Pruebas

- Escalones confirmados con prohibición descartan la ruta.
- Un atributo desconocido nunca mejora el índice.
- Cambiar pesos produce el orden esperado.
- Los pesos normalizados son no negativos y suman uno.
- Las explicaciones coinciden con los términos del cálculo.

## Resultados

Pendiente.

## Riesgos y limitaciones

- La normalización puede depender del conjunto de alternativas.
- Una fórmula interpretable no elimina sesgos de cobertura de OSM.
- Los umbrales deberán justificarse y someterse a sensibilidad.

## Texto base para la memoria

El recomendador se formula como un sistema multicriterio explicable precedido
por restricciones simbólicas. Esta separación impide compensar una barrera
crítica con ventajas en distancia y permite mostrar por separado adecuación,
confianza e incertidumbre.

## Trabajo pendiente

- [ ] Implementar restricciones críticas.
- [ ] Definir normalización de costes.
- [ ] Implementar adecuación, confianza y explicaciones.
- [ ] Ejecutar análisis de sensibilidad.
