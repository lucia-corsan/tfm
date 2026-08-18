# Limitaciones y amenazas a la validez

Estado: `En implementación`  
Última actualización: 18 de agosto de 2026
Responsabilidad principal: `evaluation`

## Datos

- OSM presenta cobertura desigual; una etiqueta ausente no equivale a ausencia
  física.
- Mapillary puede no cubrir un tramo o estar desactualizado.
- La zona piloto no representa toda la diversidad urbana de Madrid.
- Los *fixtures* son sintéticos y solo validan un comportamiento controlado.
- Las rutas devueltas por ORS son candidatas, no una enumeración de todos los
  caminos posibles. Una alternativa útil puede quedar fuera antes del ranking.
- La instantánea OSM refleja el corredor y la fecha base seleccionados; no
  generaliza a toda Madrid ni resuelve automáticamente el lado de marcha.
- Una relación de proximidad no demuestra que un elemento pertenezca a la acera
  o al ramal exacto utilizados. El filtro estricto reduce el riesgo en barreras
  críticas, pero no resuelve por completo la topología peatonal.
- ORS y la evidencia local comparten OSM como fuente de base; su alineación
  espacial no constituye una validación independiente.

## Modelo

- La selección de atributos y pesos iniciales incorpora decisiones de diseño.
- El porcentaje temático de incertidumbre trata inicialmente cada dimensión por
  igual.
- Un modelo interpretable no elimina el sesgo de la fuente de datos.
- El aprendizaje con pocas elecciones puede ser inestable.
- En `EXP-002`, la mejora empieza después de 5–10 elecciones, pero el primer
  punto que permanece próximo al resultado final presenta una mediana de 60,
  que es también el último punto medido. No demuestra convergencia y el MVP no
  debe prometer adaptación inmediata.
- La influencia máxima del 50 % protege las preferencias declaradas, aunque
  también limita la corrección de un cuestionario inicial muy impreciso.
- La configuración de `EXP-002` se calibró con un 25 % de señal declarada. La
  sensibilidad confirma que ayuda ante perfiles imprecisos, pero empeora el
  orden cuando la declaración sintética ya contiene un 75 % o un 100 % de la
  preferencia latente. El aprendizaje debe seguir siendo opcional y reversible.
- Varios vectores de pesos pueden ordenar igual las rutas observadas. Una buena
  exactitud no identifica necesariamente la preferencia verdadera de forma
  única.
- Un ranking solo puede elegir entre las rutas recuperadas; ampliar el conjunto
  no garantiza encontrar el óptimo físico.
- El número de instrucciones y giros es una aproximación a la complejidad de
  orientación, no una medida directa de carga cognitiva.

## Evaluación

- Los perfiles sintéticos no sustituyen participantes reales.
- El simulador de `EXP-002` genera las elecciones con la misma familia lineal
  que aprende el modelo. Esto permite comprobar la implementación, pero favorece
  al sistema adaptativo y no demuestra rendimiento ante relaciones no lineales.
- Los costes sintéticos de `EXP-002` se generan sin las correlaciones propias de
  rutas ORS enriquecidas con OSM. Sus perfiles son instrumentos matemáticos, no
  categorías clínicas ni representaciones de toda la población objetivo.
- Los intervalos de `EXP-002` se calculan sobre veinte medias agrupadas por
  semilla, porque los cuatro perfiles comparten las rutas de cada semilla.
  Describen variabilidad sintética y no permiten inferir un efecto poblacional
  en personas usuarias.
- Una elección real puede depender del destino, la hora, la familiaridad o un
  motivo temporal. El experimento supone preferencias estables durante 60
  interacciones.
- Una prueba física limitada no permite generalizar a todas las personas ciegas
  o con baja visión.
- Las métricas obtenidas sin conexión no capturan completamente la confianza, la carga cognitiva ni la
  experiencia durante un desplazamiento.
- Sin una verdad de referencia de todas las rutas razonables no puede medirse
  una tasa de recuperación (*recall*) exhaustiva; se medirá diversidad y
  disponibilidad observada.
- La calibración espacial utiliza diez pares sintéticos y etiquetas de diseño;
  su 100 % de exactitud no estima el rendimiento general sobre rutas reales.
- La calibración del corredor OSM utiliza tres rutas de una única pareja
  origen-destino. La selección de 5 m necesita revisión manual y repetición en
  otros trayectos antes de generalizarse.
- La calibración del detector utiliza trece secuencias sintéticas y una ruta
  recta. Sus etiquetas son supuestos de diseño, no observaciones
  representativas de teléfonos, personas o calles reales.
- El aumento cuantitativo de elementos al ampliar el corredor es compatible con
  la incorporación de calles vecinas, pero no demuestra la pertenencia de cada
  objeto. Esa interpretación exige revisar topología, etiquetas y contexto.
- `EXP-007` fijó doce pares, pero solo cuatro de aprendizaje y tres reservados
  conservaron al menos dos alternativas aceptadas. Una sola ruta puede cambiar
  la exactitud en 33,3 puntos dentro de una partición por perfil.
- Las veinte semillas de `EXP-007` reutilizan las mismas rutas reales: solo
  cambian el orden y las elecciones inconsistentes. No equivalen a veinte
  muestras independientes del viario.
- Todos los perfiles latentes prefirieron la misma ruta en cada par de
  aprendizaje apto. El modelo no recibió ejemplos que identificaran sus
  diferencias, aunque sí hubiera variación numérica en algunos costes.
- Orientación y pendiente fueron constantes en las 24 rutas aceptadas de
  `EXP-007`; sus pesos no son identificables con este conjunto.
- El 100 % obtenido por los pesos fijos en tres pares reservados es un efecto
  techo de una muestra pequeña, no una estimación de eficacia sobre el área.
- Una respuesta ORS de `EXP-007` contenía referencias fuera de la geometría. Se
  conservó como incidencia y se excluyó sin rebajar la validación.

## Tecnología

- ORS, GPS y red pueden fallar o cambiar su comportamiento.
- El emulador no reproduce toda la variabilidad de sensores de un dispositivo
  real.
- El umbral de 30 m fue el mejor entre 20, 30 y 40 m en `EXP-003`, pero los
  25 m de precisión, las tres muestras, los diez segundos y los 60 segundos de
  espera siguen siendo valores iniciales. El banco sintético no demuestra su
  idoneidad para todos los entornos y dispositivos.
- El recálculo automático selecciona la primera ruta aceptada después de una
  confirmación explícita. Reduce la carga de interacción, pero limita la
  posibilidad de comparar de nuevo todas las alternativas durante la marcha.
- El MVP se limita a Android y GPS en primer plano.

## Mitigaciones

- Estados desconocidos explícitos y avisos.
- Caché y *fixtures* reproducibles.
- Comparación entre generación básica y ampliada, con deduplicación y límites de
  coste.
- Umbrales espaciales conservadores, registro de descartes y ampliación prevista
  con pares reales revisados.
- Corredor general de 5 m y confirmación independiente de barreras críticas a
  0,5 m, con al menos 3 m de alineación para vías.
- Análisis de sensibilidad.
- Sistemas de referencia diferenciados.
- Separación entre calibración y evaluación final, semillas nuevas y un cuarto
  perfil no usado para seleccionar hiperparámetros.
- Comparación emparejada sobre los mismos conjuntos de rutas y publicación de
  resultados por ejecución, incluidos los casos donde el adaptativo empeora.
- Registro completo de experimentos y fallos.
- Lenguaje que evita afirmar accesibilidad absoluta.
