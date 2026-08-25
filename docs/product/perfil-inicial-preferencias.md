# Perfil inicial y preferencias de comparación

Estado: `Validado`
Última actualización: `21 de agosto de 2026`
Responsabilidad principal: `product`

## Problema que resuelve

Una misma ruta peatonal no resulta igual de adecuada para todas las personas.
La distancia, los escalones, la complejidad de los cruces, la pendiente, la
calidad de la documentación disponible o el número de giros pueden tener una
importancia distinta en cada caso. Por ello, la aplicación no debe deducir las
necesidades a partir de una etiqueta médica ni imponer un único perfil de
«persona ciega».

El cuestionario inicial recoge decisiones funcionales: qué debe excluirse, qué
desvío se acepta y qué factores deben pesar más al comparar alternativas. Las
respuestas se convierten en parámetros explícitos del mismo sistema de
clasificación que se describe en [Scoring explicable](../research/scoring-explicable.md).

## Requisitos

- Preguntar por situaciones concretas de movilidad, no por diagnósticos.
- Distinguir límites obligatorios de preferencias graduables.
- Explicar la consecuencia de cada respuesta en lenguaje cotidiano.
- Permitir omitir el cuestionario y conservar dos perfiles generales fáciles de
  entender: «Preferencias equilibradas» y «Priorizar cruces sencillos».
- Mantener activas las restricciones críticas que no deben depender de una
  preferencia.
- No utilizar la ausencia de datos como evidencia favorable.
- Pedir consentimiento separado para el aprendizaje adaptativo y dejarlo
  desactivado de manera predeterminada.
- Guardar las respuestas solo en el dispositivo.
- No guardar nombre, diagnóstico, direcciones, coordenadas, audio ni trazas GPS
  como parte del perfil.
- Permitir revisar el cuestionario sin volver a escribir origen y destino.
- Mantener cada pregunta en una pantalla independiente y con controles
  recorribles mediante TalkBack y teclado.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Preguntar el grado o tipo de discapacidad | Cuestionario corto | Una etiqueta no determina las necesidades de movilidad y puede producir inferencias injustificadas | Descartada |
| Preguntar si se usa bastón, perro guía o una ayuda concreta | Aporta contexto | No permite deducir de forma fiable qué ruta prefiere la persona y recoge información innecesaria | Descartada |
| Ofrecer dos perfiles cerrados | Muy rápido | Oculta diferencias relevantes y limita la personalización | Se conserva solo como demostración cuando no existe perfil |
| Pedir números o porcentajes para cada factor | Gran precisión aparente | Exige comprender el modelo y genera una carga innecesaria | Descartada |
| Usar cuatro niveles verbales: ninguna, baja, media y alta | Comprensible, breve y traducible a pesos | La escala es ordinal, no una medición clínica | Adoptada |
| Tratar todas las respuestas como pesos | Implementación simple | Una ruta incompatible podría seguir apareciendo si compensa en otros factores | Descartada |
| Separar restricciones y pesos | Impide compensar barreras críticas y conserva preferencias flexibles | Requiere explicar dos comportamientos | Adoptada |
| Activar el aprendizaje por defecto | Produce personalización antes | No existe consentimiento explícito y puede empeorar un perfil inicial ya preciso | Descartada |
| Guardar el perfil en un servidor | Facilita sincronización entre dispositivos | Aumenta la exposición de datos y no es necesaria para el MVP | Descartada |
| Guardarlo en SQLite local | Funciona sin cuenta y minimiza datos | No se sincroniza entre dispositivos | Adoptada |

## Decisión adoptada

### Dos modos de comparación según la configuración

La aplicación distingue explícitamente la procedencia del perfil mediante
`profileMode`:

- `generic`: la persona omitió el cuestionario. Antes de comparar puede elegir
  entre los dos perfiles generales «Preferencias equilibradas» y «Priorizar
  cruces sencillos». Cada uno conserva su propio estado adaptativo local y la
  activación se solicita en el paso siguiente de esa comparación.
- `personalized`: la persona terminó las catorce preguntas. La pantalla de
  selección de perfiles generales desaparece y se utiliza un único perfil
  personal, construido con sus restricciones y prioridades. Si autorizó el
  aprendizaje, los pesos efectivos combinan gradualmente lo declarado con las
  elecciones observadas.

Esta distinción evita presentar tres fuentes de preferencia simultáneas. Cuando
existe un cuestionario completo, preguntar además por «equilibrado» o «cruces
sencillos» obligaría a elegir una etiqueta que podría contradecir respuestas
mucho más precisas. Cuando el cuestionario se omite, los dos perfiles permiten
usar la aplicación sin inventar necesidades personales ni bloquear el flujo.

«Mostrar solo las rutas que le interesan» no significa ocultar alternativas por
una regla opaca. El backend mantiene el mismo proceso: primero descarta las
rutas incompatibles con las restricciones críticas y después ordena hasta tres
alternativas válidas mediante los pesos personales —declarados y, si procede,
aprendidos—. Así la persona conserva capacidad de elección y puede consultar
adecuación, confianza, incertidumbre y razones para cada alternativa.

