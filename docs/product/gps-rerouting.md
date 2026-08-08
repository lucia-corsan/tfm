# GPS en primer plano y rerouting confirmado

Estado: `Vigente`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `product`

## Problema que resuelve

Mantener una navegación útil cuando la persona se separa de la geometría
recomendada, evitando reaccionar a una única medición GPS imprecisa.

## Requisitos

- GPS únicamente mientras la navegación esté abierta.
- Ignorar muestras con precisión peor de 25 metros.
- Posible desviación a más de 30 metros de la ruta.
- Tres muestras consecutivas durante al menos 10 segundos.
- Confirmación antes de solicitar una nueva ruta.
- Periodo inicial de 60 segundos sin nuevas alertas tras recalcular.
- Conservar la ruta anterior ante errores de ORS.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Rerouting automático | Menor interacción | Puede reaccionar a ruido y sorprender | Descartada |
| Confirmación explícita | Control y seguridad | Añade una interacción | Adoptada |
| GPS en segundo plano | Continuidad con pantalla apagada | Mayor complejidad y privacidad | Fuera del MVP |

## Decisión adoptada

La app utilizará `expo-location` y `watchPositionAsync` en primer plano. Un
detector TypeScript puro acumulará muestras fiables y solicitará confirmación
cuando se cumplan todos los umbrales.

## Justificación

La confirmación reduce falsos reroutings y mantiene a la persona informada de
qué coordenada se enviará al backend. El GPS y el rerouting son tecnologías
deterministas auxiliares; no constituyen la aportación de IA del TFM.

## Datos de entrada y salida

Entrada: posición, precisión, instante y geometría activa. Salida: estado
`on_route`, `possible_deviation` o `confirmation_required`.

## Implementación

Pendiente para la semana 3. La especificación completa se conserva en
[el alcance del MVP](alcance-mvp.md#12-gps-y-rerouting).

## Pruebas

- Muestra aislada o imprecisa sin alerta.
- Tres muestras fiables fuera de ruta con confirmación.
- Rechazo que conserva la ruta.
- Error externo que conserva la navegación anterior.
- Comparación de umbrales de 20, 30 y 40 metros.

## Resultados

Pendiente.

## Riesgos y limitaciones

- Cañones urbanos y túneles degradan la precisión.
- La geometría de la ruta también puede contener imprecisiones.
- No habrá ubicación con pantalla apagada en el MVP.

## Texto base para la memoria

El rerouting se diseñó como un mecanismo conservador basado en evidencia
temporal y confirmación explícita. Esta decisión prioriza la estabilidad y el
control del usuario frente a la reacción inmediata a una muestra GPS ruidosa.

## Trabajo pendiente

- [ ] Implementar el detector puro.
- [ ] Integrar permisos y GPS.
- [ ] Implementar el endpoint de rerouting.
- [ ] Ejecutar recorridos simulados y controlados.
