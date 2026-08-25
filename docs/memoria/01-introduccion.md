# 1. Introducción

Estado: `Borrador consolidado`

Última actualización: 25 de agosto de 2026.

Este Trabajo Fin de Máster presenta **Rumbo**, un prototipo de aplicación móvil
para Android que compara rutas peatonales y las ordena según las necesidades y
preferencias declaradas por personas ciegas o con baja visión. El proyecto no
trata de certificar que una ruta sea accesible o segura de forma absoluta. Su
propósito es ofrecer alternativas más informadas, explicar los criterios
empleados, mostrar la incertidumbre asociada a los datos disponibles y mantener
la decisión final en manos de la persona usuaria.

La aportación central se sitúa en la intersección entre accesibilidad, sistemas
de información geográfica e inteligencia artificial explicable. El sistema
combina reglas deterministas que protegen restricciones críticas, una
clasificación multicriterio personalizada y un mecanismo opcional de
aprendizaje en línea que ajusta preferencias graduables a partir de elecciones
explícitas. OpenRouteService (ORS), OpenStreetMap (OSM), el GPS, la brújula,
TalkBack y la síntesis de voz son componentes necesarios para construir el
producto, pero no se presentan como contribuciones propias de inteligencia
artificial.

## 1.1. Motivación

La movilidad peatonal autónoma está estrechamente vinculada con la
participación social, el acceso al empleo, la educación, el ocio y los servicios
esenciales. La Organización Mundial de la Salud estima que al menos 2.200
millones de personas tienen algún tipo de deficiencia visual próxima o lejana
en el mundo [1]. En España, la Encuesta de Discapacidad, Autonomía Personal y
Situaciones de Dependencia de 2020 contabilizó 4,38 millones de personas
residentes en hogares con alguna discapacidad o limitación, aunque esta cifra
engloba distintos tipos de discapacidad y no debe interpretarse como una
estimación exclusiva de ceguera o baja visión [2].

La accesibilidad y la movilidad personal no son únicamente aspiraciones de
diseño. La Convención de las Naciones Unidas sobre los Derechos de las Personas
con Discapacidad reconoce tanto el acceso al entorno físico, al transporte y a
la información como el derecho a la movilidad personal con la mayor
independencia posible [3]. En el ámbito europeo, la Directiva (UE) 2019/882
refuerza la obligación de prevenir barreras en determinados productos y
servicios digitales y de proporcionar la información esencial de los servicios
de navegación de una forma accesible [4]. Este marco no convierte
automáticamente al prototipo en un servicio certificado, pero sí justifica que
la accesibilidad, la autonomía y la comunicación por varios canales se traten
como requisitos de partida y no como mejoras posteriores.

Las aplicaciones convencionales de navegación suelen optimizar principalmente
la distancia o el tiempo. Sin embargo, la ruta más corta no tiene por qué ser
la más adecuada para una persona ciega o con baja visión. La presencia de
escalones, la complejidad de los cruces, la existencia de semáforos y señales
acústicas, el pavimento podotáctil, la pendiente, el número de giros o la
cantidad de información desconocida pueden modificar sustancialmente la
conveniencia de una alternativa. La literatura sobre navegación urbana
asistida identifica precisamente la selección personalizada de rutas y la
disponibilidad de información relevante sobre aceras, intersecciones y cruces
como problemas todavía abiertos [5]. Otros trabajos han mostrado que es
posible formular la selección de rutas para peatones ciegos mediante varios
criterios [6] y aprovechar OSM para incorporar elementos como pavimento táctil,
señales acústicas, pendientes o barreras [7].

Tampoco existe un único perfil representativo de todas las personas ciegas o
con baja visión. Dos personas pueden asignar importancias diferentes a la
distancia, a los cruces, a la orientación o a la pendiente, incluso cuando
comparten una condición visual semejante. Además, las reacciones ante las
instrucciones de navegación varían según el ritmo, la experiencia y el estilo
de movilidad de cada persona [8]. Por este motivo, Rumbo no deduce las
necesidades a partir de un diagnóstico médico ni presupone que el uso de bastón
o perro guía determina por sí solo una ruta. El perfil inicial pregunta por
situaciones funcionales y separa dos clases de decisiones:

- **Restricciones críticas**, que pueden excluir una ruta cuando existe
  evidencia confirmada de incompatibilidad.
- **Preferencias graduables**, que modifican el orden de las rutas que ya han
  superado las restricciones.

La personalización basada únicamente en un cuestionario también tiene límites.
Una persona puede descubrir sus preferencias al comparar recorridos concretos
o puede expresarlas inicialmente de forma aproximada. Esta observación motiva
el componente de inteligencia artificial del trabajo: aprender de manera
progresiva qué compromisos acepta la persona entre las rutas disponibles. No
obstante, la adaptación introduce riesgos. Con pocas elecciones puede ser
inestable; una decisión puntual puede responder a un contexto excepcional; y
un modelo que modifique reglas críticas podría recomendar una alternativa
incompatible. Por ello se adopta un sistema híbrido y auditable: las reglas de
seguridad permanecen fuera del aprendizaje, las primeras elecciones se
utilizan como observación, la influencia aprendida está limitada, el proceso es
opcional y puede restablecerse. Esta decisión sigue principios generales de
interacción persona–IA relativos a explicar el comportamiento, facilitar la
corrección y conservar el control de la persona usuaria [9].

Existe, además, un problema previo al algoritmo: la calidad de la información
geográfica. OSM es una fuente colaborativa cuya cobertura varía entre zonas y
atributos. Que no aparezca una etiqueta de escalones, pavimento táctil o señal
acústica no demuestra que ese elemento no exista físicamente. Rumbo representa
la evidencia mediante tres estados —favorable, desfavorable y desconocido— y
mantiene separados el índice de adecuación, la confianza en los datos y la
incertidumbre. Un dato desconocido nunca se convierte en evidencia positiva.
Esta separación evita presentar como conocimiento lo que solo es falta de
documentación.

A partir de estas necesidades, el problema de investigación se formula del
siguiente modo:

> ¿Es posible diseñar e implementar un prototipo móvil que compare rutas
> peatonales para personas ciegas o con baja visión mediante un sistema híbrido
> de inteligencia artificial explicable, que combine restricciones críticas,
> preferencias personales, incertidumbre de los datos y aprendizaje a partir
> de elecciones, sin sustituir la decisión de la persona ni realizar promesas
> absolutas de accesibilidad?

La pregunta se aborda mediante un desarrollo aplicado y una evaluación por
capas: validación de datos y reglas, comparación con sistemas de referencia,
experimentos reproducibles del aprendizaje, pruebas automáticas, recorridos
simulados en Android y análisis explícito de los resultados negativos y de las
amenazas a la validez.

## 1.2. Objetivos

### 1.2.1. Objetivo general

Diseñar, implementar y evaluar un prototipo Android de recomendación y
navegación peatonal personalizada para personas ciegas o con baja visión,
apoyado en un sistema híbrido de inteligencia artificial explicable que ordene
rutas según el perfil de la persona, comunique la confianza y la incertidumbre
de los datos y pueda adaptar de forma limitada y reversible las preferencias
graduables a partir de elecciones explícitas.

### 1.2.2. Objetivos específicos

Para alcanzar el objetivo general se plantean los siguientes objetivos
específicos:

1. **Caracterizar la disponibilidad de datos de accesibilidad en Madrid** y
   seleccionar un área piloto manejable mediante criterios cuantitativos y
   cualitativos, sin confundir densidad de información con accesibilidad real.

2. **Generar un conjunto diverso de rutas peatonales candidatas** mediante ORS,
   controlar duplicados y conservar una alternativa reproducible cuando el
   proveedor externo no esté disponible.

3. **Enriquecer las rutas con evidencia estructurada de OSM**, incluyendo
   cruces, semáforos, ayudas acústicas o vibratorias, pavimento podotáctil,
   bordillos, aceras, rampas, escalones, superficies y pendientes cuando exista
   información suficiente.

