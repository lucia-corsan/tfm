# Alcance y plan de desarrollo del MVP

Fecha inicial: 7 de agosto de 2026
Última actualización: 11 de agosto de 2026
Estado: `En implementación`
Ámbito piloto: Moncloa–Argüelles–Príncipe Pío, Madrid

## 1. Propósito del documento

Este documento reúne, desde el principio, la explicación del flujo de datos y el plan de desarrollo del MVP. Su objetivo es dejar claramente diferenciados:

- El motor que calcula los recorridos.
- Los datos que permiten analizar esos recorridos.
- Las fuentes que solo aportan evidencia complementaria.
- Las funciones deterministas del sistema.
- La contribución de inteligencia artificial.
- El alcance realista de GPS, rerouting y aprendizaje adaptativo.

El sistema no afirmará que una ruta es accesible de forma absoluta. Presentará alternativas con un índice de adecuación al perfil, confianza, incertidumbre, razones y avisos. La ausencia de información nunca se interpretará como evidencia positiva.

## 2. Visión general del sistema

La aplicación permitirá a una persona ciega o con baja visión:

1. Configurar restricciones y preferencias de movilidad.
2. Introducir un origen y un destino.
3. Analizar una colección interna de rutas candidatas y recibir hasta tres
   alternativas peatonales finales.
4. Compararlas mediante criterios explicables.
5. Elegir una ruta conservando la decisión final.
6. Seguir instrucciones mediante TalkBack, TTS y controles accesibles.
7. Utilizar GPS mientras la pantalla de navegación esté abierta.
8. Confirmar un recálculo cuando el sistema detecte una posible desviación.
9. Permitir que los pesos de preferencias se adapten progresivamente a sus elecciones.

El flujo general será:

```text
Usuario introduce origen, destino y perfil
                    ↓
    ORS genera un primer conjunto de candidatas
                    ↓
 deduplicación y posible ampliación escalonada
                    ↓
       OSM enriquece cada candidata con atributos
                    ↓
 Restricciones críticas eliminan rutas incompatibles
                    ↓
 Scoring y aprendizaje ordenan las rutas restantes
                    ↓
 La app muestra hasta tres rutas con adecuación, confianza e incertidumbre
                    ↓
 GPS detecta una posible desviación
                    ↓
 El usuario confirma y ORS calcula una nueva ruta
```

Mapillary queda fuera del flujo operativo principal. Se utilizará como evidencia complementaria para la evaluación y, en el futuro, para posibles experimentos visuales.

## 3. Qué es ORS y para qué se utiliza

ORS significa OpenRouteService. Es un motor de cálculo de rutas construido principalmente sobre una red derivada de OpenStreetMap. Cumple una función equivalente a un servicio de direcciones: recibe coordenadas y devuelve recorridos navegables.

La aplicación enviará a ORS:

- Coordenadas de origen.
- Coordenadas de destino.
- Perfil peatonal.
- Opciones compatibles, como evitar escalones.

ORS devolverá:

- Geometría de cada ruta.
- Distancia y duración estimadas.
- Instrucciones paso a paso.
- Segmentos y maniobras.
- Información adicional disponible, como identificadores de vías OSM, superficie, tipo de vía o pendiente.

La API no enumera todos los caminos posibles. Las alternativas devueltas forman
un conjunto inicial que puede omitir recorridos mejores después del análisis de
accesibilidad. El MVP evaluará una ampliación escalonada y deduplicada, pero
seguirá mostrando como máximo tres rutas para mantener una comparación
comprensible con TalkBack.

Documentación oficial relevante:

- [Directions: peticiones y respuestas](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types)
- [Opciones de routing](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/routing-options)
- [Información adicional de una ruta](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/extra-info/)

### 3.1. Por qué ORS no resuelve todo el problema

ORS ya utiliza internamente una red generada a partir de OSM. Sin embargo, su API pública no permite expresar completamente el modelo personalizado de este TFM. Puede evitar determinados elementos, como escalones, pero no calcular directamente «la mejor ruta para esta persona ciega según sus preferencias y tolerancia a la incertidumbre».