### Estructura del cuestionario

El flujo contiene catorce preguntas. Las dos primeras fijan el tratamiento de
los escalones y el desvío máximo; las ocho siguientes expresan prioridades del
ranking; y las cuatro últimas configuran la voz, la presentación y el
consentimiento del aprendizaje.

| N.º | Pregunta resumida | Efecto real |
| ---: | --- | --- |
| 1 | Tratamiento de escalones confirmados | «Excluir» activa `avoid_steps`; «dar menos prioridad» aplica un coste alto sin excluir; «solo informar» deja el peso de escalones a cero, aunque conserva el aviso |
| 2 | Recorrido adicional aceptable | Fija un límite de 1,10, 1,25, 1,50 o 2,00 veces la distancia de referencia |
| 3 | Recorrer la menor distancia | Peso de `distance` |
| 4 | Evitar cruces numerosos o complejos | Peso de `complex_crossings` |
| 5 | Preferir ayudas confirmadas en cruces | Peso de `crossing_support` |
| 6 | Preferir aceras y acceso bien documentados | Peso de `sidewalk_evidence` |
| 7 | Preferir información sobre superficie | Peso de `surface` |
| 8 | Preferir menos giros y cambios de dirección | Peso de `orientation_complexity` |
| 9 | Evitar pendientes pronunciadas | Peso de `slope` |
| 10 | Evitar alternativas con datos desconocidos | Peso de `uncertainty` |
| 11 | Uso de la voz propia de Rumbo | Lectura automática, lectura al pulsar «Escuchar» o voz desactivada |
| 12 | Velocidad de la voz propia | 0,8; 1,0; 1,25 o 1,5. Se omite si TalkBack está activo o si se desactiva la voz propia |
| 13 | Presentación visual | Conserva la preferencia por ajustes del sistema, texto mayor, contraste reforzado o ambos; nunca influye en el ranking |
| 14 | Aprendizaje de elecciones | Consentimiento explícito para el modelo adaptativo local; comienza desactivado |

Las preguntas de cruce se justifican porque la literatura documenta dificultades
específicas en intersecciones complejas y la utilidad de señales peatonales
accesibles. Las preguntas sobre distancia, complejidad, aceras, superficie,
pendiente y referencias cartográficas proceden de trabajos de planificación de
rutas adaptadas que muestran que la ruta más corta no siempre es la más
adecuada. La presentación y el audio se consultan por separado: son ajustes de
interfaz, no propiedades de movilidad ni señales de aprendizaje.

### Alcance de lo que evalúan las preguntas

El cuestionario no es una prueba médica, una escala de autonomía ni un
instrumento psicométrico validado. Tampoco pretende determinar cuánto ve una
persona, si sabe desplazarse de forma independiente o si una ruta es segura.
Recoge **preferencias funcionales declaradas para comparar rutas** en un momento
concreto: qué condiciones deben impedir que se recomiende una alternativa, qué
recorrido adicional se acepta y qué características deben tener más importancia.

Esta distinción es importante porque una misma condición visual no conduce a
una única estrategia de movilidad. Por eso se pregunta directamente por el
resultado deseado y no se intenta deducirlo a partir del diagnóstico, el uso de
bastón o perro guía, la edad o la experiencia tecnológica. La literatura se ha
utilizado para decidir qué temas era razonable incluir y para justificar su
relevancia, pero no valida por sí sola la redacción ni las opciones de respuesta.
Las buenas prácticas de construcción de cuestionarios recomiendan completar la
validez de contenido con revisión experta, prepruebas y entrevistas cognitivas
con la población destinataria (Boateng et al., 2018). Esa validación con
personas ciegas o con baja visión sigue siendo trabajo pendiente.

Además, las respuestas expresan preferencias, no verifican el entorno. Por
ejemplo, marcar como importante un semáforo acústico no hace que el sistema
suponga que existe: solo favorece una ruta cuando los datos disponibles lo
declaran. Si el atributo es desconocido, continúa siendo desconocido y reduce
la confianza.

### Análisis y fundamento de cada pregunta

#### 1. ¿Cómo debemos tratar los escalones confirmados?

- **Qué trata de evaluar:** la regla personal que debe aplicarse cuando los datos
  confirman que una alternativa contiene escalones. No evalúa la capacidad
  física de la persona ni intenta inferir por qué desea evitarlos.
- **Por qué se pregunta:** los escalones son una característica concreta del
  itinerario que puede convertir una ruta en inaceptable para unas personas y
  ser únicamente una información relevante para otras. Los trabajos de Cohen y
  Dalyot (2021) y Kammoun et al. (2010) defienden una selección adaptada a las
  necesidades del peatón y el uso de características de accesibilidad distintas
  de la distancia.
- **Cómo se interpreta:** «Excluir siempre» crea una restricción previa al
  ranking; «dar menos prioridad» conserva la ruta, pero aumenta su coste; «solo
  informar» no penaliza la puntuación, aunque mantiene el aviso.
- **Límite:** la regla solo se aplica como exclusión cuando los escalones están
  confirmados. La ausencia de una etiqueta OSM no demuestra que no existan.

#### 2. ¿Cuánto recorrido adicional aceptarías?

- **Qué trata de evaluar:** la disposición a intercambiar distancia por otras
  cualidades de la ruta, como cruces más sencillos o mejor evidencia.
- **Por qué se pregunta:** la ruta más corta es un punto de comparación útil,
  pero no representa necesariamente la alternativa preferida. La planificación
  adaptada de Cohen y Dalyot (2021), Kammoun et al. (2010) y la revisión de
  El-Taher et al. (2021) contempla criterios adicionales a la longitud.
- **Cómo se interpreta:** el porcentaje elegido fija la distancia máxima respecto
  a la alternativa de referencia. Es una restricción: una ruta que la supera se
  descarta antes de puntuar, aunque presente buena evidencia en otros factores.
- **Límite:** los umbrales del 10 %, 25 %, 50 % y 100 % son opciones de diseño
  comprensibles, no valores clínicamente validados. Deben revisarse con usuarios
  y considerando también duración y esfuerzo percibido.

#### 3. ¿Qué importancia tiene recorrer la menor distancia?

- **Qué trata de evaluar:** cuánto debe pesar la longitud entre las alternativas
  que ya cumplen las restricciones.
- **Por qué se pregunta:** la distancia sigue siendo un coste básico de cualquier
  itinerario y permite comparar el sistema personalizado con el referente
  convencional de «ruta más corta».
- **Cómo se interpreta:** se convierte en el peso `distance`. A diferencia del
  límite anterior, es una preferencia gradual y puede compensarse con otros
  costes no críticos.
- **Límite:** no mide por sí sola el tiempo, el cansancio o la dificultad real del
  recorrido.

#### 4. ¿Qué importancia tiene evitar cruces numerosos o complejos?

- **Qué trata de evaluar:** la preferencia por reducir la carga de orientación y
  decisión asociada a intersecciones y cruces complejos.
- **Por qué se pregunta:** Barlow, Bentzen y Bond (2005) documentan dificultades
  específicas en intersecciones señalizadas, como localizar el cruce, alinearse,
  identificar el comienzo de la fase peatonal y mantener la trayectoria. La
  revisión de El-Taher et al. (2021) también identifica la complejidad como un
  criterio relevante de navegación urbana.
- **Cómo se interpreta:** aumenta el peso `complex_crossings`, que penaliza las
  rutas con mayor coste normalizado en esta dimensión.
- **Límite:** el dato cartográfico no representa tráfico en tiempo real ni permite
  prometer que un cruce sea seguro.

#### 5. ¿Qué importancia tienen las ayudas confirmadas en los cruces?

- **Qué trata de evaluar:** el valor que la persona concede a evidencia sobre
  semáforos peatonales, señales acústicas, pavimento podotáctil y bordillos
  rebajados o a nivel.
- **Por qué se pregunta:** Barlow, Scott y Bentzen (2009) estudian las señales
  peatonales accesibles y muestran tanto su utilidad como sus límites en
  intersecciones complejas. Cohen y Dalyot (2021) incluyen señales acústicas y
  pavimento táctil entre los atributos relevantes para rutas de personas ciegas.
- **Cómo se interpreta:** se convierte en `crossing_support`; una mayor prioridad
  favorece rutas con más apoyo confirmado y penaliza la falta o insuficiencia de
  evidencia según las reglas de costes.
- **Límite:** que OSM declare una ayuda no garantiza que funcione en ese momento.
  La aplicación debe presentarla como información cartografiada, no como una
  comprobación en tiempo real.

#### 6. ¿Qué importancia tiene que las aceras y el acceso estén documentados?

- **Qué trata de evaluar:** la preferencia por rutas con evidencia explícita de
  espacio peatonal y acceso permitido.
- **Por qué se pregunta:** la disponibilidad y continuidad de información sobre
  la vía peatonal forma parte de los criterios empleados por la planificación
  adaptada basada en OSM (Cohen y Dalyot, 2021) y por los sistemas revisados por
  El-Taher et al. (2021).
- **Cómo se interpreta:** ajusta `sidewalk_evidence`. La exigencia básica de
  acceso peatonal permanece como restricción independiente para todos los
  perfiles.
- **Límite:** una acera sin etiquetar no equivale a una acera inexistente. La
  aplicación distingue evidencia desfavorable de información desconocida.

#### 7. ¿Qué importancia tiene conocer la superficie?

- **Qué trata de evaluar:** cuánto valora la persona disponer de información
  cartográfica sobre el pavimento antes de elegir una ruta.
- **Por qué se pregunta:** las características táctiles y de superficie forman
  parte de la información ambiental utilizada durante la movilidad y la
  construcción de representaciones espaciales (Hersh y Garcia Ramirez, 2022).
  Cohen y Dalyot (2021) también contemplan atributos de la vía más allá de la
  geometría.
- **Cómo se interpreta:** se traduce al peso `surface`; valora la evidencia
  disponible y su adecuación según el coste calculado para la ruta.
- **Límite:** no se deduce la calidad actual del firme cuando los datos faltan o
  están desactualizados, y una categoría OSM no captura todas las irregularidades.

#### 8. ¿Qué importancia tiene reducir giros y cambios de dirección?

- **Qué trata de evaluar:** la preferencia por una secuencia de navegación más
  sencilla, con menos decisiones direccionales.
- **Por qué se pregunta:** Hersh y Garcia Ramirez (2022) analizan cómo las
  personas ciegas combinan información sensorial y descripciones de ruta para
  formar mapas mentales. La complejidad y las referencias del recorrido también
  aparecen en la revisión de sistemas de navegación de El-Taher et al. (2021).
- **Cómo se interpreta:** controla `orientation_complexity`, calculada a partir
  de giros, cambios de dirección e instrucciones de la alternativa.
- **Límite:** menos giros no significa automáticamente mejor orientación: una
  ruta algo más compleja puede tener referencias más útiles. Por eso es un peso
  configurable y no una restricción universal.

#### 9. ¿Qué importancia tiene evitar pendientes pronunciadas?

- **Qué trata de evaluar:** la importancia relativa de reducir la pendiente, sin
  preguntar por una limitación médica o una capacidad concreta.
- **Por qué se pregunta:** la inclinación del recorrido aparece como atributo
  relevante en propuestas de planificación para peatones ciegos (Cohen y
  Dalyot, 2021) y en la información ambiental descrita por Hersh y Garcia
  Ramirez (2022).
- **Cómo se interpreta:** aumenta el peso `slope`; las rutas con mayor coste de
  pendiente descienden en la clasificación.
- **Límite:** no se pregunta un porcentaje máximo porque todavía no se dispone de
  una forma validada y comprensible de traducirlo a una restricción personal. La
  calidad de los datos de elevación también debe reflejarse en la confianza.

#### 10. ¿Qué importancia tiene evitar información desconocida?

- **Qué trata de evaluar:** la tolerancia personal a elegir una ruta con atributos
  de accesibilidad incompletos.
- **Por qué se pregunta:** la cobertura de OSM es desigual. En una aplicación de
  apoyo a la movilidad, la falta de evidencia no puede interpretarse como una
  condición favorable. La revisión de El-Taher et al. (2021) muestra la
  importancia y, a la vez, la disponibilidad irregular de información de
  accesibilidad en sistemas urbanos.
- **Cómo se interpreta:** se convierte en un peso no negativo de `uncertainty`.
  Una mayor proporción de atributos desconocidos aumenta el coste, mientras que
  la confianza y los avisos siguen mostrándose por separado.
- **Límite:** priorizar la certeza puede producir una ruta más larga o favorecer
  zonas mejor cartografiadas. No elimina la incertidumbre ni certifica la ruta.

#### 11. ¿Cómo quieres utilizar la voz propia de Rumbo?

- **Qué trata de evaluar:** la preferencia por lectura automática, lectura bajo
  demanda o ausencia de una voz adicional de la aplicación.
- **Por qué se pregunta:** el audio es un canal de interacción importante, pero
  debe permanecer bajo control de la persona. WCAG 2.2 exige mecanismos de
  control para audio que se reproduce automáticamente, y Vrysis et al. (2024)
  estudian la utilidad de tecnologías como la lectura de texto en personas con
  baja visión.
- **Cómo se interpreta:** configura únicamente el TTS propio. Si TalkBack está
  activo, se evita una segunda lectura automática para no superponer voces.
- **Límite:** esta respuesta no activa, desactiva ni modifica TalkBack y no se usa
  para clasificar rutas.

#### 12. ¿A qué velocidad quieres escuchar la voz propia?

- **Qué trata de evaluar:** el ritmo de escucha cómodo para el TTS de la
  aplicación.
- **Por qué se pregunta:** la velocidad influye en el equilibrio entre rapidez y
  comprensión y presenta diferencias individuales. Guerreiro y Gonçalves (2015)
  compararon distintas velocidades con participantes con discapacidad visual y
  mostraron que aumentar el ritmo puede agilizar el acceso, pero que incrementos
  excesivos también pueden perjudicar el rendimiento.
- **Cómo se interpreta:** selecciona un factor entre 0,8 y 1,5 para la voz propia.
  La pregunta se omite si esa voz está desactivada o si se detecta TalkBack.
- **Límite:** no modifica la velocidad del lector de pantalla del sistema. Los
  cuatro valores son opciones de producto que todavía deben validarse en el
  contexto de instrucciones de movilidad, diferente de una tarea de lectura.

#### 13. ¿Qué presentación visual prefieres?

- **Qué trata de evaluar:** si la persona prefiere respetar los ajustes del
  sistema o reforzar tamaño de texto, contraste o ambos.
- **Por qué se pregunta:** WCAG 2.2 incluye requisitos sobre contraste y cambio
  de tamaño del texto. El estudio de Vrysis et al. (2024), realizado con 45
  personas con baja visión, analiza la utilidad y facilidad de uso de ayudas
  móviles como ampliación, modos de color y lectura de texto.
- **Cómo se interpreta:** activa de forma inmediata la escala base, el texto un
  25 % mayor, el contraste reforzado o la combinación de ambos. Se guarda como
  preferencia local y nunca modifica restricciones, pesos ni aprendizaje.
- **Límite:** no mide agudeza visual y una opción elegida no garantiza por sí sola
  una interfaz accesible. Los modos adicionales deben implementarse y validarse
  visualmente; la aplicación ya respeta el escalado del sistema y WCAG 2.2 AA.

#### 14. ¿Quieres que Rumbo aprenda de tus elecciones?

- **Qué trata de evaluar:** el consentimiento para que el ranking ajuste de forma
  gradual sus pesos a partir de elecciones explícitas.
- **Por qué se pregunta:** las guías de interacción persona-IA recomiendan que el
  sistema facilite corrección, control y comprensión de la adaptación (Amershi
  et al., 2019). La personalización también introduce riesgos de privacidad que
  deben minimizarse y hacerse visibles (Toch, Wang y Cranor, 2012).
- **Cómo se interpreta:** el aprendizaje está desactivado por defecto. Al
  activarlo, se guardan localmente vectores de costes, la alternativa elegida y
  el estado de pesos, sin direcciones ni coordenadas.
- **Límite:** la pregunta no mide confianza en la IA ni competencia tecnológica.
  El aprendizaje puede desactivarse y restablecerse, nunca cambia restricciones
  críticas y puede no aportar valor cuando el perfil inicial ya es preciso.

### Matriz de trazabilidad resumida

| Bloque | Preguntas | Aspecto evaluado | Evidencia principal | Uso en el sistema |
| --- | --- | --- | --- | --- |
| Límites personales | 1–2 | Condiciones no compensables y esfuerzo adicional aceptado | Cohen y Dalyot (2021); Kammoun et al. (2010); El-Taher et al. (2021) | Restricciones y tratamiento especial de escalones |
| Coste básico | 3 | Importancia relativa de la distancia | Cohen y Dalyot (2021); Kammoun et al. (2010) | Peso del ranking |
| Cruces | 4–5 | Complejidad y valor de ayudas declaradas | Barlow et al. (2005, 2009); Cohen y Dalyot (2021) | Pesos del ranking y avisos |
| Entorno peatonal | 6–7 | Valor de aceras, acceso y superficie documentados | Cohen y Dalyot (2021); Hersh y Garcia Ramirez (2022) | Pesos del ranking y confianza |
| Orientación y esfuerzo | 8–9 | Giros, cambios de dirección y pendiente | Hersh y Garcia Ramirez (2022); El-Taher et al. (2021) | Pesos del ranking |
| Actitud ante datos incompletos | 10 | Tolerancia a la incertidumbre cartográfica | El-Taher et al. (2021) | Coste de incertidumbre, confianza y avisos |
| Interacción accesible | 11–13 | Preferencias de voz, ritmo y presentación visual | WCAG 2.2; Guerreiro y Gonçalves (2015); Vrysis et al. (2024) | Configuración local de interfaz; nunca ranking |
| Adaptación | 14 | Consentimiento y control sobre el aprendizaje | Amershi et al. (2019); Toch et al. (2012) | Activación opcional del modelo local |

### Traducción de las prioridades

Los cuatro niveles verbales se transforman en una escala ordinal sencilla:

| Respuesta | Valor inicial |
| --- | ---: |
| No es una prioridad | 0 |
| Prioridad baja | 1 |
| Prioridad media | 2 |
| Prioridad alta | 3 |

Estos números no son porcentajes. Antes de calcular una puntuación, el sistema
los normaliza dividiendo cada valor entre la suma total. Por ejemplo, si solo se
marcan dos prioridades con valores 3 y 1, sus pesos normalizados son 0,75 y
0,25. Si todas las prioridades quedan a cero y los escalones se dejan solo como
aviso, la aplicación recupera automáticamente nueve pesos iguales. De esta
forma, nunca envía al backend un perfil matemáticamente inválido.

### Restricciones que no son negociables

El perfil mantiene siempre `require_pedestrian_access=true` y
`avoid_incompatible_crossings=true`. Una ruta que incumpla esas condiciones se
descarta antes de puntuar y antes de aprender. Los escalones también se
convierten en restricción si la persona responde «Excluir siempre». El
aprendizaje solo puede reordenar las rutas que hayan superado este filtro.

### Relación con el aprendizaje

Si el consentimiento está desactivado, el ranking utiliza únicamente las
preferencias declaradas. Si está activado, las tres primeras elecciones son de
observación y después los pesos efectivos mezclan gradualmente las preferencias
declaradas con las aprendidas. La influencia aprendida está limitada y nunca
modifica restricciones críticas ni convierte la incertidumbre en una ventaja.
Cada configuración material del ranking posee una identidad adaptativa local.
Esta identidad incluye pesos, tratamiento de escalones y desvío máximo. Por
tanto, si cambia una restricción o un peso, las elecciones recogidas bajo la
configuración anterior no se mezclan con la nueva. En cambio, cambiar texto,
contraste o voz conserva el aprendizaje porque no altera el conjunto de rutas
admitidas ni su coste.

En modo general existen dos identidades adaptativas separadas, una por perfil
predefinido. En modo personalizado la identidad se deriva de los pesos, el
tratamiento de escalones y el desvío máximo del cuestionario. Al completar el
formulario no se mezclan las observaciones de los perfiles generales con el
nuevo perfil personal: proceden de criterios diferentes y unirlas contaminaría
la estimación.

## Datos de entrada y salida

### Entrada

- Una respuesta cerrada por pregunta.
- Estado del lector de pantalla para decidir si se pregunta por la velocidad de
  la voz propia.
- Consentimiento explícito, separado del resto del perfil.

### Salida

- `MobilityProfile` con restricciones, desvío máximo y nueve pesos declarados.
- Preferencias locales de voz y presentación.
- Indicador local de consentimiento para el aprendizaje adaptativo.
- Indicador local `profileMode` que distingue omisión y finalización.
- Estado persistido `onboarding:v1:answers`, versionado para poder rechazar
  datos antiguos o incompletos sin bloquear la aplicación.

## Flujo de uso e integración

```text
¿Cuestionario completado?
        ├── no ──→ elegir perfil general ──→ pesos predefinidos
        │                  ↓
        │        aprendizaje propio del perfil, si se activa
        │
        └── sí ──→ respuestas personales ──→ restricciones y pesos 0–3
                                      ↓
                         aprendizaje personal, si se autorizó

Ambas ramas ──→ restricciones críticas ──→ descarte de incompatibles
                                                 ↓
                                    pesos efectivos normalizados
                                                 ↓
                               alternativas válidas y explicadas
```

Al reiniciar la aplicación se recupera el perfil local y no se repite el
cuestionario. La pantalla «Ajustes» permite cambiar la presentación de forma
inmediata, cambiar el modo y la velocidad de voz, pausar el aprendizaje o abrir
de nuevo las catorce preguntas
conservando las respuestas. Se muestra a pantalla completa sobre el flujo para
no perder el origen, el destino o los resultados ya obtenidos. Si el
cuestionario se omite, se guarda el modo general para que la omisión también sea
una decisión estable y no reaparezca en cada arranque. Completarlo más adelante
desde Ajustes sustituye el selector general por el perfil personalizado.

Mientras el cuestionario todavía está abierto, las respuestas viven en un
borrador y no se tratan como un perfil terminado. La presentación elegida sí se
aplica en ese momento para ofrecer una vista previa real de texto y contraste,
y el engranaje permite revisar esos ajustes desde cualquier pregunta. En
cambio, las restricciones y los pesos del ranking solo sustituyen los perfiles
generales al finalizar las catorce preguntas. Esta separación impide que cerrar
la aplicación a mitad del formulario deje activo un perfil incompleto.

Tras finalizar o saltar el cuestionario se ofrece un paso opcional separado para
guardar el primer lugar habitual. No forma parte de las catorce preguntas ni
del perfil del ranking: nombre, dirección y coordenadas se almacenan en una
entrada local distinta y solo se utilizan cuando la persona elige ese lugar
como origen o destino. La separación evita convertir un dato de uso en una
preferencia algorítmica. Véase
[Lugares guardados en el dispositivo](lugares-guardados.md).

Los estados anteriores que se guardaron antes de incorporar `profileMode` se
migran como personalizados. Esta decisión conserva el comportamiento que tenían
antes de la actualización y evita borrar respuestas. Los estados nuevos sí
registran de forma inequívoca si el formulario se terminó o se omitió.

## Implementación

- `app/src/features/onboarding/questions.ts`: define las catorce preguntas y su
  orden.
- `app/src/features/onboarding/answers.ts`: tipos, valores iniciales y
  traducción a perfil y voz, además de la identidad canónica del aprendizaje.
- `app/src/features/onboarding/storage.ts`: validación y persistencia local.
- `app/src/features/onboarding/useOnboarding.ts`: avance, retroceso y omisión
  de preguntas no aplicables.
- `app/src/screens/OnboardingIntroScreen.tsx` y
  `OnboardingQuestionScreen.tsx`: pantallas accesibles.
- `app/src/features/route-comparison/useRouteComparison.ts`: envía el perfil
  configurado al backend.
- `app/src/screens/RouteComparisonScreen.tsx`: utiliza el mismo perfil para el
  ranking fijo y para el aprendizaje, y sincroniza el consentimiento.
- `app/src/app/index.tsx`: carga, guarda y permite editar el perfil.
- `app/src/theme/presentation.tsx` y `app/src/screens/SettingsScreen.tsx`:
  aplican y permiten revisar las preferencias visuales y de voz.

La preferencia visual se guarda junto al perfil para no volver a preguntarla.
La interfaz respeta el escalado de texto del sistema y utiliza una paleta que
cumple WCAG 2.2 AA. Los modos adicionales ya están implementados: el texto
grande multiplica por 1,25 la escala interna y el contraste reforzado utiliza
una paleta específica con texto principal negro sobre blanco, verde de acción
oscuro y bordes más visibles. La decisión completa se documenta en
[Ajustes locales y modos de presentación](ajustes-presentacion.md).