4. **Formalizar un modelo de perfil y evidencia** que diferencie restricciones
   críticas, preferencias graduables y datos desconocidos, evitando que la
   ausencia de una etiqueta se interprete como una condición favorable.

5. **Implementar una clasificación multicriterio explicable** que devuelva por
   separado adecuación al perfil, confianza e incertidumbre, y que acompañe el
   orden de las rutas con razones y avisos derivados de los factores realmente
   utilizados.

6. **Diseñar e integrar un mecanismo de aprendizaje adaptativo en línea** basado
   en comparaciones por pares, con pesos no negativos, regularización hacia las
   preferencias declaradas, influencia limitada, consentimiento explícito,
   persistencia local y posibilidad de desactivación y restablecimiento.

7. **Construir una experiencia móvil accesible** compatible prioritariamente
   con TalkBack, síntesis de voz en español, texto grande, contraste reforzado,
   controles táctiles suficientes y alternativas manuales que eviten depender
   exclusivamente del mapa, el color, la voz o el GPS.

8. **Incorporar navegación asistida en primer plano**, con instrucciones
   deterministas enriquecidas, avance automático conservador, orientación
   mediante brújula, detección temporal de posibles desviaciones y recálculo de
   ruta únicamente después de una confirmación explícita.

9. **Evaluar el sistema de decisión y su integración**, comparando la ruta más
   corta, la clasificación fija y la clasificación adaptativa; midiendo
   exactitud, arrepentimiento, estabilidad, incertidumbre y violaciones
   críticas; y registrando tanto las mejoras como los casos en los que el
   aprendizaje no aporta valor.

10. **Garantizar privacidad, trazabilidad y reproducibilidad**, almacenando el
    perfil y el estado adaptativo en el dispositivo, evitando registrar
    coordenadas o secretos, documentando las decisiones y proporcionando datos,
    pruebas y procedimientos suficientes para repetir los experimentos dentro
    de sus condiciones declaradas.

Estos objetivos no presuponen que el aprendizaje deba superar siempre a la
clasificación fija. Su finalidad experimental es determinar en qué condiciones
aporta información útil, cuándo la señal disponible es insuficiente y qué
salvaguardas necesita. Esta formulación permite considerar también un resultado
negativo como evidencia relevante para responder a la pregunta de
investigación.

## 1.3. Alcance y limitaciones

### 1.3.1. Alcance funcional y técnico

El resultado del trabajo es un **producto mínimo viable de investigación**, no
un sistema comercial ni una ayuda certificada de orientación y movilidad. El
prototipo cubre el flujo que comienza con la configuración de un perfil y la
selección de origen y destino, continúa con la generación, enriquecimiento y
comparación de rutas, y termina con una navegación asistida que conserva
controles manuales.

El alcance incluye:

- una aplicación móvil para Android desarrollada con React Native, Expo y
  TypeScript;
- un backend implementado con Python 3.9 y FastAPI;
- búsqueda de lugares y almacenamiento local de lugares guardados;
- generación de rutas peatonales reales con ORS y escenarios locales para
  pruebas reproducibles;
- enriquecimiento de los recorridos con una instantánea de datos OSM;
- aplicación de restricciones críticas antes de la clasificación;
- comparación de hasta tres alternativas mediante adecuación, confianza,
  incertidumbre, razones y avisos;
- perfil inicial editable y dos perfiles generales de respaldo cuando se omite
  el cuestionario;
- aprendizaje adaptativo opcional, acotado y persistido localmente;
- navegación con GPS únicamente mientras su pantalla permanece abierta;
- avance automático conservador al aproximarse a una maniobra, sin eliminar
  los controles de avance y retroceso;
- orientación auxiliar mediante brújula, confirmación multimodal y opción de
  volver a comprobarla;
- detección de desviaciones a partir de varias muestras fiables y recálculo
  después de obtener consentimiento;
- compatibilidad prioritaria con TalkBack, TTS, vibración, texto grande y
  contraste reforzado.

