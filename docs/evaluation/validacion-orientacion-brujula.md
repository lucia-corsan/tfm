# Validación de la comprobación de orientación

Estado: `En implementación`
Última actualización: 23 de agosto de 2026
Responsabilidad principal: `evaluation`

## Objetivo

Comprobar por separado tres preguntas:

1. ¿El cálculo clasifica correctamente lecturas controladas?
2. ¿El sensor de un teléfono real produce resultados estables en el área piloto?
3. ¿Los mensajes y canales ayudan a personas ciegas o con baja visión sin
   transmitir una seguridad excesiva?

La primera pregunta está cubierta automáticamente. Las dos restantes requieren
pruebas físicas y, para la tercera, participantes; no se infieren a partir del
emulador.

## Hipótesis y métricas

| Hipótesis | Métrica | Criterio inicial |
| --- | --- | --- |
| Las lecturas estables permiten reconocer alineación | Exactitud por clase frente a una dirección de referencia | Se informará con matriz de confusión e intervalo de confianza |
| El filtro reduce decisiones inestables | Proporción de comprobaciones sin resultado y tiempo hasta respuesta | No fijado hasta el piloto físico |
| El umbral evita correcciones innecesarias | Falsos mensajes de ajuste cuando el teléfono está alineado | Prioridad: minimizar falsos ajustes |
| La salida es comprensible | Comprensión de izquierda, derecha, alineación e incertidumbre | Se medirá por tarea, no solo por opinión |
| La función no oculta riesgos | Número de participantes que interpretan «alineado» como «seguro para avanzar» | Objetivo: cero; cualquier caso obliga a revisar el texto |

## Experimento automático completado

Se prueban los cuatro rumbos cardinales, el paso circular por 0°, las cinco
clases de respuesta, las lecturas imprecisas, la dispersión y el final de la
geometría. También se simula el ciclo del sensor: inactivo antes del botón,
activo durante la comprobación, cerrado tras tres lecturas o al cambiar de
instrucción y limitado a ocho segundos.

El canal de salida se prueba de forma independiente. Con TalkBack activo se
utiliza `announceForAccessibility` y no arranca TTS. Sin TalkBack, TTS utiliza
`es-ES` y la velocidad local si la voz propia está habilitada. Todos los
resultados completados generan el mismo pulso de 100 ms.

## Protocolo físico pendiente

### Preparación

- Teléfono Android real con brújula, versión de sistema y modelo registrados.
- Ruta peatonal conocida dentro del área piloto.
- Cuatro puntos de parada sin riesgo y con dirección de referencia obtenida de
  la geometría.
- Una condición abierta y otra próxima a elementos que puedan perturbar el
  magnetómetro, sin colocar a la persona en peligro.

### Procedimiento

1. Colocar el teléfono horizontal y apuntando aproximadamente hacia el tramo.
2. Ejecutar diez comprobaciones en 0°, ±20°, ±30°, ±60° y ±90° respecto de la
   dirección de referencia.
3. Repetir con umbrales de alineación de 20°, 25° y 30°, conservando el filtro
   de precisión y estabilidad.
4. Registrar clase esperada, clase observada, tiempo hasta resultado y ausencia
   de resultado; no registrar una traza GPS personal.
5. Repetir un subconjunto en la condición con interferencia potencial.
6. Confirmar que el botón puede alcanzarse con TalkBack y que el anuncio no se
   duplica con TTS.

### Análisis previsto

- Matriz de confusión por umbral.
- Exactitud equilibrada por clase.
- Tasa de falsos mensajes de alineación y de corrección.
- Mediana y rango intercuartílico del tiempo de respuesta.
- Proporción de comprobaciones sin resultado.
- Comparación descriptiva entre entorno abierto y posible interferencia.

No se elegirá el umbral que maximice únicamente la exactitud global. Un falso
mensaje de alineación tiene más importancia que una solicitud de repetir la
comprobación, por lo que la selección priorizará prudencia y estabilidad.

## Evaluación con usuarios pendiente

Las tareas propuestas son: localizar el control, solicitar una comprobación,
interpretar cada tipo de mensaje, girar y repetir. Se observarán éxito, tiempo,
repeticiones, errores de izquierda/derecha, carga percibida y comentarios. El
protocolo debe preguntar explícitamente qué significa para la persona «el
teléfono apunta aproximadamente», para detectar si se confunde con ausencia de
obstáculos o permiso para avanzar.

Los patrones direccionales de vibración y los avisos automáticos quedan fuera de
la prueba inicial. Solo se estudiarán si las personas participantes los
consideran útiles y después de definir un aprendizaje seguro de esos patrones.

## Resultados actuales y límites de la evidencia

La validación automática confirma la coherencia del software y la ausencia de
superposición intencionada entre TalkBack y TTS. No hay todavía resultados sobre
exactitud física, magnetómetros de distintos modelos, uso caminando ni
comprensión por usuarios. Presentar esos aspectos como validados constituiría
una extrapolación no respaldada.

## Referencias

- [Especificación e implementación de la funcionalidad](../product/orientacion-brujula.md).
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/).
- [Sensores de posición de Android](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position).
