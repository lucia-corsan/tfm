# Aprendizaje adaptativo de preferencias

Estado: `Propuesto`  
Última actualización: 12 de agosto de 2026
Responsabilidad principal: `research`

## Problema que resuelve

Adaptar gradualmente la clasificación a preferencias latentes observadas en elecciones
explícitas sin modificar restricciones de seguridad.

## Requisitos

- Aprendizaje local y desactivable.
- Primeras tres elecciones en observación.
- Actualizaciones pequeñas, regularizadas y explicables.
- Pesos no negativos y normalizados.
- Influencia aprendida inicial limitada al 50 %.
- Reinicio completo por parte del usuario.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Pesos fijos | Muy simple | No aprende preferencias latentes | Sistema de referencia |
| Aprendizaje en línea por pares (*pairwise*) | Aprende de elecciones y es interpretable | Necesita interacciones | Adoptada |
| LLM como decisor | Flexible | No garantiza seguridad ni reproducibilidad | Descartada |

## Decisión adoptada

Se utilizará regresión logística por pares (*pairwise*) o Bradley–Terry con
descenso de gradiente en línea y regularización hacia las preferencias
declaradas.

## Justificación

Cada elección compara una ruta seleccionada con alternativas descartadas, que
es la señal natural disponible. El modelo es suficientemente expresivo para el
TFM y permite inspeccionar la evolución de los pesos.

## Datos de entrada y salida

Entrada: vectores de características y alternativa elegida. Salida: pesos
graduables actualizados y explicación de sus cambios. No se necesitan
coordenadas exactas, audio ni direcciones escritas.

## Implementación

Pendiente para la semana 4. Las restricciones críticas permanecerán fuera del
vector aprendido.

### Estado actual y persistencia prevista

En la versión actual todavía no existe persistencia de preferencias. Los dos
perfiles de demostración se definen como constantes en la aplicación y el perfil
seleccionado se mantiene únicamente en la memoria del componente mediante
`useState`. Al recargar o cerrar la app se recupera el perfil equilibrado. El
backend recibe las restricciones y los pesos en cada petición, calcula el
ranking y no guarda un perfil de usuario.

Cuando se implemente el aprendizaje adaptativo, las preferencias declaradas y
los pesos aprendidos se guardarán en SQLite dentro del dispositivo Android.
SQLite es una base de datos, pero en este diseño será local: no habrá una base
remota, una cuenta de usuario ni sincronización en la nube. La app enviará al
backend únicamente el perfil activo necesario para calcular cada comparación.

Esta elección sigue el enfoque *local-first*, reduce la exposición de datos
personales y permite conservar las preferencias sin conexión. Como
contrapartida, el aprendizaje pertenecerá a un único dispositivo y se perderá
si se desinstala la aplicación o se borran sus datos. Para el alcance del TFM,
esta limitación es preferible a introducir autenticación, sincronización y una
infraestructura remota que no aportan valor al experimento principal.

La base local almacenará pesos declarados y aprendidos, vectores de
características, la alternativa elegida, una fecha aproximada y los estados de
pesos anterior y posterior. No guardará direcciones escritas, coordenadas
exactas, audio ni recorridos GPS. También se ofrecerán controles para desactivar
el aprendizaje y restablecer los pesos declarados.

## Pruebas

- Una elección aislada no causa cambios bruscos.
- Convergencia hacia preferencias sintéticas conocidas.
- Reinicio restaura los pesos declarados.
- Cero violaciones críticas.

## Resultados

Pendiente.

## Riesgos y limitaciones

- Pocas interacciones pueden producir estimaciones inestables.
- Elegir una ruta no implica que todos sus atributos sean preferidos.
- La evaluación con perfiles sintéticos no sustituye un estudio con usuarios.

## Texto base para la memoria

La aportación de aprendizaje automático estima preferencias relativas a partir
de elecciones por pares (*pairwise*). Su influencia se introduce gradualmente y permanece
subordinada a reglas simbólicas de seguridad e incertidumbre.

## Trabajo pendiente

- [ ] Fijar formulación y tasa de aprendizaje.
- [ ] Implementar persistencia local.
- [ ] Crear perfiles sintéticos y sistemas de referencia.
- [ ] Medir el arrepentimiento acumulado (*regret*), la convergencia y la estabilidad.
