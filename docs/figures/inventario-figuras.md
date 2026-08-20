# Inventario de figuras y tablas

Estado: `En implementación`  
Última actualización: 18 de agosto de 2026.

| ID | Contenido | Capítulo | Estado | Archivo final |
| --- | --- | --- | --- | --- |
| FIG-01 | Flujo de selección del área piloto | Metodología | Diseñada | Pendiente |
| FIG-02 | Cobertura OSM, Mapillary e idoneidad por zona | Metodología | Generada | `outputs/` |
| FIG-03 | Arquitectura del MVP | Diseño | Pendiente | — |
| FIG-04 | Flujo ORS → OSM → puntuación | Diseño | Pendiente | — |
| FIG-05 | Separación restricciones/preferencias | Diseño | Pendiente | — |
| FIG-06 | Comparación de tres rutas en la aplicación | Implementación | Pendiente | — |
| FIG-07 | Exactitud según elecciones observadas | Evaluación | Generada | `docs/figures/aprendizaje-exactitud.png` |
| FIG-08 | Arrepentimiento acumulado según elecciones observadas | Evaluación | Generada | `docs/figures/aprendizaje-arrepentimiento.png` |
| FIG-09 | Sensibilidad de umbrales GPS | Evaluación | Pendiente | — |
| FIG-10 | Transferencia del aprendizaje a rutas ORS enriquecidas con OSM | Evaluación | Generada | `docs/figures/aprendizaje-rutas-reales.png` |
| FIG-11 | Cantidad de elecciones frente a capacidad informativa | Evaluación | Generada | `docs/figures/capacidad-informativa-aprendizaje.png` |

## Requisitos gráficos

- Paleta coherente y contraste suficiente.
- No depender solo del color.
- Tipografía legible y textos breves.
- SVG o PDF cuando sea posible; PNG a 300 dpi cuando se exija.
- Fuente y elaboración indicadas en el pie.

Las figuras 7 y 8 comparten la misma escala horizontal, paleta y símbolos. Las
líneas se distinguen mediante color y marcador, por lo que la lectura no depende
solo del color. La zona sombreada de las tres primeras elecciones identifica el
periodo de observación en el que el aprendizaje todavía no cambia el orden.

La figura 10 conserva los mismos colores y marcadores conceptuales, pero usa un
título explícito para que el resultado negativo pueda entenderse sin asumir que
toda adaptación mejora necesariamente el sistema fijo.

La figura 11 utiliza dos paneles con la misma escala: la izquierda muestra el
fallo de una regla basada solo en cantidad y la derecha añade variedad y
contraste. El desplazamiento mínimo de los marcadores evita ocultar dos series
cuando sus valores coinciden.

## Fuente del flujo metodológico

La descripción histórica de los paneles se conserva en
[selección del área piloto](../research/seleccion-area-piloto.md#propuesta-de-representación-visual-del-proceso).
