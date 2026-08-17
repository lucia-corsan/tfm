# Referencias académicas y técnicas pendientes

Estado: `En implementación`
Última actualización: 16 de agosto de 2026.

## Regla

No añadir una afirmación técnica o académica a la memoria sin guardar su fuente,
fecha de consulta y sección donde se utiliza. Priorizar artículos originales y
documentación oficial.

## Búsquedas académicas pendientes

- Cálculo de rutas accesibles para personas ciegas o con baja visión.
- Modelos multicriterio de accesibilidad peatonal.
- Aprendizaje de preferencias por pares (*pairwise*) y bandidos contextuales
  (*contextual bandits*).
- Explicabilidad y calibración de incertidumbre.
- Evaluación de interfaces de navegación con lectores de pantalla.

## Documentación técnica pendiente de consolidar

| Fuente | Tema | Capítulo | Estado |
| --- | --- | --- | --- |
| OpenRouteService | Directions API y privacidad | Estado del arte / implementación | Pendiente |
| OpenStreetMap Wiki | Semántica de tags utilizados | Metodología | Pendiente |
| Mapillary | Graph API y metadatos | Metodología | Pendiente |
| Expo | Location, Speech y development builds | Implementación | Consolidada para TTS |
| Android Developers | TalkBack y accesibilidad | Diseño / evaluación | Consolidada para la narración |
| W3C WAI | Claridad, concisión y orden de lectura | Diseño / implementación | Consolidada para la narración |
| OpenRouteService | Tipos de instrucciones de ruta | Implementación | Consolidada para la narración |

## Referencias consolidadas para las instrucciones accesibles

Las siguientes referencias ya sustentan decisiones implementadas. En la versión
final de la memoria deberán adaptarse al estilo bibliográfico exigido por el
máster.

### W3C WAI — Redacción accesible

- **Referencia completa:** World Wide Web Consortium, Web Accessibility
  Initiative. *Writing for Web Accessibility — Tips for Getting Started*.
- **URL:** <https://www.w3.org/WAI/tips/writing/>.
- **Fecha de consulta:** 14 de agosto de 2026.
- **Afirmación respaldada:** las instrucciones deben ser claras y el contenido
  debe mantenerse conciso mediante frases y párrafos breves.
- **Aplicación en el proyecto:** la indicación principal empieza por la acción,
  continúa con la distancia y resume solo el primer contexto relevante.
- **Capítulo y sección:** diseño del sistema e implementación de la narración.

### W3C WAI — Contenido claro y comprensible

- **Referencia completa:** World Wide Web Consortium, Web Accessibility
  Initiative. *Use Clear and Understandable Content*.
- **URL:**
  <https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/>.
- **Fecha de consulta:** 14 de agosto de 2026.
- **Afirmación respaldada:** se recomienda lenguaje sencillo, contenido
  inequívoco, bloques cortos y separación de las instrucciones.
- **Aplicación en el proyecto:** se sustituyó la información fragmentada por un
  resumen operativo y se mantuvieron los detalles como unidades independientes.
- **Capítulo y sección:** diseño de interacción y accesibilidad.

### W3C WAI — Orden del foco

- **Referencia completa:** World Wide Web Consortium, Web Accessibility
  Initiative. *Understanding Success Criterion 2.4.3: Focus Order*.
- **URL:** <https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html>.
- **Fecha de consulta:** 14 de agosto de 2026.
- **Afirmación respaldada:** una navegación secuencial debe conservar un orden
  coherente con el significado y la operación de la interfaz.
- **Aplicación en el proyecto:** TalkBack recorre instrucción, contexto, detalles
  y botones en el mismo orden en que deben comprenderse y utilizarse.
- **Capítulo y sección:** diseño del sistema y evaluación de accesibilidad.

### W3C WAI — Características sensoriales

- **Referencia completa:** World Wide Web Consortium, Web Accessibility
  Initiative. *Understanding Success Criterion 1.3.3: Sensory Characteristics*.
- **URL:**
  <https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html>.
- **Fecha de consulta:** 14 de agosto de 2026.
- **Afirmación respaldada:** las instrucciones no deben depender exclusivamente
  de características como orientación, posición o sonido.
- **Aplicación en el proyecto:** una señal acústica nunca constituye por sí sola
  la indicación; se acompaña de maniobra, distancia, tipo de elemento y texto.
- **Capítulo y sección:** requisitos de accesibilidad y narración.

### Android Developers — Validación con TalkBack

- **Referencia completa:** Android Developers. *Test your app's accessibility*.
- **URL:**
  <https://developer.android.com/guide/topics/ui/accessibility/testing>.
- **Fecha de consulta:** 14 de agosto de 2026.
- **Afirmación respaldada:** la aplicación debe recorrerse secuencialmente con
  TalkBack, comprobando que todos los elementos sean alcanzables y que sus
  anuncios sean útiles y concisos.
- **Aplicación en el proyecto:** esta secuencia forma parte del protocolo manual
  en el emulador y se diferencia de las pruebas automáticas.
- **Capítulo y sección:** evaluación de accesibilidad y limitaciones.

