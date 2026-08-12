# Registro de experimentos

Estado: `En implementación`
Última actualización: 11 de agosto de 2026
Responsabilidad principal: `evaluation`

## Convención

No se modifica una fila para ocultar un resultado negativo. Si un experimento
cambia, se crea una nueva versión y se enlaza la anterior.

## Índice

| ID | Fecha | Pregunta | Datos | Sistema de referencia | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| EXP-001 | 8 de agosto de 2026 | `unknown` no mejora una ruta | *Fixtures* | Misma ruta con evidencia favorable | Validación técnica superada | `tests/scoring/test_scorer.py` |
| EXP-002 | Pendiente | Recuperación de preferencias | Perfiles sintéticos | Pesos fijos | Pendiente | — |
| EXP-003 | Pendiente | Sensibilidad del rerouting | GPS simulado | Umbral único | Pendiente | — |
| EXP-004 | 10 de agosto de 2026 | ORS devuelve rutas base válidas y reutiliza la caché | Corredor piloto | Primera ejecución con red | Validación técnica superada | `backend/routing/check_ors.py` |
| EXP-005A | 10 de agosto de 2026 | ¿Qué umbrales separan repeticiones de rutas distintas? | 10 pares sintéticos etiquetados | Hipótesis inicial: 10 m, 85 % y 5 % | Validación técnica superada | `docs/evaluation/calibracion-deduplicacion-espacial.md` |
| EXP-005 | Pendiente | ¿La ampliación mejora diversidad y disponibilidad de candidatas? | 12 pares del área piloto | Una petición ORS, hasta 3 rutas | Planificado | `docs/research/generacion-rutas-candidatas.md` |
| EXP-006 | 11 de agosto de 2026 | ¿Qué ancho asocia evidencia OSM sin incorporar demasiada infraestructura próxima? | Tres rutas reales y una instantánea OSM fija | Corredor general de 10 m | Validación técnica superada | `docs/evaluation/calibracion-corredor-osm.md` |

### EXP-004 — Descarga y reutilización de rutas base ORS

- Fecha y versión del código: 10 de agosto de 2026, semana 2, día 1.
- Pregunta o hipótesis: el cliente debe obtener entre una y tres rutas base
  válidas y una repetición idéntica debe usar la caché sin otra petición HTTP.
- Datos y versión: corredor piloto Moncloa–Príncipe Pío; grafo remoto indicado
  por ORS en la respuesta almacenada localmente.
- Parámetros: perfil `foot-walking`, hasta tres alternativas,
  `share_factor = 0,6`, `weight_factor = 1,4`, instrucciones en español y
  prohibición de escalones conocidos.
- Sistema de referencia: primera ejecución contra el servicio real de ORS.
- Métricas: código HTTP, número de rutas, distancia, duración, instrucciones y
  presencia o ausencia de una segunda petición HTTP.
- Criterio de éxito: HTTP 200, entre una y tres rutas validadas y reutilización
  local en la segunda ejecución.
- Resultado: tres rutas. Sus resúmenes fueron 2.715 m, 1.955 s y 32
  instrucciones; 2.734 m, 1.968 s y 40 instrucciones; y 2.868 m, 2.065 s y 29
  instrucciones. La segunda ejecución no realizó otra petición HTTP.
- Interpretación: se valida la integración técnica y la caché. Las alternativas
  presentan diversidad en métricas básicas, pero aún no pueden ordenarse por
  accesibilidad.
- Limitaciones: una única pareja origen-destino no caracteriza disponibilidad
  ni latencia general; la respuesta puede variar cuando cambie el grafo de ORS;
  la opción de evitar escalones depende de los datos conocidos por el proveedor.
- Archivos reproducibles: `backend/routing/check_ors.py`; la respuesta real
  permanece en la caché local ignorada por Git.

### EXP-005A — Calibración de la deduplicación espacial

- Fecha y versión del código: 10 de agosto de 2026.
- Pregunta o hipótesis: la configuración inicial de 10 metros, 85 % de
  solapamiento y 5 % de diferencia de longitud podría ser demasiado permisiva;
  debe encontrarse una opción sin falsos positivos en casos preetiquetados.
- Datos y versión: cinco pares duplicados y cinco pares distintos definidos en
  ETRS89 / UTM zona 30N antes de ejecutar el barrido.
- Parámetros: seis tolerancias, cinco umbrales de solapamiento y tres umbrales
  de longitud; 90 configuraciones y 900 predicciones.
- Sistema de referencia: etiquetas semánticas fijadas para los diez pares.
- Métricas: exactitud, precisión, sensibilidad, F1, falsos positivos y falsos
  negativos.