Los modelos personalizados de ORS son experimentales y no están disponibles en la API pública. Por ello, ORS se utilizará para generar recorridos técnicamente transitables y el sistema propio realizará después:

- Enriquecimiento de características.
- Aplicación de restricciones críticas adicionales.
- Cálculo de adecuación al perfil.
- Estimación de confianza e incertidumbre.
- Selección de alternativas diversas.
- Aprendizaje de preferencias.

### 3.2. Uso de ORS en el rerouting

Cuando el GPS detecte una posible desviación y el usuario confirme que desea recalcular, la posición actual se convertirá en el nuevo origen:

```text
posición GPS actual → ORS → nuevas rutas hasta el destino
```

La ruta anterior se mantendrá hasta que exista una respuesta válida. Si ORS falla, la aplicación informará del problema sin dejar a la persona sin las instrucciones anteriores.

## 4. Para qué sirven los datos descargados de OSM

El estudio exploratorio descargó grupos de atributos relacionados con accesibilidad:

- Pasos de peatones.
- Semáforos.
- Señales acústicas o vibratorias.
- Pavimento táctil.
- Bordillos y rebajes.
- Aceras declaradas.
- Escaleras.
- Superficie.
- Pendiente.
- Rampas o información de silla de ruedas.

Hasta ahora estos datos se han utilizado para:

1. Medir la disponibilidad de información dentro de la M-30.
2. Comparar densidad y diversidad temática entre celdas.
3. Identificar limitaciones y atributos desconocidos.
4. Seleccionar Moncloa–Argüelles–Príncipe Pío como área piloto.

El principal resultado procesado es:

```text
data/processed/osm_accessibility_points.parquet
```

Los JSON de `data/raw/` son cachés reproducibles de las respuestas de Overpass. Evitan repetir consultas externas y conservan la instantánea utilizada en el estudio.

### 4.1. Limitación del dataset exploratorio

El Parquet contiene puntos representativos. En el caso de vías o relaciones, la consulta exploratoria utilizó su centro. Esto es adecuado para medir densidad espacial, pero no permite asociar con precisión todos los atributos a cada tramo recorrido.

Por ejemplo, que el centro de una vía con `sidewalk=*` esté cerca de una ruta no demuestra que toda la geometría de esa vía coincida con ella. Tampoco basta para conocer de forma fiable la continuidad de una acera.

Por tanto, `osm_accessibility_points.parquet` no se utilizará como única fuente del scoring de rutas.

### 4.2. Dataset OSM específico para rutas

Para el MVP se ha preparado un segundo conjunto de datos limitado al área piloto
y orientado al análisis de recorridos. Conserva las geometrías y etiquetas
necesarias para relacionar una ruta con:

- Vías y segmentos utilizados.
- Cruces próximos o atravesados.
- Escaleras confirmadas.
- Semáforos y señales acústicas.
- Aceras y superficies conocidas.
- Atributos críticos ausentes o desconocidos.

ORS puede devolver identificadores de vías OSM mediante información adicional.
Estos identificadores se combinarán con la instantánea dirigida al corredor de
cada ruta. Las consultas a Overpass no forman parte del camino crítico de cada
petición de usuario: los datos del área piloto se descargan, validan y almacenan
previamente. La preparación y sus resultados se detallan en
[Preparación de OSM para rutas](../research/preparacion-osm-para-rutas.md).

El flujo de enriquecimiento será:

```text
ORS calcula una ruta
        ↓
se obtiene su geometría y los IDs OSM disponibles
        ↓
se relaciona con atributos OSM del área piloto
        ↓
se construye un vector de características
        ↓
se aplican restricciones, scoring y aprendizaje
```

Ejemplo conceptual de vector de características:

```text
Ruta A
- distancia: 1.200 m
- cruces: 8
- cruces semaforizados: 5
- cruces complejos: 1
- escaleras confirmadas: 0
- acera conocida: 65 %
- información desconocida: 24 %
- instrucciones: 11
```

La ausencia de una etiqueta OSM no demostrará la ausencia física del elemento. Los atributos se representarán como favorables, desfavorables o desconocidos.

## 5. Para qué sirven los datos de Mapillary