El área principal de estudio es el corredor
**Moncloa–Argüelles–Príncipe Pío**, situado en el interior de la M-30 de Madrid.
Se seleccionó después de analizar 74 zonas de una malla métrica y combinar
disponibilidad de información OSM, cobertura fotográfica potencial de
Mapillary, comparabilidad espacial y heterogeneidad urbana. La celda central
escogida quedó en cuarta posición, con los diez grupos OSM analizados presentes
y una superficie completa de 1 km². La selección identifica un entorno útil
para desarrollar y evaluar el prototipo; no establece que sea el área más
accesible de Madrid.

El funcionamiento se plantea como **prioritariamente local**. El perfil, los
lugares guardados y el estado del aprendizaje permanecen en el dispositivo, y
la instantánea OSM se prepara con anterioridad. Sin embargo, el sistema no es
completamente autónomo: ORS recibe las coordenadas necesarias para generar
rutas reales y puede recibir una posición confirmada durante el recálculo. Las
coordenadas de navegación se mantienen en memoria y no se incorporan al
historial de aprendizaje ni a los registros de la aplicación.

La contribución de inteligencia artificial comprende el orden multicriterio,
el aprendizaje en línea de preferencias y las explicaciones trazables. La
generación de rutas, la aplicación de restricciones, la narración por
plantillas, el GPS, la brújula y el recálculo son procesos deterministas o
servicios auxiliares. No se emplea un modelo de lenguaje para redactar las
instrucciones ni para decidir la seguridad de una ruta.

### 1.3.2. Delimitaciones y trabajo fuera de alcance

Quedan expresamente fuera del alcance del MVP:

- el desarrollo y validación de una versión para iOS;
- la ubicación en segundo plano o con la pantalla apagada;
- el recálculo silencioso y completamente automático;
- la detección en tiempo real de obstáculos mediante cámara;
- el uso de un modelo de lenguaje o un modelo visión-lenguaje en producción;
- el análisis automático de imágenes de Mapillary para decidir el orden de las
  rutas;
- la construcción de un motor de rutas propio que sustituya a ORS;
- la enumeración exhaustiva de todos los caminos físicamente posibles;
- la certificación de una ruta como segura, libre de barreras o universalmente
  accesible;
- el seguimiento remoto por acompañantes o el almacenamiento de historiales
  completos de posiciones.

Mapillary se utiliza únicamente como indicador de cobertura visual y apoyo para
inspecciones o futuras extensiones. La ausencia de fotografías no penaliza una
ruta. Del mismo modo, el mapa visual auxiliar planteado para acompañantes y
personas con resto visual se mantiene como trabajo futuro y no forma parte del
flujo accesible imprescindible.

### 1.3.3. Limitaciones de los datos y del sistema

La primera limitación procede de las fuentes geográficas. OSM tiene una
cobertura colaborativa y desigual: una etiqueta ausente no equivale a ausencia
física. La asociación espacial entre una ruta y un elemento próximo tampoco
demuestra por sí sola que ambos pertenezcan a la misma acera o ramal. El sistema
reduce este riesgo mediante estados desconocidos, corredores espaciales
conservadores y comprobaciones más estrictas para barreras críticas, pero no
resuelve completamente la topología peatonal.

ORS devuelve un conjunto limitado de candidatas y no todos los recorridos
posibles. La ampliación y deduplicación del conjunto mejora la diversidad
observada, pero el clasificador solo puede elegir entre las rutas recuperadas.
Además, ORS, la red y el GPS son servicios o tecnologías susceptibles de fallo.
La aplicación conserva el último estado válido y mantiene los controles
manuales, aunque estas medidas no eliminan la dependencia operativa.

El área piloto no representa toda la diversidad de Madrid ni de otros entornos
urbanos. Las pendientes, cruces, obras, aglomeraciones y condiciones temporales
pueden diferir fuera del corredor o cambiar después de la instantánea de datos.
El sistema tampoco incorpora información dinámica sobre tráfico peatonal,
obras o incidencias en tiempo real.

### 1.3.4. Limitaciones de la evaluación y de la inteligencia artificial

La evaluación del aprendizaje utiliza perfiles y elecciones sintéticas para
disponer de una preferencia de referencia conocida. En ese entorno controlado,
el modelo permite verificar el funcionamiento matemático, pero los perfiles no
representan categorías clínicas ni sustituyen las decisiones de personas
reales. El simulador, además, genera elecciones con una familia de costes
compatible con la que aprende el algoritmo, lo que favorece la validación
interna.

La transferencia posterior a costes derivados de rutas ORS enriquecidas con
OSM mostró una limitación importante: el conjunto real disponible contenía
pocas comparaciones aptas y escasa variación entre perfiles. La clasificación
fija alcanzó un efecto techo y el aprendizaje adaptativo obtuvo un resultado
peor. En consecuencia, el prototipo mantiene el aprendizaje desactivado por
defecto, exige consentimiento y comprueba por separado si las elecciones
contienen una señal suficientemente diversa. Este diagnóstico todavía no
activa el aprendizaje automáticamente porque necesita validación con más rutas,
zonas y participantes.

Las pruebas automáticas demuestran coherencia lógica, ausencia de determinadas
regresiones y cumplimiento de los invariantes programados. Las pruebas en el
emulador Android verifican el flujo funcional con TalkBack, GPS y posiciones
simuladas. Sin embargo, no demuestran por sí solas utilidad, confianza,
comprensión o seguridad durante desplazamientos reales. Continúan siendo
necesarias una evaluación con personas ciegas o con baja visión, una revisión
con profesionales de orientación y movilidad y recorridos físicos controlados.
Por ello, los resultados del TFM deben interpretarse como evidencia sobre la
viabilidad técnica y el comportamiento experimental del prototipo, no como una
validación clínica o poblacional.

## 1.4. Estructura del documento

Tras esta introducción, la memoria se organiza de la siguiente manera:

- El **capítulo 2, Estado del arte**, presenta el marco conceptual de la
  orientación y la movilidad de personas ciegas o con baja visión, el contexto
  regulatorio y socioeconómico, los sistemas de navegación asistida, los datos
  geográficos de accesibilidad, la recomendación multicriterio, el aprendizaje
  de preferencias y la interacción accesible con sistemas de IA. El capítulo
  concluye identificando el hueco concreto que aborda Rumbo.

- El **capítulo 3, Metodología**, describe las preguntas e hipótesis de
  investigación, la selección del área piloto, las fuentes de datos, la
  construcción de escenarios reproducibles, los sistemas de referencia, las
  métricas y el diseño de los experimentos. También establece cómo se separan
  calibración, evaluación y análisis de limitaciones.

- El **capítulo 4, Diseño del sistema**, expone la arquitectura general, los
  modelos de perfil, ruta y evidencia, las restricciones críticas, el sistema
  de clasificación explicable, la política de incertidumbre, la privacidad y
  las decisiones de accesibilidad de la interfaz.

- El **capítulo 5, Implementación técnica**, detalla el backend, la aplicación
  Android, la integración con ORS y OSM, la navegación, la voz, el GPS, la
  brújula, el recálculo y el módulo de aprendizaje adaptativo. También recoge
  las principales decisiones técnicas e incidencias relevantes.

- El **capítulo 6, Resultados**, define las métricas y presenta la evaluación
  cuantitativa y cualitativa. Compara los sistemas de referencia, analiza la
  calibración y transferencia del aprendizaje, la calidad de los datos, la
  navegación y la viabilidad operativa, e interpreta tanto los resultados
  positivos como los negativos. Finalmente, revisa las amenazas a la validez y
  el cumplimiento de los objetivos.

- El **capítulo 7, Conclusiones y trabajo futuro**, responde a la pregunta de
  investigación, resume las contribuciones, establece qué afirmaciones permite
  realizar la evidencia obtenida y prioriza las extensiones necesarias para
  evolucionar desde un prototipo de investigación hacia una evaluación con
  usuarios y entornos reales.

- La **bibliografía** reúne en formato IEEE todas las fuentes académicas,
  normativas y técnicas citadas.

