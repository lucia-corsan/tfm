# Registro de experimentos

Estado: `En implementación`
Última actualización: 18 de agosto de 2026
Responsabilidad principal: `evaluation`

## Convención

No se modifica una fila para ocultar un resultado negativo. Si un experimento
cambia, se crea una nueva versión y se enlaza la anterior.

## Índice

| ID | Fecha | Pregunta | Datos | Sistema de referencia | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| EXP-001 | 8 de agosto de 2026 | `unknown` no mejora una ruta | *Fixtures* | Misma ruta con evidencia favorable | Validación técnica superada | `tests/scoring/test_scorer.py` |
| EXP-002 | 17 de agosto de 2026 | ¿El aprendizaje recupera preferencias mejor que los pesos fijos? | 4 perfiles sintéticos, 20 semillas finales y 3 niveles de ruido | Ruta más corta y pesos fijos | Validación sintética superada | `docs/evaluation/calibracion-aprendizaje-adaptativo.md` |
| EXP-003 | 16 de agosto de 2026 | ¿Qué umbral espacial equilibra detección y falsas alertas? | 13 secuencias GPS sintéticas | 30 m iniciales sin calibración | Validación sintética superada | `docs/evaluation/calibracion-detector-desviacion.md` |
| VAL-001 | 16 de agosto de 2026 | ¿El rerouting conserva una navegación útil ante aceptación, rechazo y fallo? | Android Emulator, ORS y GPS simulado | Ruta previa sin recálculo | Validación funcional superada | `docs/evaluation/resultados.md` |
| VAL-002 | 17 de agosto de 2026 | ¿La voz de la app respeta la velocidad elegida sin interferir con TalkBack? | Pruebas automáticas y Android Emulator | Voz normal y manual | Validación automática y auditiva superada | `app/__tests__/useInstructionSpeech.test.tsx` |
| VAL-003 | 18 de agosto de 2026 | ¿La app aplica y conserva el aprendizaje sin alterar restricciones ni guardar ubicación? | Caso dorado, pruebas de integración y Android Emulator | Pesos declarados fijos | Validación automática y funcional superada | `docs/research/integracion-aprendizaje-adaptativo-app.md` |
| EXP-004 | 10 de agosto de 2026 | ORS devuelve rutas base válidas y reutiliza la caché | Corredor piloto | Primera ejecución con red | Validación técnica superada | `backend/routing/check_ors.py` |
| EXP-005A | 10 de agosto de 2026 | ¿Qué umbrales separan repeticiones de rutas distintas? | 10 pares sintéticos etiquetados | Hipótesis inicial: 10 m, 85 % y 5 % | Validación técnica superada | `docs/evaluation/calibracion-deduplicacion-espacial.md` |
| EXP-005 | Pendiente | ¿La ampliación mejora diversidad y disponibilidad de candidatas? | 12 pares del área piloto | Una petición ORS, hasta 3 rutas | Planificado | `docs/research/generacion-rutas-candidatas.md` |
| EXP-006 | 11 de agosto de 2026 | ¿Qué ancho asocia evidencia OSM sin incorporar demasiada infraestructura próxima? | Tres rutas reales y una instantánea OSM fija | Corredor general de 10 m | Validación técnica superada | `docs/evaluation/calibracion-corredor-osm.md` |
| EXP-007 | 18 de agosto de 2026 | ¿La mejora adaptativa se transfiere a costes de rutas ORS enriquecidas con OSM? | 12 pares fijados; 4 de aprendizaje y 3 de evaluación resultaron aptos | Ruta más corta y pesos fijos | Validación real-sintética completada, transferencia no observada | `docs/evaluation/evaluacion-aprendizaje-rutas-reales.md` |
| EXP-008 | 18 de agosto de 2026 | ¿Un diagnóstico estructural distingue elecciones informativas de comparaciones repetidas y poco variadas? | Bancos de `EXP-002` y `EXP-007`, 4 perfiles y 20 semillas | Ocho elecciones sin comprobar su diversidad | Validación técnica superada; integración automática aplazada | `docs/evaluation/diagnostico-capacidad-informativa.md` |

### EXP-008 — Capacidad informativa de las elecciones

- Fecha: 18 de agosto de 2026, semana 4, día 4.
- Pregunta: ¿cantidad, contraste, variedad, dimensiones activas y rango permiten
  distinguir el banco sintético informativo del banco real limitado donde no
  se observó transferencia?
- Datos: cuatro perfiles, veinte semillas y 4, 8, 12, 20 y 60 elecciones; 80
  historiales por banco y punto. Las semillas reales solo cambian orden y ruido
  sobre las mismas cuatro situaciones aptas.
- Umbrales: ocho elecciones, doce pares con distancia L1 mínima de 0,10, doce
  comparaciones distintas, seis dimensiones con contraste mínimo de 0,03 y
  rango mínimo de seis.
- Referencia: una regla que activa al alcanzar ocho elecciones sin estudiar su
  contenido.
- Resultado: desde ocho elecciones, la referencia aceptó el 100 % de ambos
  bancos. El diagnóstico aceptó el 100 % de los historiales sintéticos y el
  0 % de los reales limitados hasta las 60 elecciones.
- Diagnóstico: el banco real mantuvo solo cinco dimensiones activas; las
  comparaciones distintas crecieron con el ruido y las repeticiones, pero la
  carencia temática no desapareció.
- Decisión: conservar la función como instrumento experimental y no conectarla
  todavía como activador automático. La separación perfecta sobre dos bancos
  contrastados no demuestra generalización a otras zonas o personas.
- Evidencia: [protocolo y resultados](diagnostico-capacidad-informativa.md), dos
  CSV sanitizados, una figura y diez pruebas específicas del incremento.

### EXP-007 — Transferencia del aprendizaje a costes reales

- Fecha: 18 de agosto de 2026, semana 4, día 3.
- Pregunta: ¿la configuración congelada en `EXP-002` mejora el orden de rutas
  ORS enriquecidas con OSM que no se usaron para actualizar los pesos?
- Datos: doce pares fijados, 31 rutas generadas sobre el mismo grafo ORS, 24
  aceptadas después de restricciones y costes derivados de una instantánea OSM
  fija. Las rutas son reales; perfiles y elecciones siguen siendo sintéticos.
- Separación: ocho pares previstos para aprendizaje y cuatro para evaluación;
  cuatro y tres, respectivamente, conservaron al menos dos rutas aceptadas.
- Sistemas de referencia: ruta más corta y pesos declarados fijos.
- Resultado: después de 60 elecciones, el adaptativo obtuvo 75,00 % de
  exactitud de primera ruta, frente a 100,00 % del sistema fijo y 75,00 % de la
  ruta más corta. La exactitud por pares fue 84,31 %, 97,22 % y 80,56 %.
- Diagnóstico: los cuatro perfiles prefirieron la misma ruta en cada par de
  aprendizaje apto; orientación y pendiente fueron constantes. El sistema fijo
  ya resolvió todas las primeras posiciones reservadas, por lo que existía un
  efecto techo.
- Decisión: no recalibrar después de observar el resultado y mantener el
  aprendizaje opcional, local, reversible y desactivado inicialmente.
- Interpretación: el algoritmo funciona bajo el control sintético, pero no se
  observa transferencia en este banco real pequeño y poco identificativo. No es
  una evaluación con participantes ni una estimación poblacional.
- Evidencia: [protocolo y resultados completos](evaluacion-aprendizaje-rutas-reales.md),
  siete CSV sanitizados, una figura y pruebas deterministas.

### EXP-002 — Aprendizaje adaptativo de preferencias

- Fecha y versión del código: 17 de agosto de 2026, semana 4, día 1.
- Pregunta: ¿la clasificación adaptativa predice mejor las preferencias
  sintéticas que la ruta más corta y los pesos declarados fijos?
- Datos: cuatro perfiles latentes, situaciones de tres rutas no dominadas,
  60 elecciones de entrenamiento y 160 conjuntos nuevos por ejecución.
- Separación: calibración sobre tres perfiles y tres semillas; evaluación sobre
  veinte semillas nuevas, con un cuarto perfil excluido de la calibración.
- Parámetros: 216 configuraciones de tasa, sensibilidad logística,
  regularización, límite de cambio e incremento de influencia.
- Configuración seleccionada: tasa 0,06; sensibilidad 3; regularización 0,05;
  tres elecciones de observación; incremento 0,10; influencia máxima 0,50; y
  cambio aprendido máximo de 0,12 en distancia L1.
- Sistemas de referencia: ruta más corta y pesos declarados fijos.
- Métricas: exactitud de la primera ruta y por pares, arrepentimiento medio y
  acumulado, error y saltos de pesos, y proximidad al último resultado
  observado. Las restricciones críticas se verifican en una prueba de
  integración separada, no dentro de las 240 simulaciones.
- Resultado principal: con un 10 % de elecciones inconsistentes, 89,05 % de
  exactitud adaptativa frente al 78,64 % fijo; mejora emparejada de 10,41 puntos
  con intervalo aproximado del 95 % de 9,09 a 11,72 puntos; arrepentimiento
  medio de 0,00238 frente a 0,00902.
- Robustez: la mejora frente al sistema fijo fue de 11,24 puntos sin ruido y de
  8,59 puntos con un 20 % de ruido.
- Sensibilidad al cuestionario: mejora de 16,41, 10,41 y 2,98 puntos con 0 %,
  25 % y 50 % de señal declarada; empeoramiento de 4,77 y 12,16 puntos con 75 %
  y 100 %. El aprendizaje no domina universalmente al sistema fijo.
- Seguridad: pesos no negativos y normalizados, salto efectivo máximo de
  0,0983 en la condición principal y cero readmisiones de rutas rechazadas en
  las pruebas de integración.
- Interpretación: el núcleo recupera una señal lineal conocida y aporta valor
  más allá de la declaración inicial. No demuestra aún eficacia con personas ni
  con elecciones sobre rutas reales.
- Limitaciones: simulador de la misma familia que el modelo, perfiles no
  clínicos, costes independientes y último punto de control —60 elecciones—
  como primer punto próximo al valor final, sin demostrar convergencia.
- Evidencia: [protocolo y resultados completos](calibracion-aprendizaje-adaptativo.md),
  siete CSV, dos figuras y pruebas en `tests/feedback/`.

### EXP-003 — Calibración del detector de desviación

- Fecha y versión del código: 16 de agosto de 2026, semana 3, día 4.
- Pregunta: ¿qué umbral entre 20, 30 y 40 m ofrece el mejor equilibrio entre
  detección y ausencia de avisos indebidos?
- Datos: trece secuencias fijadas antes de seleccionar el resultado, seis
  positivas y siete negativas, con 39 predicciones.
- Parámetros constantes: precisión máxima de 25 m, tres muestras y diez
  segundos de duración mínima.
- Sistema de referencia: configuración inicial de 30 m no calibrada.
- Métricas: exactitud, precisión, sensibilidad, especificidad, F1, errores
  absolutos y latencia.
- Regla de selección: mayor F1; después, menos falsas alertas, mayor
  sensibilidad y menor distancia.
- Resultado: se mantienen 30 m, con 92,3 % de exactitud, F1 de 90,9 %, ninguna
  falsa alerta y una desviación moderada omitida.
- Interpretación: 20 m fue demasiado sensible ante dos desplazamientos
  benignos; 40 m omitió dos desviaciones.
- Limitaciones: banco sintético, etiquetas de diseño, ruta recta y frecuencia
  fija. No sustituye una prueba física.
- Evidencia: [calibración completa](calibracion-detector-desviacion.md), CSV y
  pruebas automáticas de la aplicación.

### VAL-001 — Validación funcional del rerouting

- Fecha y versión del código: 16 de agosto de 2026, semana 3, día 3.
- Pregunta: ¿la aplicación detecta una desviación estable, solicita
  confirmación, conserva el estado seguro ante rechazo o fallo y recupera el
  recálculo cuando el servicio vuelve a estar disponible?
- Datos y entorno: Pixel 9 de Android Emulator con Android 16, TalkBack,
  ubicaciones GPS simuladas, backend local, ORS e instantánea OSM del área
  piloto.
- Parámetros: precisión máxima de 25 m, separación superior a 30 m, tres
  muestras fiables durante al menos 10 s y periodo de espera de 60 s.
- Procedimiento: se simuló una posición cercana a la ruta, una secuencia de
  posiciones alejadas y las decisiones de mantener y recalcular. Para probar la
  recuperación se detuvo el backend antes de confirmar el recálculo, se reinició
  y se pulsó el botón de reintento.
- Criterios de éxito: el rechazo no envía la posición; la aceptación genera una
  nueva respuesta válida y reinicia la navegación; un fallo conserva ruta e
  instrucción; TalkBack puede recorrer el diálogo y el reintento; el servicio
  recuperado completa el flujo.
- Resultado: todos los criterios se cumplieron. Tras el primer recálculo, unas
  coordenadas de la ruta inicial se clasificaron correctamente como próximas a
  la nueva geometría; se eligieron puntos respecto a la ruta activa y la alerta
  volvió a aparecer.
- Interpretación: se valida la coherencia funcional y el tratamiento seguro de
  errores del caso piloto. El cambio de geometría confirma que la detección usa
  la ruta vigente, no una referencia obsoleta.
- Limitaciones: una ejecución manual no estima por sí sola falsos positivos,
  falsos negativos ni el mejor umbral. `EXP-003` se ejecutó después con
  secuencias equivalentes, aunque tampoco sustituye una prueba física.
- Evidencias: [Resultados](resultados.md),
  [GPS y rerouting](../product/gps-rerouting.md) y las pruebas automáticas de
  backend y aplicación.

### VAL-002 — Coordinación de TTS, velocidad y TalkBack

- Fecha y versión del código: 17 de agosto de 2026, semana 3, día 5.
- Pregunta: ¿la voz de la app utiliza la velocidad seleccionada, sustituye una
  locución obsoleta y permanece en silencio cuando TalkBack está activo?
- Datos: instrucciones deterministas de prueba y cuatro multiplicadores de
  velocidad: 0,8; 1,0; 1,25 y 1,5.
- Sistema de referencia: velocidad 1,0, escucha manual y TalkBack desactivado.
- Criterios de éxito: idioma `es-ES`; velocidad transmitida sin alteración;
  interrupción antes de una frase nueva; ausencia de voz propia con lector de
  pantalla; modo automático solo después de una acción explícita; cancelación
  al cerrar la pantalla.
- Resultado: las pruebas automáticas cubrieron el controlador, la detección del
  lector, las preferencias y la pantalla. En Android Emulator se distinguieron
  los cuatro niveles, funcionaron la detención y la reproducción automática, la
  frase nueva sustituyó a la anterior, la voz se canceló al cerrar y TalkBack no
  se solapó con `expo-speech`. El recorrido secuencial no omitió los párrafos
  comprobados y no se notificaron incidencias.
- Interpretación: se valida la coordinación funcional en un dispositivo virtual
  y con una persona evaluadora. No se demuestra todavía qué velocidad prefiere
  el colectivo ni su rendimiento durante un recorrido físico.
- Limitaciones: multiplicadores dependientes del motor, un único dispositivo
  virtual, una sola evaluadora y ausencia de participantes del colectivo. La
  comprobación posterior de la interfaz simplificada confirmó un único anuncio
  de instrucción y la ausencia de controles propios sin efecto para TalkBack.
- Evidencias: [Narración, TalkBack y TTS](../product/narracion-talkback-tts.md),
  `app/__tests__/useInstructionSpeech.test.tsx`,
  `app/__tests__/useScreenReaderStatus.test.tsx` y
  `app/__tests__/NavigationScreen.test.tsx`.

### VAL-003 — Integración local del aprendizaje adaptativo

- Fecha y versión del código: 18 de agosto de 2026, semana 4, día 2.
- Pregunta: ¿la aplicación puede aplicar la fórmula evaluada, conservar el
  estado local y enviar pesos efectivos sin permitir que cambien las
  restricciones críticas?
- Datos: caso dorado compartido Python–TypeScript, respuestas sintéticas de dos
  rutas aceptadas y estados SQLite simulados válidos, dañados e incompatibles.
- Sistema de referencia: comparación con pesos declarados fijos y referencia
  matemática Python.
- Criterios de éxito: paridad numérica; tres elecciones sin influencia; pesos
  no negativos y normalizados; exclusión de rutas descartadas; recuperación de
  estado; ausencia de ubicación en el registro; consentimiento y reinicio
  accesibles.
- Resultado: paridad hasta doce decimales; pesos válidos tras 500
  actualizaciones; estado recuperado después de recrear el controlador; dato
  dañado restaurado al perfil declarado; rutas críticas siempre descartadas.
  La suite completa obtuvo 265 pruebas de backend y 126 de app, con análisis
  estáticos correctos.
- Comprobación funcional: en Android Emulator el estado sobrevivió al cierre y
  reapertura; observación, cuarta elección influyente, pausa, reactivación,
  cancelación y confirmación del reinicio funcionaron como estaba previsto. El
  recorrido con TalkBack no presentó incidencias notificadas.
- Interpretación: se valida la coherencia técnica y funcional del ciclo local
  desde la elección hasta la siguiente comparación y el recálculo. No se valida
  aún su utilidad o comprensibilidad con participantes de la población objetivo.
- Evidencias: [Integración del aprendizaje adaptativo en la app](../research/integracion-aprendizaje-adaptativo-app.md),
  `tests/feedback/test_mobile_parity.py` y pruebas `adaptivePreferences*` de la
  aplicación.

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
