# Plan de evaluación académica

Estado: `Vigente`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `evaluation`

## Preguntas de evaluación

1. ¿La clasificación explicable selecciona alternativas más acordes con el perfil que
   la ruta más corta?
2. ¿El aprendizaje por pares (*pairwise*) recupera preferencias sintéticas mejor que los
   pesos fijos?
3. ¿Las reglas mantienen cero violaciones críticas?
4. ¿La incertidumbre y las explicaciones reflejan el cálculo real?
5. ¿El detector de desviación evita reaccionar a ruido GPS aislado?

## Sistemas de referencia

1. Ruta más corta.
2. Clasificación fija basada en preferencias declaradas.
3. Clasificación adaptativa basada en elecciones observadas.

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

## Conjuntos de prueba

- *Fixtures* deterministas del área piloto.
- Perfiles sintéticos con preferencias conocidas.
- Respuestas reales de ORS almacenadas en caché.
- Recorridos GPS simulados y, si es viable, controlados físicamente.

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

## Riesgos

Los perfiles sintéticos permiten reproducibilidad, pero no demuestran utilidad
con población real. Esta limitación se declarará y, si es posible, se
complementará con una prueba de usabilidad controlada y no clínica.

## Trabajo pendiente

- [ ] Fijar los conjuntos de datos y las semillas aleatorias.
- [ ] Definir umbrales cuantitativos de éxito.
- [ ] Preparar scripts reproducibles.
- [ ] Aprobar el protocolo de prueba física.