- El **anexo A, Materiales y reproducibilidad**, explica la organización del
  repositorio, la configuración y ejecución del sistema, los experimentos, los
  artefactos generados y los cuestionarios previstos para la evaluación. Otros
  materiales extensos podrán incorporarse como anexos adicionales cuando su
  inclusión mejore la trazabilidad sin interrumpir el hilo principal.

## Bibliografía consultada para este capítulo

> Esta relación se mantiene junto al borrador para facilitar la revisión. En la
> versión final se integrará en una única bibliografía general, conservando el
> orden de aparición de las citas en todo el documento.

[1] World Health Organization, *World Report on Vision*. Geneva, Switzerland:
World Health Organization, 2019. [Online]. Available:
https://www.who.int/publications/i/item/9789241516570. [Accessed: Aug. 25,
2026].

[2] Instituto Nacional de Estadística, “Encuesta de Discapacidad, Autonomía
Personal y Situaciones de Dependencia (EDAD). Principales resultados. Año
2020,” Madrid, España, Apr. 19, 2022. [Online]. Available:
https://www.ine.es/prensa/edad_2020_p.pdf. [Accessed: Aug. 25, 2026].

[3] United Nations, *Convention on the Rights of Persons with Disabilities and
Optional Protocol*. New York, NY, USA: United Nations, 2006. [Online].
Available:
https://www.un.org/disabilities/documents/convention/convoptprot-e.pdf.
[Accessed: Aug. 25, 2026].

[4] European Parliament and Council of the European Union, “Directive (EU)
2019/882 of 17 April 2019 on the accessibility requirements for products and
services,” *Official Journal of the European Union*, no. L 151, pp. 70–115,
Jun. 7, 2019. [Online]. Available:
https://eur-lex.europa.eu/eli/dir/2019/882/oj. [Accessed: Aug. 25, 2026].

[5] F. E.-Z. El-Taher, A. Taha, J. Courtney, and S. McKeever, “A systematic
review of urban navigation systems for visually impaired people,” *Sensors*,
vol. 21, no. 9, Art. no. 3103, 2021, doi: 10.3390/s21093103.

[6] S. Kammoun, F. Dramas, B. Oriola, and C. Jouffrais, “Route selection
algorithm for blind pedestrian,” in *Proc. 2010 Int. Conf. Control,
Automation and Systems (ICCAS)*, Gyeonggi-do, Republic of Korea, 2010,
pp. 2223–2228, doi: 10.1109/ICCAS.2010.5669846.

[7] A. Cohen and S. Dalyot, “Route planning for blind pedestrians using
OpenStreetMap,” *Environment and Planning B: Urban Analytics and City Science*,
vol. 48, no. 6, pp. 1511–1526, 2021,
doi: 10.1177/2399808320933907.

[8] E. Ohn-Bar, J. Guerreiro, K. Kitani, and C. Asakawa, “Variability in
reactions to instructional guidance during smartphone-based assisted
navigation of blind users,” *Proc. ACM Interact. Mobile Wearable Ubiquitous
Technol.*, vol. 2, no. 3, Art. no. 131, pp. 1–25, 2018,
doi: 10.1145/3264941.

[9] S. Amershi *et al.*, “Guidelines for human-AI interaction,” in *Proc. 2019
CHI Conf. Human Factors in Computing Systems (CHI '19)*, Glasgow, UK, 2019,
Art. no. 3, pp. 1–13, doi: 10.1145/3290605.3300233.

## Fuentes internas utilizadas para consolidar el capítulo

- [Alcance y plan del MVP](../product/alcance-mvp.md).
- [Especificación de accesibilidad](../accessibility-spec.md).
- [Estrategia de inteligencia artificial](../ai-strategy.md).
- [Seguridad y gestión de incertidumbre](../safety.md).
- [Perfil inicial y preferencias](../product/perfil-inicial-preferencias.md).
- [Selección del área piloto](../research/seleccion-area-piloto.md).
- [Aprendizaje adaptativo](../research/aprendizaje-adaptativo.md).
- [Resultados de evaluación](../evaluation/resultados.md).
- [Limitaciones y amenazas a la validez](../evaluation/limitaciones.md).