- Criterio de éxito: cero falsos positivos, máxima exactitud y sensibilidad;
  los empates se resuelven con la opción más restrictiva.
- Resultado: 2 metros, 98 % de solapamiento y 3 % de diferencia de longitud;
  exactitud, precisión, sensibilidad y F1 del 100 % en el banco, sin falsos
  positivos ni falsos negativos.
- Interpretación: 1 metro no absorbió el ruido positivo de 2 metros; 8 y 10
  metros fusionaron entre una y dos rutas diferentes. Entre 2, 3 y 5 metros
  hubo empate y se eligió 2 metros de forma conservadora. Los umbrales de
  longitud no cambiaron resultados y el 3 % es solo un desempate restrictivo.
- Comprobación ORS: las tres rutas reales mostraron solapamientos del 22,56 % al
  31,25 % y permanecieron separadas.
- Limitaciones: banco sintético pequeño, etiquetas de diseño y ausencia de
  estimación general del error real.
- Archivos reproducibles: fuente, CSV de 90 configuraciones, CSV de 900
  predicciones y gráfico enlazados en
  [la calibración](calibracion-deduplicacion-espacial.md).

### EXP-005 — Cobertura y coste del conjunto de candidatas

- Fecha y versión del código: pendiente.
- Pregunta o hipótesis: una estrategia escalonada y deduplicada proporciona más
  rutas distintas y reduce los casos sin alternativas compatibles respecto a
  una única petición ORS.
- Datos y versión: doce pares origen-destino reproducibles del área piloto,
  respuestas ORS en caché e instantánea OSM fijada.
- Parámetros: hasta ocho rutas únicas, máximo tres consultas y regla espacial
  calibrada en `EXP-005A`; los límites del agregador permanecen pendientes.
- Sistema de referencia: B0, una petición ORS con hasta tres rutas.
- Sistema evaluado: B1, generación escalonada con deduplicación.
- Métricas: rutas crudas y únicas, solapamiento, supervivencia a restricciones,
  casos sin ruta, mejor adecuación, incertidumbre, desvío, llamadas y latencia.
- Criterio de éxito: más disponibilidad o diversidad útil, cero violaciones
  críticas y coste compatible con el MVP.
- Resultado: pendiente.
- Interpretación: pendiente; se documentará también un resultado negativo.
- Limitaciones: no existe una verdad de referencia exhaustiva y el área piloto
  no representa toda Madrid.
- Archivos reproducibles: pendientes.

### EXP-006 — Sensibilidad del corredor de enriquecimiento OSM

- Fecha y versión del código: 11 de agosto de 2026, semana 2, día 3.
- Pregunta o hipótesis: aumentar el corredor recupera más evidencia, pero puede
  atribuir a la ruta infraestructura de calles o aceras adyacentes.
- Datos y versión: tres rutas ORS almacenadas en caché, instantánea OSM con fecha
  base `2026-08-11T07:12:44Z` y perfil equilibrado.
- Parámetros: corredores de 5, 10, 15 y 20 m; barreras críticas confirmadas a
  un máximo de 0,5 m y con 3 m de alineación para vías.
- Sistema de referencia: corredor inicial de 10 m.
- Métricas: elementos únicos asociados, cruces y apoyos, cobertura de acera y
  superficie, confianza, incertidumbre, aceptación y orden.
- Criterio de éxito: conservar evidencia longitudinal útil y todas las rutas
  compatibles, minimizando la sensibilidad a objetos próximos.
- Resultado: 5 m asoció 418 elementos, frente a 532 con 10 m. El incremento del
  27,3 % solo elevó la confianza media de 0,391 a 0,409 y cambió el primer
  puesto. Con 5 m se conservaron coberturas de acera del 62,8 % al 73,7 % y de
  superficie del 94,4 % al 99,6 %.
- Interpretación: se seleccionó 5 m de forma conservadora. La confianza máxima
  no se utilizó como sustituto de la exactitud espacial.
- Limitaciones: tres rutas de un único trayecto, fuente OSM compartida por el
  grafo y la evidencia, y validación manual pendiente.
- Archivos reproducibles: dos CSV, script, pruebas y mapa detallados en
  [la calibración](calibracion-corredor-osm.md).

## Plantilla de experimento

### EXP-XXX — Título

- Fecha y versión del código:
- Pregunta o hipótesis:
- Datos y versión:
- Parámetros y semilla aleatoria:
- Sistema de referencia:
- Métricas:
- Criterio de éxito:
- Resultado:
- Interpretación:
- Limitaciones:
- Archivos reproducibles:
