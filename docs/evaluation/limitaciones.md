# Limitaciones y amenazas a la validez

Estado: `En implementación`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `evaluation`

## Datos

- OSM presenta cobertura desigual; una etiqueta ausente no equivale a ausencia
  física.
- Mapillary puede no cubrir un tramo o estar desactualizado.
- La zona piloto no representa toda la diversidad urbana de Madrid.
- Los *fixtures* son sintéticos y solo validan un comportamiento controlado.

## Modelo

- La selección de atributos y pesos iniciales incorpora decisiones de diseño.
- El porcentaje temático de incertidumbre trata inicialmente cada dimensión por
  igual.
- Un modelo interpretable no elimina el sesgo de la fuente de datos.
- El aprendizaje con pocas elecciones puede ser inestable.

## Evaluación

- Los perfiles sintéticos no sustituyen participantes reales.
- Una prueba física limitada no permite generalizar a todas las personas ciegas
  o con baja visión.
- Las métricas obtenidas sin conexión no capturan completamente la confianza, la carga cognitiva ni la
  experiencia durante un desplazamiento.

## Tecnología

- ORS, GPS y red pueden fallar o cambiar su comportamiento.
- El emulador no reproduce toda la variabilidad de sensores de un dispositivo
  real.
- El MVP se limita a Android y GPS en primer plano.

## Mitigaciones

- Estados desconocidos explícitos y avisos.
- Caché y *fixtures* reproducibles.
- Análisis de sensibilidad.
- Sistemas de referencia diferenciados.
- Registro completo de experimentos y fallos.
- Lenguaje que evita afirmar accesibilidad absoluta.
