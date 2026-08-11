# Plan de evaluación académica

Estado: `Vigente`  
Última actualización: 10 de agosto de 2026
Responsabilidad principal: `evaluation`

## Preguntas de evaluación

1. ¿La clasificación explicable selecciona alternativas más acordes con el perfil que
   la ruta más corta?
2. ¿El aprendizaje por pares (*pairwise*) recupera preferencias sintéticas mejor que los
   pesos fijos?
3. ¿Las reglas mantienen cero violaciones críticas?
4. ¿La incertidumbre y las explicaciones reflejan el cálculo real?
5. ¿El detector de desviación evita reaccionar a ruido GPS aislado?
6. ¿Una colección ampliada proporciona más rutas distintas y compatibles que
   las tres alternativas de una única petición ORS?
7. ¿El beneficio de ampliar candidatas compensa la latencia y las peticiones
   adicionales?

## Sistemas de referencia

1. Ruta más corta.
2. Clasificación fija basada en preferencias declaradas.
3. Clasificación adaptativa basada en elecciones observadas.
4. Generación ORS de hasta tres rutas frente a generación escalonada y
   deduplicada.

## Métricas

- Coincidencia con la ruta preferida y precisión de elecciones.
- Arrepentimiento acumulado (*regret*).
- Evolución, estabilidad y convergencia de pesos.
- Interacciones necesarias hasta estabilizarse.
- Distancia adicional asumida.
- Incertidumbre de la alternativa seleccionada.
- Violaciones críticas, cuyo objetivo es cero.
- Fidelidad de razones y avisos al cálculo.
- Sensibilidad a umbrales y pesos.
- Falsos positivos y negativos del detector de desviación.
- Rutas crudas y únicas, solapamiento geométrico y candidatas compatibles.
- Casos sin alternativa compatible y mejor adecuación disponible.
- Peticiones externas, latencia en frío y tiempo con caché.
- Sensibilidad del coste de orientación a instrucciones y giros.
- Exactitud, precisión, sensibilidad y falsos positivos de la deduplicación
  espacial.

## Conjuntos de prueba

- *Fixtures* deterministas del área piloto.
- Perfiles sintéticos con preferencias conocidas.
- Respuestas reales de ORS almacenadas en caché.
- Recorridos GPS simulados y, si es viable, controlados físicamente.
- Doce pares origen-destino fijos del área piloto para comparar la generación
  básica y la ampliada.
- Diez pares sintéticos preetiquetados para calibrar la deduplicación, que se
  ampliarán con pares reales revisados.

## Protocolo

Cada experimento se registrará en `experimentos.md` antes de ejecutarse. Debe
fijar la versión de los datos, los parámetros, la semilla aleatoria cuando corresponda, el sistema de referencia y el criterio
de éxito. Los resultados numéricos se trasladarán a `resultados.md` sin borrar
los fallos o ejecuciones descartadas.

## Criterios de aceptación

- `unknown` nunca mejora el índice.
- Una violación crítica confirmada elimina la alternativa.
- Pesos no negativos y normalizados.
- Cero violaciones críticas en todos los sistemas personalizados de referencia.
- Explicaciones fieles a características efectivamente utilizadas.
- Rerouting solo tras confirmación.
- La ampliación de candidatas nunca relaja restricciones críticas.
- La respuesta pública contiene como máximo tres rutas aunque la colección
  interna sea mayor.
- La deduplicación espacial debe mantener cero falsos positivos en su banco de
  calibración y registrar cada descarte.

## Riesgos

Los perfiles sintéticos permiten reproducibilidad, pero no demuestran utilidad
con población real. Esta limitación se declarará y, si es posible, se
complementará con una prueba de usabilidad controlada y no clínica.

La ausencia de una enumeración completa de caminos impide medir una tasa de
recuperación (*recall*) real de candidatas. Se evaluarán diversidad observada,
disponibilidad después de restricciones y coste, sin afirmar exhaustividad.

## Trabajo pendiente

- [ ] Fijar los conjuntos de datos y las semillas aleatorias.
- [ ] Definir umbrales cuantitativos de éxito.
- [ ] Preparar scripts reproducibles.
- [ ] Aprobar el protocolo de prueba física.
- [ ] Ejecutar `EXP-005` para comparar tres rutas con la colección ampliada.
- [x] Ejecutar `EXP-005A` y conservar todas sus configuraciones y predicciones.
