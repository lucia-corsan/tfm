# 4. Diseño del sistema

Estado: `En implementación`
Última actualización: 21 de agosto de 2026.

## Arquitectura

Aplicación Expo accesible, API FastAPI, proveedor intercambiable de rutas,
enriquecimiento OSM, puntuación, narración y aprendizaje local.

La frontera entre generación y evaluación es explícita. El cliente asíncrono de
ORS produce rutas base validadas y cacheables, pero no objetos puntuables. El
enriquecimiento OSM debe completar la representación de evidencia antes de que
el sistema aplique restricciones o calcule adecuación, confianza e
incertidumbre.

El enriquecimiento real proyecta las geometrías a `EPSG:25830`, consulta un
índice espacial y asocia evidencia dentro de un corredor general de 5 m. Las
restricciones críticas no dependen de ese único umbral: una barrera debe estar
a un máximo de 0,5 m y, si es lineal, mantener al menos 3 m de alineación. La
separación entre contexto general y confirmación crítica protege frente a
objetos de calles paralelas.

El conjunto interno podrá contener más rutas que la respuesta pública. Un
agregador escalonado ampliará la búsqueda cuando las primeras alternativas sean
redundantes o queden descartadas; una fase de deduplicación evitará contar como
diversidad rutas prácticamente iguales. Después del enriquecimiento y las
restricciones, el ranking devolverá como máximo tres opciones para no trasladar
la complejidad interna a la interfaz accesible.

La deduplicación se divide en coincidencia exacta y similitud espacial. Esta
última usa la menor cobertura de ambas líneas para impedir que una ruta corta
contenida en otra larga parezca equivalente. La configuración integrada exige
2 metros de tolerancia, 98 % de solapamiento y menos del 3 % de diferencia de
longitud. Cada descarte conserva la referencia a la primera candidata y las
métricas que justifican la decisión.

## Modelos de dominio

El perfil separa restricciones críticas y preferencias graduables. Cada ruta
contiene geometría, instrucciones y un vector de características con evidencia
favorable, desfavorable o desconocida. La cobertura de esa evidencia alimenta
la confianza, mientras que la proporción temática desconocida se conserva como
incertidumbre explícita y como coste no negativo. Los escenarios agrupan hasta
tres alternativas comparables sin mezclar estos datos con identidad, historial
GPS o decisiones de seguridad.

## Seguridad y privacidad

Datos desconocidos sin beneficio, restricciones fuera del aprendizaje, tokens
en el backend, coordenadas fuera de los registros y confirmación del rerouting.

El recálculo reutiliza la misma cadena de generación, enriquecimiento,
restricciones y clasificación que la comparación inicial. El dispositivo
mantiene en memoria el destino, el perfil y la ruta activa; solo envía la
posición fiable cuando la persona confirma expresamente el recálculo. La ruta
anterior permanece disponible hasta recibir una alternativa válida, por lo que
un fallo de red, una respuesta incorrecta o la ausencia de rutas compatibles no
dejan la navegación sin contexto. Tras un reemplazo se aplica un minuto sin
nuevas alertas para evitar bucles causados por ruido del GPS.

## Accesibilidad

TalkBack, controles de 44 puntos, contraste WCAG 2.2 AA, navegación no
dependiente del mapa y coordinación de TTS. La voz de la app parte de velocidad
normal y reproducción manual y ofrece cuatro niveles. Cuando el sistema detecta
TalkBack, oculta los controles de esa segunda voz y comunica cada instrucción
nueva mediante una única región dinámica moderada. Los avisos críticos conservan
prioridad alta. La velocidad de TalkBack permanece como preferencia global de
Android.

La presentación visual se mantiene separada de las preferencias de movilidad.
La persona puede respetar la escala base, ampliar en un 25 % la tipografía
interna, activar una paleta de contraste reforzado o combinar ambas medidas.
Estas opciones se eligen en el perfil inicial y pueden modificarse desde una
pantalla de «Ajustes» sencilla, sin alterar la puntuación. La pantalla se abre
sobre el flujo vigente para no perder el trayecto y utiliza una flecha verde
sobre el fondo blanco y transparente de la cabecera. Desde esta misma
pantalla se gestionan el modo y la velocidad de la voz propia y una lista local
de lugares habituales. Cada lugar une un alias con un resultado geocodificado y
puede reutilizarse como origen o destino; no forma parte del perfil del ranking
ni crea un historial de desplazamientos.

### Diseño de las instrucciones de navegación

La ruta y su narración se han diseñado como datos relacionados, pero no
intercambiables. Una línea sobre el mapa indica por dónde discurre el recorrido;
una instrucción identifica qué acción debe realizarse en un punto concreto de
esa línea. Cada instrucción incluye orden, maniobra, frase, distancia, duración
y posición. El sistema rechaza secuencias con saltos, retrocesos o puntos que no
pertenecen a la geometría.

Los códigos numéricos de OpenRouteService se traducen en el backend a catorce
maniobras propias. Así, la app no queda ligada a los números de un proveedor y
las rutas sintéticas y reales utilizan el mismo modelo. Las frases se generan
mediante plantillas españolas, por lo que pueden revisarse y probarse sin
depender de texto libre externo.

La interfaz exige una elección explícita antes de navegar y muestra un paso cada
vez. Los controles manuales constituyen una fase intermedia deliberada: permiten
validar secuencia, comprensión y accesibilidad antes de añadir GPS, que introduce
ruido e incertidumbre propios. Los avisos sobre accesibilidad permanecen visibles
y separados de la maniobra para impedir que «gira a la derecha» se interprete
como «este tramo es seguro».

## IA explicable

El componente de IA se sitúa después de las restricciones críticas y antes de
la presentación. Esta posición es deliberada: una ruta con escalones prohibidos,
acceso peatonal incompatible, cruces incompatibles, pendiente excesiva o desvío
superior al máximo se descarta sin consultar el modelo estadístico. El
aprendizaje solo puede reordenar las alternativas restantes.

El estado mantiene tres vectores distintos. Los pesos declarados conservan la
respuesta del cuestionario; los aprendidos resumen las elecciones explícitas; y
los efectivos mezclan ambos. Durante tres decisiones se observa sin modificar
la clasificación. Después, la influencia aprendida aumenta gradualmente y nunca
supera el 50 %. Esta separación evita sobrescribir silenciosamente la intención
de la persona y permite explicar qué parte procede de su declaración y qué
parte de su comportamiento.

Cada elección se transforma en comparaciones entre la ruta elegida y las demás
rutas aceptadas que se mostraron. La pérdida logística se actualiza en línea,
se regulariza hacia el perfil inicial, se proyecta a pesos no negativos que
suman uno y se limita por interacción. Si solo queda una ruta aceptada no se
genera una observación, porque no existe una preferencia relativa interpretable.

Al hacer editable el perfil inicial se añadió una identidad adaptativa derivada
de sus pesos y restricciones. Un cambio de presentación o voz conserva el
aprendizaje, porque no afecta a la elección de ruta. En cambio, modificar la
tolerancia a escalones, el desvío máximo o las prioridades abre un estado
adaptativo separado. Así no se mezclan elecciones realizadas bajo necesidades
de movilidad incompatibles y tampoco se borra aprendizaje por un cambio
puramente visual.

La omisión y la finalización del cuestionario se modelan como estados distintos.
Si se omite, la aplicación mantiene dos perfiles generales —equilibrado y
orientado a cruces sencillos— para no atribuir a la persona necesidades que no
ha declarado. Si se completa, ese selector desaparece y la clasificación usa
solo el perfil personal. El aprendizaje también respeta esta procedencia: los
dos perfiles generales conservan estados separados y ninguna de sus elecciones
se mezcla con el modelo del cuestionario. La salida continúa mostrando varias
alternativas válidas ordenadas; «personalizar» no equivale a ocultarlas ni a
presentar una única ruta como segura.

La confianza no interviene en la probabilidad de elección: describe la cobertura
de la evidencia y se presenta como una salida independiente. La incertidumbre
también sigue visible por separado, pero además forma parte de los nueve costes
no negativos; de este modo, una ruta con más información desconocida puede
recibir una penalización cuya importancia se adapta, sin que lo desconocido se
convierta nunca en una ventaja. La probabilidad logística solo indica cuánto
encaja una elección con los pesos actuales, no confianza, accesibilidad ni
seguridad.

La aplicación materializa este diseño sin crear una cuenta remota. El
aprendizaje nace desactivado y un interruptor accesible solicita consentimiento.
Al elegir una ruta, la app toma exclusivamente los costes de las alternativas
aceptadas que acaba de mostrar, actualiza el estado y guarda localmente un sobre
versionado por perfil en SQLite. Los pesos efectivos se envían al backend en un
campo distinto de los declarados. El backend vuelve a aplicar primero las
restricciones originales y solo después utiliza esa mezcla para ordenar lo que
sigue siendo compatible.

La fórmula se conserva en Python como referencia y se traduce a TypeScript para
que la actualización no dependa de la red. Un caso dorado compartido verifica
la igualdad de ambas implementaciones hasta doce decimales. El registro local
se limita a costes, identificadores técnicos, pesos, contador y día aproximado;
no contiene direcciones, coordenadas, geometrías, instrucciones ni audio.

## Fuentes internas

- [Arquitectura](../architecture.md).
- [Modelo de dominio](../research/modelo-dominio-accesibilidad.md).
- [Integración de ORS](../research/integracion-openrouteservice.md).
- [Generación de candidatas](../research/generacion-rutas-candidatas.md).
- [Calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).
- [Calibración del corredor OSM](../evaluation/calibracion-corredor-osm.md).
- [Puntuación explicable](../research/scoring-explicable.md).
- [Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md).
- [Evaluación del aprendizaje](../evaluation/calibracion-aprendizaje-adaptativo.md).
- [Integración móvil del aprendizaje](../research/integracion-aprendizaje-adaptativo-app.md).
- [Ajustes locales y modos de presentación](../product/ajustes-presentacion.md).
- [Seguridad](../safety.md).
- [Accesibilidad](../accessibility-spec.md).
