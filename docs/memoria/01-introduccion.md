# 1. Introducción

Estado: `En implementación`  
Última actualización: 8 de agosto de 2026.

## Motivación

La ruta peatonal más corta no tiene por qué ser la más adecuada para una persona
ciega o con baja visión. La disponibilidad desigual de datos añade un segundo
problema: la falta de información no puede interpretarse como ausencia de
barreras.

## Problema

Diseñar una aplicación Android que compare rutas según preferencias personales,
exponga incertidumbre y aprenda gradualmente sin comprometer restricciones de
seguridad.

## Objetivo general

Desarrollar y evaluar un MVP con funcionamiento prioritariamente local
(*local-first*) de recomendación peatonal accesible y
explicable para un área piloto de Madrid.

## Objetivos específicos pendientes de consolidar

- Formalizar perfiles y evidencia trivaluada.
- Generar y enriquecer rutas reales.
- Implementar la puntuación y el aprendizaje adaptativo.
- Proporcionar navegación accesible y rerouting confirmado.
- Evaluar valor añadido, seguridad y explicabilidad.

## Alcance

Android, Python 3.9, GPS en primer plano y corredor
Moncloa–Argüelles–Príncipe Pío. Quedan fuera iOS, ubicación en segundo plano,
LLM/VLM en producción y afirmaciones absolutas de accesibilidad.

## Fuentes internas

- [Alcance del MVP](../product/alcance-mvp.md).
- [Especificación de accesibilidad](../accessibility-spec.md).
- [Seguridad](../safety.md).
