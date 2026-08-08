# 3. Metodología

Estado: `En implementación`  
Última actualización: 8 de agosto de 2026.

## Diseño general

Desarrollo iterativo mediante incrementos funcionales verticales pequeños,
modelos validados, *fixtures* reproducibles y transición posterior a rutas
reales.

## Selección del área piloto

La disponibilidad de atributos OSM y cobertura Mapillary se analizó mediante
una malla en el interior de la M-30. El corredor
Moncloa–Argüelles–Príncipe Pío se seleccionó por cobertura, heterogeneidad
urbana e interés para comparar alternativas.

## Modelado de datos

Perfil con restricciones separadas de preferencias, evidencia favorable,
desfavorable o desconocida y rutas con incertidumbre explícita.

## Diseño experimental

Comparación de la ruta más corta, la clasificación estática y la clasificación
adaptativa mediante *fixtures*, perfiles sintéticos y rutas reales almacenadas
en caché.

## Reproducibilidad

Entornos fijados, cachés, *fixtures*, pruebas automatizadas y registro de
experimentos y limitaciones.

## Fuentes internas

- [Selección del área piloto](../research/seleccion-area-piloto.md).
- [Modelo de dominio](../research/modelo-dominio-accesibilidad.md).
- [Plan de evaluación](../evaluation/plan-evaluacion.md).
- [Entorno](../operations/entorno-desarrollo.md).