### OpenRouteService — Tipos de maniobra

- **Referencia completa:** openrouteservice. *Instruction Types*.
- **URL:**
  <https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/instruction-types>.
- **Fecha de consulta:** 14 de agosto de 2026.
- **Afirmación respaldada:** ORS codifica catorce tipos de instrucción entre los
  valores 0 y 13.
- **Aplicación en el proyecto:** cada código se convierte en una maniobra propia
  y después en una plantilla española reproducible.
- **Capítulo y sección:** implementación del proveedor de rutas y narración.

## Referencias consolidadas para TTS y velocidad

### Choi et al. — Velocidad de voz y discapacidad visual

- **Referencia completa:** Dasom Choi, Daehyun Kwak, Minji Cho y Sangsu Lee.
  «Nobody Speaks that Fast! An Empirical Study of Speech Rate in
  Conversational Agents for People with Vision Impairments». *Proceedings of
  the 2020 CHI Conference on Human Factors in Computing Systems*, 2020.
- **DOI:** <https://doi.org/10.1145/3313831.3376569>.
- **Fecha de consulta:** 16 de agosto de 2026.
- **Afirmación respaldada:** la velocidad habitual varía entre usuarios y estos
  desean controlarla directamente según la tarea y el contenido.
- **Aplicación en el proyecto:** se descarta una velocidad única y se ofrecen
  cuatro niveles. El estudio no se utiliza para afirmar que uno sea óptimo en
  español o durante la movilidad.
- **Capítulo y sección:** diseño de la interacción por voz e implementación.

### Expo — Síntesis de voz

- **Referencia completa:** Expo. *Speech (`expo-speech`)*.
- **URL:** <https://docs.expo.dev/versions/latest/sdk/speech/>.
- **Fecha de consulta:** 16 de agosto de 2026.
- **Afirmación respaldada:** la biblioteca permite indicar idioma, tono y
  velocidad relativa, escuchar eventos e interrumpir la cola con `stop()`.
- **Aplicación en el proyecto:** locución en `es-ES`, cuatro multiplicadores y
  cancelación antes de una nueva instrucción.
- **Capítulo y sección:** implementación de la aplicación móvil.

### React Native — Estado del lector de pantalla

- **Referencia completa:** React Native. *AccessibilityInfo*.
- **URL:** <https://reactnative.dev/docs/accessibilityinfo>.
- **Fecha de consulta:** 16 de agosto de 2026.
- **Afirmación respaldada:** la API permite consultar si un lector de pantalla
  está activo y observar sus cambios.
- **Aplicación en el proyecto:** se bloquea dinámicamente la voz propia de la
  app cuando TalkBack está activo.
- **Capítulo y sección:** accesibilidad y coordinación de canales de voz.

### Android Developers — Velocidad relativa del motor

- **Referencia completa:** Android Developers. *TextToSpeech.setSpeechRate*.
- **URL:**
  <https://developer.android.com/reference/android/speech/tts/TextToSpeech#setSpeechRate(float)>.
- **Fecha de consulta:** 16 de agosto de 2026.
- **Afirmación respaldada:** 1,0 representa el ritmo normal del motor y los
  valores inferiores o superiores actúan como multiplicadores.
- **Aplicación en el proyecto:** los niveles se presentan como relativos, no
  como palabras por minuto equivalentes entre dispositivos.
- **Capítulo y sección:** decisiones de implementación y limitaciones.

### Android Developers — Regiones dinámicas en Android 16

- **Referencia completa:** Android Developers. *Behavior changes: all apps —
  Deprecating disruptive accessibility announcements*.
- **URL:**
  <https://developer.android.com/about/versions/16/behavior-changes-all#accessibility>.
- **Fecha de consulta:** 17 de agosto de 2026.
- **Afirmación respaldada:** los anuncios forzados se desaconsejan y las
  regiones dinámicas son la alternativa indicada para cambios críticos de la
  interfaz, utilizándolas con moderación.
- **Aplicación en el proyecto:** una región moderada comunica la instrucción
  nueva, mientras que desviaciones, recálculos y errores conservan prioridad
  alta; el contador no genera un anuncio duplicado.
- **Capítulo y sección:** accesibilidad de la navegación y coordinación con
  TalkBack.

### W3C WAI — Control y no interferencia del audio

- **Referencia completa:** World Wide Web Consortium, Web Accessibility
  Initiative. *Understanding Success Criterion 1.4.2: Audio Control*.
- **URL:** <https://www.w3.org/WAI/WCAG22/Understanding/audio-control>.
- **Fecha de consulta:** 16 de agosto de 2026.
- **Afirmación respaldada:** el audio automático puede interferir con el lector
  de pantalla y debe poder detenerse.
- **Aplicación en el proyecto:** reproducción automática desactivada por
  defecto, control de detención y bloqueo de la segunda voz con TalkBack.
- **Capítulo y sección:** requisitos de accesibilidad y diseño de TTS.

## Formato de registro

- Referencia completa:
- URL/DOI:
- Fecha de consulta:
- Afirmación respaldada:
- Capítulo y sección:
