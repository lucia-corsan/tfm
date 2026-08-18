# Índice y convención de la documentación

Última actualización: 18 de agosto de 2026.

## Propósito

Este archivo es la puerta de entrada a la documentación evaluable del TFM. Cada
tema debe tener una única fuente principal; el resto de documentos enlazan esa
fuente en lugar de copiarla. La documentación sanitizada se versiona junto al
código. Solo `docs/private/` permanece local e ignorada y necesita una copia de
seguridad externa.

## Mapa de documentación

### Especificaciones vigentes

- [Arquitectura](architecture.md): componentes y límites del sistema.
- [Accesibilidad](accessibility-spec.md): requisitos de interfaz y datos.
- [Estrategia de IA](ai-strategy.md): aportación académica y baselines.
- [Seguridad](safety.md): invariantes que ningún módulo puede incumplir.
- [Journal](journal.md): cronología breve y enlaces a decisiones.

Estos cinco documentos permanecen en la raíz porque también son las especificaciones
esperadas por `AGENTS.md`.

### Producto y comportamiento

- [Alcance y plan del MVP](product/alcance-mvp.md).
- [Especificación de la API](product/especificacion-api.md).
- [Búsqueda y selección de lugares](product/busqueda-lugares.md).
- [GPS y rerouting](product/gps-rerouting.md).
- [Narración, TalkBack y TTS](product/narracion-talkback-tts.md).

### Investigación y decisiones técnicas

- [Selección del área piloto](research/seleccion-area-piloto.md).
- [Modelo de dominio de accesibilidad](research/modelo-dominio-accesibilidad.md).
- [Scoring explicable](research/scoring-explicable.md).
- [Aprendizaje adaptativo](research/aprendizaje-adaptativo.md).
- [Integración del aprendizaje adaptativo en la aplicación](research/integracion-aprendizaje-adaptativo-app.md).
- [Función de ORS, OSM y Mapillary](research/fuentes-ors-osm-mapillary.md).
- [Integración de OpenRouteService](research/integracion-openrouteservice.md).
- [Preparación de OSM para rutas](research/preparacion-osm-para-rutas.md).
- [Generación y diversidad de rutas candidatas](research/generacion-rutas-candidatas.md).

### Evaluación

- [Plan de evaluación](evaluation/plan-evaluacion.md).
- [Calibración de la deduplicación espacial](evaluation/calibracion-deduplicacion-espacial.md).
- [Calibración del corredor entre rutas y OSM](evaluation/calibracion-corredor-osm.md).
- [Calibración del detector de desviación](evaluation/calibracion-detector-desviacion.md).
- [Calibración y evaluación del aprendizaje adaptativo](evaluation/calibracion-aprendizaje-adaptativo.md).
- [Evaluación del aprendizaje con rutas ORS enriquecidas con OSM](evaluation/evaluacion-aprendizaje-rutas-reales.md).
- [Registro de experimentos](evaluation/experimentos.md).
- [Resultados](evaluation/resultados.md).
- [Limitaciones](evaluation/limitaciones.md).

### Operaciones y reproducibilidad

- [Entorno de desarrollo](operations/entorno-desarrollo.md).
- [Caché y servicios externos](operations/cache-y-servicios-externos.md).
- [Incidencias](operations/incidencias.md).

### Preparación de la memoria

- [Guion y mapa de fuentes](memoria/00-guion.md).
- [Introducción](memoria/01-introduccion.md).
- [Estado del arte](memoria/02-estado-del-arte.md).
- [Metodología](memoria/03-metodologia.md).
- [Diseño del sistema](memoria/04-diseno-del-sistema.md).
- [Implementación](memoria/05-implementacion.md).
- [Evaluación](memoria/06-evaluacion.md).
- [Conclusiones](memoria/07-conclusiones.md).
- [Referencias pendientes](memoria/referencias-pendientes.md).

### Figuras

- [Inventario de figuras](figures/inventario-figuras.md).
- [Pies de figura](figures/pies-de-figura.md).

## Función de cada área

| Área | Pregunta que responde |
| --- | --- |
| Raíz | ¿Qué reglas están vigentes? |
| `product/` | ¿Qué debe hacer la aplicación? |
| `research/` | ¿Por qué se ha tomado cada decisión? |
| `evaluation/` | ¿Cómo se demuestra que funciona y aporta valor? |
| `operations/` | ¿Cómo se reproduce y cómo se resolvieron incidencias? |
| `memoria/` | ¿Cómo se integra lo anterior en la narrativa académica? |
| `figures/` | ¿Qué visualizaciones existen o faltan? |

## Estados documentales

Cada documento nuevo debe indicar uno de estos estados:

- `Propuesto`: decisión todavía no aprobada o implementada.
- `Vigente`: especificación actual que debe respetar el código.
- `En implementación`: diseño aprobado pero incompleto.
- `Validado`: implementación y pruebas completadas.
- `Histórico`: se conserva por trazabilidad, pero ya no es normativo.

Cuando una decisión cambie, se actualiza su fuente principal y se registra una
entrada breve en `journal.md`. El journal no debe repetir toda la explicación.

## Convención para nuevas funcionalidades

Las nuevas funcionalidades se documentan a partir de
[la plantilla de funcionalidad](templates/feature.md). Como mínimo deben explicar:

1. Problema y requisitos.
2. Alternativas consideradas.
3. Decisión y justificación.
4. Datos de entrada y salida.
5. Implementación y pruebas.
6. Resultados, riesgos y limitaciones.
7. Texto reutilizable en la memoria.

Una funcionalidad se coloca según su función principal. Por ejemplo, el cálculo de
scoring pertenece a `research/`, el flujo GPS a `product/`, los experimentos a
`evaluation/` y los errores de una API externa a `operations/`.

## Política de publicación

Todo archivo versionado debe ser adecuado para revisión académica y para una
eventual publicación del repositorio. No debe contener tokens, rutas personales,
correos privados, trazas GPS, datos de participantes ni notas cuya vigencia no
haya sido comprobada.

Antes de versionar un documento se revisarán las tildes, la puntuación, la
concordancia y la terminología. Se preferirán términos españoles cuando sean
claros y precisos; los nombres de archivos, campos, módulos y otros
identificadores de código conservarán su forma original.

`docs/private/` se reserva para notas históricas, borradores personales y
resolución de problemas no evaluable. No es un almacén de secretos: las credenciales
reales pertenecen exclusivamente al `.env` local y deben rotarse si aparecen en
una salida o conversación.

## Regla para la memoria

Los archivos de `memoria/` integran y condensan las fuentes anteriores. Durante
el desarrollo deben contener esquemas, argumentos y enlaces; no es necesario
copiar cada nota técnica. Al cerrar una fase se transforma la evidencia vigente
en redacción académica y se anotan las referencias todavía pendientes.
