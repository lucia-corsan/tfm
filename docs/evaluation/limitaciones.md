# Limitaciones y amenazas a la validez

Estado: `En implementación`  
Última actualización: 11 de agosto de 2026
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

## Modelo

- La selección de atributos y pesos iniciales incorpora decisiones de diseño.
- El porcentaje temático de incertidumbre trata inicialmente cada dimensión por
  igual.
- Un modelo interpretable no elimina el sesgo de la fuente de datos.
- El aprendizaje con pocas elecciones puede ser inestable.
- Un ranking solo puede elegir entre las rutas recuperadas; ampliar el conjunto
  no garantiza encontrar el óptimo físico.
- El número de instrucciones y giros es una aproximación a la complejidad de
  orientación, no una medida directa de carga cognitiva.

## Evaluación

- Los perfiles sintéticos no sustituyen participantes reales.
- Una prueba física limitada no permite generalizar a todas las personas ciegas
  o con baja visión.
- Las métricas obtenidas sin conexión no capturan completamente la confianza, la carga cognitiva ni la
  experiencia durante un desplazamiento.
- Sin una verdad de referencia de todas las rutas razonables no puede medirse
  una tasa de recuperación (*recall*) exhaustiva; se medirá diversidad y
  disponibilidad observada.
- La calibración espacial utiliza diez pares sintéticos y etiquetas de diseño;
  su 100 % de exactitud no estima el rendimiento general sobre rutas reales.

## Tecnología

- ORS, GPS y red pueden fallar o cambiar su comportamiento.
- El emulador no reproduce toda la variabilidad de sensores de un dispositivo
  real.
- El MVP se limita a Android y GPS en primer plano.

## Mitigaciones

- Estados desconocidos explícitos y avisos.
- Caché y *fixtures* reproducibles.
- Comparación entre generación básica y ampliada, con deduplicación y límites de
  coste.
- Umbrales espaciales conservadores, registro de descartes y ampliación prevista
  con pares reales revisados.
- Análisis de sensibilidad.
- Sistemas de referencia diferenciados.
- Registro completo de experimentos y fallos.
- Lenguaje que evita afirmar accesibilidad absoluta.
