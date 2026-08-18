# 2. Estado del arte

Estado: `En implementación`
Última actualización: 17 de agosto de 2026.

## Líneas que deben cubrirse

- Cálculo de rutas peatonales y accesibles.
- Personalización y recomendación multicriterio.
- Preferencias mediante comparaciones pareadas y aprendizaje en línea.
- Incertidumbre y datos faltantes en sistemas geoespaciales.
- Explicabilidad en sistemas de recomendación.
- Interfaces móviles accesibles, lectores de pantalla y navegación por voz.

## Tecnologías relacionadas

- OpenRouteService y alternativas como Valhalla.
- OpenStreetMap y Overpass.
- Mapillary como evidencia visual auxiliar.
- TalkBack y TTS en Android.

## Hueco que aborda el TFM

Combinar restricciones simbólicas, incertidumbre explícita, clasificación
personalizada y aprendizaje local de preferencias en una experiencia móvil
accesible y evaluable.

## Fundamentos del componente de aprendizaje

Bradley y Terry (1952) formalizaron probabilidades de preferencia a partir de
comparaciones entre dos elementos. *RankNet* mostró posteriormente cómo una
pérdida logística sobre pares puede optimizarse mediante gradiente para aprender
un orden. El TFM adopta esta idea, pero aprende coeficientes de características
de ruta en vez de una puntuación fija por alternativa; por ello se describe como
un modelo logístico lineal por comparaciones pareadas.

La actualización después de cada elección se relaciona con el aprendizaje en
línea y la aproximación estocástica. La proyección posterior mantiene el vector
en un conjunto permitido —pesos no negativos que suman uno—. La aportación del
proyecto no consiste en inventar estos métodos, sino en integrarlos de forma
explicable y acotada con restricciones críticas, incertidumbre explícita y una
interfaz accesible de rutas peatonales.

Las referencias completas y la formulación aplicada se recogen en
[Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md).

## Fuentes internas

- [Estrategia de IA](../ai-strategy.md).
- [ORS, OSM y Mapillary](../research/fuentes-ors-osm-mapillary.md).
- [Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md).
- [Referencias pendientes](referencias-pendientes.md).
