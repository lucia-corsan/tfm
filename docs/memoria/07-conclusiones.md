# 7. Conclusiones y trabajo futuro

Estado: `En implementación`
Última actualización: 25 de agosto de 2026.

## Respuesta a los objetivos

El resultado sintético central indica que el aprendizaje aporta información
adicional al cuestionario: con un 10 % de elecciones inconsistentes, la
exactitud aumentó del 78,64 % al 89,05 % y el arrepentimiento medio descendió de
0,00902 a 0,00238. La ventaja se mantuvo con un 20 % de ruido y en un perfil no
utilizado para calibrar. Estos resultados validan el núcleo algorítmico, no su
eficacia con personas ni la accesibilidad física de las rutas.

La evaluación posterior con costes de rutas ORS enriquecidas con OSM no
reprodujo esa mejora. En tres pares reservados aptos, los pesos fijos obtuvieron
100 % de primeras posiciones y el adaptativo, 75 % tras 60 elecciones. Los
cuatro perfiles habían elegido la misma alternativa en todos los pares de
aprendizaje aptos y dos dimensiones permanecían constantes. El resultado no
invalida la implementación, pero demuestra que la adaptación necesita ejemplos
con compensaciones informativas y que un resultado sintético positivo no basta
para prometer transferencia.

Como respuesta metodológica se añadió un diagnóstico de capacidad informativa.
Contar ocho elecciones aceptaba tanto el banco sintético como el real limitado;
comprobar además variedad, contraste, dimensiones activas y rango aceptó el
100 % del primero y rechazó el 100 % del segundo desde ocho hasta sesenta
elecciones. El diagnóstico explica por qué repetir interacciones no resuelve la
falta de señal. Se mantiene, no obstante, como instrumento experimental: la
separación se obtuvo sobre dos bancos contrastados y no justifica todavía una
activación automática en el producto.

El análisis de sensibilidad evita una conclusión excesiva: el aprendizaje
mejoró declaraciones sintéticas imprecisas, pero perjudicó las que ya contenían
un 75 % o un 100 % de la preferencia latente. La aportación no es un sustituto
universal del cuestionario, sino un mecanismo opcional de corrección gradual
que requiere control de la persona y una activación conservadora.

La evaluación posterior con las catorce preguntas vigentes refuerza ese matiz.
Se conservaron los experimentos anteriores y se añadieron cuatro formularios
completos, dos condiciones de preferencia y dos bancos de rutas. Después de
sesenta elecciones, la adaptación quedó entre 5,67 y 20,83 puntos por debajo
del perfil fijo. En la única condición con una preferencia fina oculta apareció
una mejora transitoria de 0,27 puntos tras cinco elecciones, pero no se mantuvo.
El perfil fijo alcanzó entre 94,07 % y 100 %, de modo que el formulario actual
actúa como una inicialización fuerte dentro de la simulación y deja poco margen
para corregir sin introducir error.

Esto no elimina la contribución de IA ni contradice el resultado positivo con
perfiles imprecisos. Delimita su uso responsable: la clasificación adaptativa
es un mecanismo experimental capaz de aprender, pero no debe ganar influencia
solo porque existan más interacciones. El perfil declarado se conserva como
ancla y cualquier adaptación futura debe demostrar, sobre elecciones
posteriores no usadas para entrenar, que mejora realmente el orden fijo.

## Contribuciones

- Modelo de accesibilidad con incertidumbre explícita.
- Clasificación multicriterio explicable.
- Aprendizaje mediante comparaciones pareadas, seguro, acotado y evaluado sobre
  perfiles sintéticos, integrado de forma opcional y local en la app.
- Diagnóstico explicable de capacidad informativa para diferenciar número de
  interacciones de diversidad útil, todavía desacoplado de la activación.
- Prototipo Android diseñado y auditado con TalkBack.

Estas contribuciones deben ajustarse al trabajo realmente validado al cerrar el
proyecto.

## Limitaciones

El simulador comparte la forma lineal del modelo. `EXP-007` incorporó las
correlaciones de rutas reales, pero solo cuatro pares de aprendizaje y tres
reservados resultaron aptos, todos los perfiles compartieron las etiquetas de
aprendizaje y orientación y pendiente fueron constantes. El primer punto próximo al resultado final
fue el último medido, a las 60 elecciones, por lo que no demuestra convergencia.
Además, la configuración actual puede degradar un perfil declarado que ya sea
preciso. La integración móvil y la persistencia están validadas mediante
pruebas automáticas y una comprobación funcional en Android Emulator, pero la
evaluación longitudinal con elecciones reales y el estudio con participantes
permanecen pendientes.

`EXP-009` utiliza la transformación real del cuestionario, pero las respuestas
y elecciones siguen siendo simuladas. Sus cuatro configuraciones no prueban la
comprensión de las preguntas ni representan la diversidad de la población. El
10 % de inconsistencia es un supuesto de robustez, y las semillas del banco
ORS+OSM reutilizan las mismas calles. Por ello, el resultado justifica una
política conservadora, no una estimación de eficacia poblacional.

El diagnóstico posterior también tiene validez limitada: se evaluó con el
banco sintético diseñado para ser informativo y con un único banco real
reducido. Un umbral conservador puede bloquear preferencias especializadas en
pocas dimensiones, por lo que no se ha integrado como decisión automática.

## Trabajo futuro

- Más áreas y usuarios.
- Estudios con participantes y evaluación longitudinal.
- Valhalla u otro motor autoalojado.
- Ubicación en segundo plano si se justifica.
- VLM como experimento separado con un sistema de referencia y métricas.
- Análisis de preferencias que cambian según el contexto.
- Replicación del diagnóstico de capacidad informativa y validación temporal
  de pesos fijos frente a adaptativos antes de automatizar su influencia.
- Evaluación longitudinal del cuestionario completo con elecciones consentidas
  y separación entre una ventana de aprendizaje y otra de validación.

## Fuente interna

- [Limitaciones](../evaluation/limitaciones.md).
- [Resultados](../evaluation/resultados.md).
- [Interpretación de la transferencia del aprendizaje](../evaluation/evaluacion-aprendizaje-rutas-reales.md#interpretación-detallada-para-la-memoria-y-la-defensa).
- [Diagnóstico de capacidad informativa](../evaluation/diagnostico-capacidad-informativa.md).
- [Evaluación con el cuestionario completo](../evaluation/evaluacion-aprendizaje-cuestionario-real.md).
- [Journal](../journal.md).