Mapillary ofrece fotografías geolocalizadas a nivel de calle. En el estudio se han descargado metadatos, no un corpus masivo de imágenes:

- Identificador de imagen.
- Coordenadas.
- Fecha de captura.

El resultado procesado es:

```text
data/processed/mapillary_image_points.parquet
```

Este archivo indica dónde existe cobertura fotográfica potencial. No contiene por sí mismo información sobre obstáculos ni demuestra que una calle sea accesible.

### 5.1. Uso actual

Mapillary ha servido para:

- Medir la cobertura visual disponible.
- Complementar la selección del área piloto.
- Identificar zonas donde será más fácil realizar una inspección visual.

### 5.2. Uso previsto

Durante el MVP se utilizará para:

- Revisar manualmente recorridos de evaluación.
- Contrastar algunos atributos OSM dudosos.
- Documentar casos de falta de información.
- Seleccionar ejemplos visuales para la memoria.

No se penalizará una ruta por no tener imágenes Mapillary. La falta de fotografías representa falta de evidencia visual, no falta de accesibilidad.

Un posible análisis mediante VLM queda como extensión experimental posterior. Mapillary no intervendrá en tiempo real en el cálculo ni en el rerouting del MVP.

## 6. Responsabilidad de cada componente

| Componente | Responsabilidad | Qué no debe hacer |
|---|---|---|
| ORS | Generar geometría, distancia, duración e instrucciones | Decidir por sí solo qué ruta es adecuada para cada usuario |
| OSM exploratorio | Medir cobertura y justificar el área piloto | Puntuar con precisión todos los tramos usando solo centros geométricos |
| OSM orientado a rutas | Enriquecer cada recorrido con atributos estructurados | Interpretar un tag ausente como ausencia física |
| Mapillary | Aportar evidencia visual complementaria | Determinar accesibilidad por la mera existencia de imágenes |
| Scoring | Calcular adecuación explicable | Ocultar incertidumbre o saltarse restricciones críticas |
| Aprendizaje | Ajustar preferencias graduables | Modificar reglas críticas de seguridad |
| GPS | Estimar la posición durante la navegación | Considerar una única muestra imprecisa como desviación real |
| Rerouting | Solicitar nuevas rutas tras confirmación | Recalcular silenciosamente o prometer seguridad |

## 7. Alcance técnico del MVP

El MVP se desarrollará con:

- Python 3.9.
- FastAPI, Pydantic v2, `httpx` asíncrono y `pytest`.
- React Native, Expo y TypeScript.
- Android como plataforma prioritaria.
- GPS real únicamente en primer plano.
- Rerouting conservador tras confirmación.
- Aprendizaje adaptativo local y acotado.
- ORS para rutas reales y *fixtures* para pruebas reproducibles.
- TalkBack, TTS y entrada por voz con alternativas accesibles.

Quedan fuera del MVP:

- Ubicación en segundo plano.
- Navegación con la pantalla apagada.
- Rerouting automático.
- iOS.
- VLM o LLM en producción.
- Sustitución de ORS por un motor propio.

El rerouting mejora el realismo y la demostración, pero no constituye inteligencia artificial. La contribución académica principal será el sistema híbrido de decisión y aprendizaje.

## 8. Arquitectura prevista

```text
backend/
  routing/       # ORS, fixtures y rerouting
  enrichment/    # atributos OSM asociados a las rutas
  scoring/       # restricciones, adecuación, confianza y diversidad
  narration/     # explicaciones e instrucciones deterministas
  feedback/      # aprendizaje de preferencias y límites de seguridad
app/             # React Native + Expo + TypeScript
ml/              # evaluación reproducible del aprendizaje
tests/           # pruebas de dominio, API e integración
docs/            # especificación, arquitectura, seguridad y memoria de decisiones
notebooks/       # análisis exploratorios reproducibles
```

Los proveedores de routing tendrán una interfaz común:

- `FixtureRouteProvider`: rutas locales, deterministas y disponibles sin red.
- `OrsRouteProvider`: rutas reales solicitadas a OpenRouteService.

Esta separación permitirá desarrollar y probar la aplicación aunque ORS no esté disponible.

## 9. API prevista

### `GET /api/v1/health`

Comprueba que el backend está funcionando.

### `GET /api/v1/places/search?q=...`

Busca ubicaciones dentro del área piloto. La primera implementación utiliza un
catálogo local de cuatro lugares como base reproducible y privada. Un proveedor
externo podrá añadirse después, manteniendo el catálogo como respaldo.

### `POST /api/v1/routes/compare`

Recibe:

- Origen.
- Destino.
- Perfil.
- Restricciones críticas.
- Pesos declarados o adaptados.

Devuelve entre una y tres rutas con:

- Geometría e instrucciones.
- Distancia y duración.
- Índice de adecuación al perfil.
- Confianza.
- Porcentaje de incertidumbre.
- Características empleadas.
- Restricciones, razones y avisos.
- Tipo de alternativa.

### `POST /api/v1/routes/reroute`

Recibe la posición actual confirmada, el destino y el estado del perfil. Devuelve nuevas alternativas aplicando las mismas restricciones, pesos y reglas de incertidumbre.

Las coordenadas de navegación no se almacenarán ni se incluirán en los registros. La clave `ORS_API_KEY` permanecerá únicamente en el `.env` del backend.

## 10. Scoring explicable y restricciones

Cada ruta se transformará en un vector de costes normalizados:

- Distancia y desvío.
- Cruces complejos.
- Cruces semaforizados.
- Evidencia sobre aceras.
- Escalones.
- Complejidad de orientación.
- Número de giros e instrucciones.
- Pendiente, cuando exista evidencia suficiente.
- Proporción de atributos desconocidos.

Los pesos iniciales procederán de preferencias de importancia baja, media o alta y se normalizarán para sumar uno.

Antes de puntuar se aplicarán restricciones críticas:

- Evitar escaleras cuando así se configure.
- Evitar vías con falta confirmada de acceso peatonal.
- Evitar cruces incompatibles con el perfil cuando exista evidencia.
- Rechazar desvíos superiores al máximo aceptado.
- Descartar rutas con geometrías inválidas o bucles anómalos.

Una ruta con un incumplimiento crítico confirmado se descartará. Un dato crítico desconocido reducirá la confianza y generará un aviso; nunca se contabilizará como cumplimiento favorable.

El resultado no se denominará «nivel de accesibilidad», sino «adecuación al perfil». Se mantendrán separados:

- Adecuación: resultado del coste multicriterio.
- Confianza: cobertura y calidad de la evidencia utilizada.
- Incertidumbre: atributos desconocidos y limitaciones concretas.

## 11. Selección y diversidad de alternativas

La aplicación intentará presentar:

1. Ruta recomendada para el perfil actual.
2. Ruta con menos cruces complejos.
3. Ruta más sencilla de seguir, o la más corta si resulta más útil.

El solapamiento se estima de forma simétrica sobre líneas proyectadas a metros:

```text
solapamiento = mínimo(
    longitud de A dentro del corredor de B / longitud de A,
    longitud de B dentro del corredor de A / longitud de B
)
```

La regla calibrada considera casi duplicadas únicamente las rutas con:

- Tolerancia espacial de 2 metros.
- Solapamiento mínimo del 98 %.
- Diferencia máxima de longitud del 3 %.

La hipótesis anterior de 10 metros y 85 % se descartó porque generó falsos
positivos. El experimento completo se describe en
[la calibración espacial](../evaluation/calibracion-deduplicacion-espacial.md).

Si no existen tres opciones útiles, la aplicación mostrará dos o una y explicará el motivo.

## 12. GPS y rerouting

La aplicación utilizará seguimiento GPS solo mientras la pantalla de navegación esté activa. El detector de desviación será una función TypeScript independiente y fácil de probar.

Valores iniciales configurables:

- Ignorar muestras con precisión peor de 25 metros.
- Considerar una posible desviación a más de 30 metros de la ruta.
- Exigir tres muestras consecutivas durante al menos 10 segundos.
- Esperar 60 segundos después de recalcular antes de emitir otra alerta.

Los umbrales de 20, 30 y 40 metros se compararán mediante recorridos GPS simulados y, si es viable, una prueba física controlada.

Cuando se detecte una posible desviación:

1. TalkBack y TTS anunciarán la situación sin afirmar que sea definitiva.
2. Se pedirá confirmación al usuario.
3. Solo después de confirmar se enviará la posición actual al backend.
4. ORS calculará nuevas rutas hasta el destino.
5. La ruta anterior se conservará hasta recibir una alternativa válida.
6. Un fallo externo producirá un aviso recuperable.

Las instrucciones podrán avanzar automáticamente al aproximarse al siguiente punto, pero siempre existirán botones accesibles para avanzar y retroceder manualmente.

### 12.1. Relación entre `narration`, TalkBack y TTS

El módulo `narration` no controlará directamente TalkBack ni el motor TTS. Su responsabilidad será transformar datos estructurados y previamente validados en instrucciones deterministas. TalkBack y TTS serán dos canales diferentes para comunicar ese mismo contenido.

```text
Datos estructurados de la maniobra
        ↓
narration genera una instrucción determinista
        ↓
┌──────────────────────┬────────────────────────┐
│ TalkBack             │ TTS de la aplicación   │
│ lee la interfaz      │ reproduce la instrucción│
└──────────────────────┴────────────────────────┘
```

Por ejemplo, a partir de una maniobra, una distancia y un aviso estructurado, `narration` podría producir:

> En 20 metros, gira a la izquierda en la calle Princesa. Atención: no hay información confirmada sobre señal acústica en el próximo cruce.

TalkBack leerá el contenido presentado por la interfaz mediante propiedades como `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`, `accessibilityState` y `accessibilityLiveRegion`. También permitirá recorrer los controles de instrucción anterior, repetición y siguiente.

El TTS de la aplicación reproducirá el texto generado por `narration`, bien al pulsar «Escuchar instrucción» o, cuando resulte apropiado, al avanzar a una nueva maniobra.

Ambos canales utilizarán una única fuente de verdad. El modelo de dominio incluirá un objeto equivalente a:

```ts
interface NavigationInstruction {
  shortText: string;
  detailedText: string;
  warning?: string;
  distanceMeters?: number;
  maneuver: "straight" | "left" | "right" | "arrive";
}
```

Este objeto evitará que el texto visible, la etiqueta accesible y la locución transmitan información contradictoria. `shortText` servirá para una consulta rápida; `detailedText` contendrá la instrucción completa; y `warning` conservará por separado cualquier aviso obligatorio.

Se evitará que TalkBack y el TTS hablen simultáneamente:

- La app comprobará mediante `AccessibilityInfo` si hay un lector de pantalla activo.
- Con TalkBack activo, los cambios se comunicarán prioritariamente mediante anuncios y regiones vivas de accesibilidad.
- No se iniciará una locución de `expo-speech` que pueda solaparse con TalkBack;
  los controles exclusivos de la voz propia se ocultarán y se explicará que
  TalkBack asume la lectura.
- Una única región dinámica moderada comunicará la nueva instrucción. El
  contador no generará un segundo anuncio; los avisos críticos utilizarán
  prioridad alta de forma puntual.
- Sin lector de pantalla activo existirá un botón accesible para escuchar o
  detener deliberadamente la instrucción.
- Sin lector de pantalla activo, el usuario podrá habilitar la reproducción automática mediante TTS.

La narración será determinista y fácil de probar:

- Solo verbalizará datos calculados, recibidos de ORS o confirmados mediante el enriquecimiento.
- No inventará nombres de calles, obstáculos ni condiciones de accesibilidad.
- Los avisos críticos y de incertidumbre no podrán omitirse por razones de brevedad.
- Las mismas entradas producirán la misma instrucción.
- Las pruebas comprobarán que cada aviso obligatorio aparece en las condiciones correspondientes.

Esta separación permite verificar la fidelidad de las explicaciones y deja claro que `narration` genera contenido fiable, mientras que TalkBack y TTS son mecanismos de presentación.

## 13. Inteligencia artificial y aprendizaje adaptativo

### 13.1. Sistema híbrido de IA

La contribución se justificará como un sistema híbrido de inteligencia artificial explicable:

- Componente simbólico: restricciones, estados conocidos/desconocidos y reglas de seguridad.
- Componente multicriterio: ranking personalizado de alternativas.
- Componente estadístico: aprendizaje en línea de preferencias latentes.
- Componente explicable: generación de razones a partir de las variables utilizadas.

TTS, reconocimiento de voz, GPS y rerouting se documentarán como tecnologías auxiliares, no como contribuciones propias de IA.

No se añadirá un LLM únicamente para aumentar el número de componentes de IA. Las explicaciones del MVP procederán de plantillas y datos estructurados para garantizar fidelidad. Un LLM solo tendría sentido en un experimento posterior que comparase comprensión, consistencia y alucinaciones frente a las plantillas.

### 13.2. Aprendizaje en línea

Los pesos iniciales procederán de las preferencias declaradas. Cuando el usuario pulse explícitamente «Elegir esta ruta», se comparará el vector de la ruta elegida con los de las alternativas descartadas.

Se utilizará un modelo de regresión logística por pares (*pairwise*) o Bradley–Terry:

- Actualización mediante descenso de gradiente en línea.
- Pesos no negativos y normalizados.
- Regularización hacia las preferencias declaradas.
- Variación máxima limitada en cada interacción.
- Restricciones críticas completamente externas al modelo.

Para reducir la inestabilidad inicial:

- Las primeras tres elecciones funcionarán en observación.
- La influencia aprendida aumentará gradualmente.
- La combinación inicial no superará un 50 % de influencia aprendida.
- El usuario podrá desactivar y reiniciar el aprendizaje.
- La interfaz explicará qué preferencias han ganado o perdido importancia.

SQLite guardará únicamente:

- Vectores de características.
- Alternativa elegida.
- Fecha aproximada.
- Pesos anteriores y posteriores.

No se almacenarán audio, direcciones textuales ni coordenadas exactas.

## 14. Evaluación académica

Se compararán tres sistemas:

1. Ruta más corta.
2. Ranking fijo con preferencias declaradas.
3. Ranking adaptativo con elecciones observadas.

Métricas previstas:

- Coincidencia con la ruta preferida.
- Precisión de elecciones.
- Evolución y error de los pesos.
- Arrepentimiento acumulado (*regret*).
- Interacciones necesarias para estabilizar el modelo.
- Incremento de distancia respecto a la ruta más corta.
- Cruces complejos evitados.
- Número de giros e instrucciones.
- Porcentaje de información desconocida.
- Confianza de la ruta seleccionada.
- Fidelidad de las explicaciones.
- Violaciones críticas, cuyo valor esperado debe ser siempre cero.

La evaluación del rerouting medirá:

- Desviaciones correctamente detectadas.
- Falsas alertas producidas por ruido GPS.
- Tiempo necesario para detectar una desviación.
- Diferencias entre umbrales de 20, 30 y 40 metros.
- Comportamiento con permiso denegado o precisión insuficiente.
- Conservación de la ruta anterior ante errores de ORS.

Mapillary podrá utilizarse para una inspección manual limitada de casos seleccionados, dejando claro que la imagen no constituye por sí sola una verdad de accesibilidad.

## 15. Hoja de ruta de cuatro semanas

### Semana 1: dominio e IA explicable

- Configurar Python 3.9, backend, app Android y CI.
- Formalizar especificaciones y criterios de aceptación.
- Crear modelos de perfil, ruta, características e incertidumbre.
- Implementar restricciones y scoring mediante funciones puras.
- Crear fixtures del área piloto.
- Completar el flujo perfil → rutas locales → comparación.
- Añadir pruebas de seguridad, scoring, diversidad y explicación.

Entrega: ranking explicable funcionando con datos reproducibles.

### Semana 2: datos y rutas reales

- Integrar búsqueda de lugares y ubicaciones piloto.
- Implementar proveedores intercambiables de fixtures y ORS.
- Crear caché reproducible de respuestas externas.
- Preparar el dataset OSM orientado a rutas.
- Enriquecer recorridos con atributos OSM.
- Completar perfil, búsqueda, resultados y comparación accesible.
- Tratar errores externos y ausencia de alternativas.

Entrega: comparación completa con rutas locales y reales.

### Semana 3: GPS, navegación y rerouting

- Integrar permisos y GPS en primer plano.
- Calcular distancia entre posición y geometría.
- Implementar el detector conservador de desviación.
- Añadir confirmación y endpoint de rerouting.
- Incorporar navegación paso a paso, TTS y controles manuales.
- Probar rutas GPS simuladas y, si es viable, una prueba controlada.
- Revisar el flujo completo con TalkBack.

Entrega: desviación detectada, confirmada y recalculada de extremo a extremo.

### Semana 4: aprendizaje, evaluación y estabilización

- Implementar el aprendizaje local por pares (*pairwise*).
- Añadir persistencia, reinicio y explicación de cambios.
- Ejecutar experimentos con perfiles sintéticos.
- Comparar ruta corta, ranking estático y ranking adaptativo.
- Evaluar el detector de desviación y los falsos reroutings.
- Probar permisos denegados, GPS impreciso y fallos de ORS.
- Completar documentación, resultados y limitaciones.
- Reservar los últimos días para errores críticos y preparación de la demo.

Entrega: MVP, experimento reproducible y evidencias para la memoria.

## 16. Pruebas y criterios de aceptación

### 16.1. IA y seguridad

- Un atributo desconocido nunca mejora una ruta.
- Una restricción crítica confirmada elimina la alternativa.
- El aprendizaje nunca modifica restricciones críticas.
- Los pesos son no negativos y suman uno.
- Una única elección no produce un cambio brusco.
- El modelo converge hacia preferencias sintéticas conocidas.
- Cada explicación coincide con los factores calculados.
- Reiniciar el aprendizaje restaura las preferencias declaradas.

### 16.2. GPS y rerouting

- Una muestra aislada o imprecisa no activa el rerouting.
- Tres muestras fiables fuera de ruta solicitan confirmación.
- Rechazar la confirmación conserva la ruta.
- Un fallo de ORS mantiene disponibles las instrucciones anteriores.
- La nueva ruta respeta el mismo perfil y restricciones.
- El GPS se detiene al abandonar la navegación.
- La app sigue siendo utilizable si se deniega el permiso.

### 16.3. Accesibilidad

- Todos los controles tienen etiqueta, rol y estado accesibles.
- Los cambios de carga, error y rerouting se anuncian con TalkBack.
- Ninguna información depende exclusivamente del color o del mapa.
- Los objetivos táctiles tienen al menos 44 por 44 puntos.
- El foco mantiene un orden lógico.
- El usuario puede navegar sin reconocimiento de voz ni GPS.

### 16.4. Criterios finales

- El proyecto se ejecuta con Python 3.9.
- La app funciona como development build Android.
- El perfil y los pesos aprendidos sobreviven al reinicio.
- Se pueden comparar rutas reales dentro del área piloto.
- La navegación utiliza GPS en primer plano.
- Las desviaciones no se determinan a partir de una única muestra ruidosa.
- El rerouting requiere confirmación.
- Toda ruta expone adecuación, confianza, incertidumbre y razones.
- El flujo principal es compatible con TalkBack.
- La evaluación demuestra el valor añadido del ranking adaptativo.
- La memoria diferencia la contribución de IA de ORS, TTS, voz, GPS y rerouting.

## 17. Buenas prácticas de implementación

- Trabajar mediante slices verticales pequeños y demostrables.
- Mantener scoring, restricciones y aprendizaje como lógica pura cuando sea posible.
- Separar dominio, proveedores externos y presentación.
- Usar modelos Pydantic y tipos TypeScript centrales.
- Inyectar los proveedores para alternar entre fixtures y ORS.
- Añadir pruebas y documentación con cada comportamiento.
- Mantener commits pequeños y descriptivos.
- Registrar cambios de scoring, seguridad o arquitectura en el journal.
- No incluir secretos, audio ni coordenadas de navegación en los registros.
- No introducir una dependencia o modelo de IA sin una pregunta de investigación y una métrica de evaluación asociadas.

Una funcionalidad se considerará terminada cuando incluya implementación, pruebas, tratamiento de errores, revisión de accesibilidad y documentación suficiente para justificarla en la memoria.
