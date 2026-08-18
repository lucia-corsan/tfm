# 7. Conclusiones y trabajo futuro

Estado: `En implementación`
Última actualización: 18 de agosto de 2026.

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

El análisis de sensibilidad evita una conclusión excesiva: el aprendizaje
mejoró declaraciones sintéticas imprecisas, pero perjudicó las que ya contenían
un 75 % o un 100 % de la preferencia latente. La aportación no es un sustituto
universal del cuestionario, sino un mecanismo opcional de corrección gradual
que requiere control de la persona y una activación conservadora.

## Contribuciones

- Modelo de accesibilidad con incertidumbre explícita.
- Clasificación multicriterio explicable.
- Aprendizaje mediante comparaciones pareadas, seguro, acotado y evaluado sobre
  perfiles sintéticos, integrado de forma opcional y local en la app.
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

## Trabajo futuro

- Más áreas y usuarios.
- Estudios con participantes y evaluación longitudinal.
- Valhalla u otro motor autoalojado.
- Ubicación en segundo plano si se justifica.
- VLM como experimento separado con un sistema de referencia y métricas.
- Análisis de preferencias que cambian según el contexto.

## Fuente interna

- [Limitaciones](../evaluation/limitaciones.md).
- [Resultados](../evaluation/resultados.md).
- [Interpretación de la transferencia del aprendizaje](../evaluation/evaluacion-aprendizaje-rutas-reales.md#interpretación-detallada-para-la-memoria-y-la-defensa).
- [Journal](../journal.md).