El modo de voz y su velocidad también se guardan en el mismo registro local. Al
terminar el perfil se aplican a la navegación: `automatic` reproduce cada nueva
instrucción cuando TalkBack no está activo; `onDemand` espera la acción
«Escuchar»; `never` deshabilita la voz adicional. Ajustes modifica esos mismos
campos, por lo que no existe una segunda configuración divergente.

## Pruebas

- Existencia de las catorce preguntas y orden estable.
- Primera pantalla, progreso, selección y navegación accesibles.
- Omisión de la velocidad cuando TalkBack está activo o la voz está desactivada.
- Traducción exacta de prioridades a 0, 1, 2 y 3.
- Traducción de escalones y desvío a restricciones.
- Recuperación equilibrada si todos los pesos son cero.
- Conversión de las respuestas de voz.
- Guardado y carga completos sin coordenadas, direcciones, audio ni GPS.
- Rechazo seguro de un estado local incompleto.
- Migración compatible de perfiles guardados antes de añadir `profileMode`.
- Envío del perfil configurado en lugar del perfil de demostración.
- Conservación de los dos perfiles generales cuando se omite el cuestionario.
- Eliminación del selector general cuando existe un perfil personalizado.
- Separación de pesos declarados y efectivos.
- Sincronización en ambos sentidos del consentimiento del aprendizaje.
- Aplicación del texto grande y del contraste reforzado.
- Cambio y persistencia desde Ajustes.
- Conservación del aprendizaje ante cambios solo visuales y separación ante
  cambios en pesos o restricciones.

## Resultados

La implementación supera la comprobación de tipos, el análisis estático y la
suite automatizada de la aplicación. Las pruebas verifican que el perfil enviado
al backend conserva las restricciones críticas y que cada nivel verbal produce
el valor previsto. La evaluación con participantes ciegos o con baja visión
sigue pendiente; por tanto, no se afirma que las preguntas sean definitivas ni
que su redacción esté validada con población usuaria.

La comprobación encadenada cubre tres límites del sistema: la app traduce las
respuestas, el controlador envía el perfil resultante y el backend utiliza sus
pesos. Sobre las alternativas sintéticas reproducibles de
Moncloa–Príncipe Pío se obtuvo:

| Configuración derivada de respuestas | Primer puesto | Adecuación del primero | Segundo puesto | Adecuación del segundo |
| --- | --- | ---: | --- | ---: |
| Prioridad media en los ocho factores y penalización de escalones | `balanced_route` | 0,8075 | `fewer_crossings_route` | 0,8000 |
| Prioridad alta solo en evitar cruces complejos; resto sin peso | `fewer_crossings_route` | 0,8750 | `balanced_route` | 0,7375 |

Por tanto, las respuestas no son solo información almacenada: pueden cambiar
qué alternativa ocupa el primer puesto. La tabla demuestra sensibilidad
funcional sobre un escenario controlado, no que la segunda configuración sea
mejor para todas las personas ni que los valores 0–3 estén calibrados con
usuarios reales.

## Riesgos y limitaciones

- La escala 0–3 expresa orden e importancia relativa, no una medida clínica.
- Preguntar muchos factores mejora la trazabilidad, pero añade carga inicial.
  Se mitiga con una pregunta por pantalla, opciones preseleccionadas y omisión
  completa.
- El máximo de pendiente no se pregunta como restricción porque todavía no se
  dispone de una forma comprensible y validada de expresarlo; la pendiente se
  utiliza como prioridad y se muestra con incertidumbre cuando falta evidencia.
- No se pregunta por bastón, perro guía, diagnóstico o teclado: el sistema no
  necesita esos datos para puntuar y no debe inferir necesidades a partir de
  ellos.
- La calidad de las respuestas puede variar. El aprendizaje es opcional porque
  los experimentos muestran que ayuda cuando el perfil inicial es impreciso,
  pero puede perjudicar si ya representa muy bien a la persona. `EXP-009`
  utilizó cuatro formularios completos y no observó una mejora adaptativa final
  en ninguna de sus cuatro condiciones; por ello el cuestionario se conserva
  como ancla y el aprendizaje sigue desactivado inicialmente.
- Los modos visuales están implementados, pero necesitan validación manual con
  la escala máxima de Android y evaluación con participantes; no afectan a la
  seguridad ni al ranking.

## Texto base para la memoria

> La personalización inicial se diseñó como un cuestionario funcional y no como
> una clasificación diagnóstica. Se distinguieron restricciones que descartan
> alternativas antes del cálculo —acceso peatonal, compatibilidad de cruces,
> escalones cuando así se solicita y desvío máximo— de preferencias graduables
> que intervienen en una suma ponderada explicable. Las respuestas verbales se
> tradujeron a una escala ordinal 0–3 y se normalizaron antes del ranking. Este
> diseño permite inspeccionar la contribución de cada criterio y evita que una
> puntuación favorable compense una incompatibilidad crítica. El perfil y el
> consentimiento del aprendizaje se almacenan localmente y no incluyen
> identidad, direcciones ni trazas de ubicación. El aprendizaje permanece
> desactivado por defecto y, cuando se autoriza, solo modifica de manera gradual
> el orden de las alternativas previamente aceptadas. Los temas incluidos se
> fundamentaron mediante literatura sobre orientación y movilidad, selección de
> rutas, señales peatonales accesibles, interacción móvil e interacción
> persona-IA. Esta fundamentación aporta validez de contenido inicial, pero no
> convierte el cuestionario en una escala validada: su comprensión, suficiencia
> y carga deben contrastarse mediante revisión experta y entrevistas cognitivas
> con personas ciegas o con baja visión.

## Trabajo pendiente

- [ ] Validar comprensión, carga y suficiencia de las preguntas con personas
  ciegas o con baja visión y profesionales de orientación y movilidad.
- [x] Aplicar los modos adicionales de texto y contraste.
- [ ] Validarlos visualmente con la escala máxima de Android y con personas
  usuarias.
- [ ] Estudiar si conviene preguntar por referencias auditivas o táctiles cuando
  exista evidencia cartográfica suficientemente fiable para puntuarlas.
- [ ] Incorporar una acción explícita para borrar todo el perfil local desde
  ajustes, además de poder editarlo o restablecer el equilibrado al omitirlo.
- [ ] Validar temporalmente los pesos aprendidos frente al perfil fijo antes de
  permitir que aumente su influencia en una evolución del producto.

## Referencias y evidencias

- [Evaluación del aprendizaje con el cuestionario completo](../evaluation/evaluacion-aprendizaje-cuestionario-real.md).

- Cohen, A. y Dalyot, S. (2021). «Route planning for blind pedestrians using
  OpenStreetMap». *Environment and Planning B: Urban Analytics and City
  Science*, 48(6). <https://doi.org/10.1177/2399808320933907>.
- Kammoun, S., Dramas, F., Oriola, B. y Jouffrais, C. (2010). «Route selection
  algorithm for blind pedestrian». *International Conference on Control,
  Automation and Systems*. <https://doi.org/10.1109/ICCAS.2010.5669846>.
- Barlow, J. M., Bentzen, B. L. y Bond, T. (2005). «Blind Pedestrians and the
  Changing Technology and Geometry of Signalized Intersections: Safety,
  Orientation, and Independence». *Journal of Visual Impairment & Blindness*,
  99(10), 587–598. <https://doi.org/10.1177/0145482X0509901003>.
- Barlow, J. M., Scott, A. C. y Bentzen, B. L. (2009). «Audible Beaconing with
  Accessible Pedestrian Signals». *AER Journal: Research and Practice in Visual
  Impairment and Blindness*, 2(4), 149–158.
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC2901122/>.
- El-Taher, F. E.-Z., Taha, A., Courtney, J. y Mckeever, S. (2021). «A
  Systematic Review of Urban Navigation Systems for Visually Impaired People».
  *Sensors*, 21(9), 3103.
  <https://doi.org/10.3390/s21093103>.
- Amershi, S. y otros (2019). «Guidelines for Human-AI Interaction». *CHI 2019*,
  artículo 3, 1–13. <https://doi.org/10.1145/3290605.3300233>.
- Hersh, M. y Garcia Ramirez, A. R. (2022). «Route Descriptions, Spatial
  Knowledge and Spatial Representations of Blind and Partially Sighted People:
  Improved Design of Electronic Travel Aids». *ACM Transactions on Accessible
  Computing*, 15(4), artículo 32. <https://doi.org/10.1145/3549077>.
- Guerreiro, J. y Gonçalves, D. (2015). «Faster Text-to-Speeches: Enhancing
  Blind People's Information Scanning with Faster Concurrent Speech».
  *Proceedings of the 17th International ACM SIGACCESS Conference on Computers
  and Accessibility*, 3–11. <https://doi.org/10.1145/2700648.2809840>.
- Vrysis, L., Almaliotis, D., Almpanidou, S. y otros (2024). «Mobile Software
  Aids for People with Low Vision». *Multimedia Tools and Applications*, 83,
  30919–30936. <https://doi.org/10.1007/s11042-023-16639-5>.
- Toch, E., Wang, Y. y Cranor, L. F. (2012). «Personalization and Privacy: A
  Survey of Privacy Risks and Remedies in Personalization-Based Systems».
  *User Modeling and User-Adapted Interaction*, 22, 203–220.
  <https://doi.org/10.1007/s11257-011-9110-z>.
- Boateng, G. O., Neilands, T. B., Frongillo, E. A., Melgar-Quiñonez, H. R. y
  Young, S. L. (2018). «Best Practices for Developing and Validating Scales for
  Health, Social, and Behavioral Research: A Primer». *Frontiers in Public
  Health*, 6, 149. <https://doi.org/10.3389/fpubh.2018.00149>.
- W3C (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*.
  <https://www.w3.org/TR/WCAG22/>.
- Pruebas: `app/__tests__/onboarding.test.tsx` y
  `app/__tests__/useRouteComparison.test.ts`, junto con
  `tests/scoring/test_ranking.py`.

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado los anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
