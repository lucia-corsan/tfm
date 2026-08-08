# Registro de incidencias técnicas

Estado: `En implementación`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `operations`

## Convención

Cada incidencia registra síntoma, causa, solución y consecuencia metodológica.
Las explicaciones extensas deben residir aquí o en el documento de la funcionalidad;
el journal solo enlaza la entrada.

## Incidencias registradas

| ID | Síntoma | Causa | Solución | Estado |
| --- | --- | --- | --- | --- |
| INC-001 | Overpass 406 | Identificación o formato de la petición | Cliente identificado y respuesta JSON explícita | Resuelta |
| INC-002 | Overpass 429/504 | Saturación y consultas pesadas | Reintentos, instancias alternativas y teselas con caché | Mitigada |
| INC-003 | Mapillary 500/502 | Volumen y disponibilidad externa | Teselas, paginación acotada y checkpoints | Mitigada |
| INC-004 | Credencial visible en una traza inicial | Token enviado en la URL | Autorización por cabecera y errores sanitizados; rotación requerida | Mitigada |
| INC-005 | `KeyError` en una métrica derivada | Orden incorrecto de cálculo | Construcción y validación explícitas antes del scoring | Resuelta |
| INC-006 | Auditoría npm con transitivas | Dependencias de Metro/Expo | No degradar Expo; revisar en actualización compatible | Aceptada |
| INC-007 | Advertencia de soporte de Python 3.9 | Versión fuera de soporte general | Mantener la decisión actual y documentar el riesgo | Aceptada |

## Evidencia relacionada

Las incidencias de adquisición relevantes para la metodología se sintetizan en
[selección del área piloto](../research/seleccion-area-piloto.md#retos-principales-encontrados-y-soluciones).
La resolución básica de problemas y las decisiones superadas se conservan únicamente en
las notas privadas locales.

## Plantilla

### INC-XXX — Título

- Fecha:
- Síntoma y mensaje sanitizado:
- Contexto reproducible:
- Causa:
- Solución o mitigación:
- Verificación:
- Consecuencia para la metodología:
- Trabajo pendiente:
