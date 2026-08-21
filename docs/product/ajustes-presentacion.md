# Ajustes locales y modos de presentación

Estado: `Validado`
Última actualización: `21 de agosto de 2026`
Responsabilidad principal: `product`

## Problema que resuelve

El cuestionario inicial ya preguntaba cómo quería la persona ver el contenido,
pero la respuesta solo se almacenaba: todavía no transformaba la interfaz. Esto
generaba una incoherencia entre lo prometido y lo implementado. Además, una
preferencia puede cambiar después del primer uso, por lo que no debe ser
necesario repetir toda la configuración para aumentar el texto, reforzar el
contraste o pausar el aprendizaje.

La nueva pantalla de Ajustes reúne las decisiones locales que pueden revisarse
durante el uso. No se plantea como una cuenta de usuario: el MVP continúa sin
registro, sin sincronización remota y sin almacenar identidad.

## Requisitos

- Conectar la respuesta de presentación del cuestionario con toda la interfaz.
- Ofrecer cuatro estados: sistema, texto grande, contraste reforzado y ambos.
- Aplicar el cambio de forma inmediata y conservarlo después de cerrar la app.
- Aplicar texto y contraste en la propia configuración inicial, sin esperar a
  terminar las catorce preguntas.
- Mantener el escalado de fuente configurado en Android.
- Conservar el contenido en un desplazamiento vertical cuando el texto crezca.
- No usar el color como único medio para comunicar un estado.
- Permitir editar el perfil funcional y el consentimiento del aprendizaje.
- Permitir consultar, añadir y eliminar lugares guardados sin abandonar
  Ajustes.
- Permitir cambiar el modo y la velocidad de la voz propia de Rumbo; no
  modificar la configuración global de TalkBack.
- Mostrar en Ajustes un resumen de cada valor guardado y una acción «Editar»,
  en vez de repetir allí todos los controles del cuestionario.
- Abrir únicamente la pregunta relacionada con el ajuste, mantener el cambio
  como borrador y persistirlo solo al pulsar «Guardar cambios».
- Mantener el perfil y los ajustes solo en el dispositivo.
- No modificar el ranking al cambiar texto, contraste, voz o presentación.
- Mostrar un botón de retroceso grande, con flecha verde y fondo transparente
  sobre la cabecera blanca, en lugar del botón negro del diseño de referencia.
- Mantener el engranaje también en la introducción, las preguntas y el paso de
  lugares guardados. La portada animada queda fuera porque todavía no existe
  una configuración que editar.
- Cuando las preguntas se abren desde Ajustes, usar el mismo engranaje como
  regreso explícito a esa pantalla, sin descartar el flujo de la aplicación.
- Separar el engranaje del borde derecho para que el acceso flotante de TalkBack
  no lo cubra en el emulador ni en dispositivos que muestren ese control.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Depender únicamente del tamaño y contraste del sistema | Menos código y coherencia con Android | No satisface a quien solicita un refuerzo adicional dentro de Rumbo | Se mantiene como opción recomendada, pero no como única posibilidad |
| Crear versiones duplicadas de cada pantalla | Control visual completo | Duplicación, divergencias y riesgo de perder accesibilidad o funciones | Descartada |
| Aplicar un tema global reactivo a componentes compartidos | Un cambio alcanza todo el flujo y conserva la misma lógica | Exige migrar los componentes que tenían colores o tamaños fijos | Adoptada |
| Guardar ajustes en un servidor o una cuenta | Sincronización entre dispositivos | Recoge más datos y crea una dependencia innecesaria | Descartada para el MVP |
| Abrir Ajustes sustituyendo la pantalla actual | Implementación sencilla | Se perderían origen, destino o resultados al desmontar el flujo | Descartada |
| Abrir Ajustes a pantalla completa sobre el flujo | Mantiene el estado anterior y ofrece un árbol accesible independiente | Requiere gestionar el cierre y el retorno | Adoptada |
| Repetir todos los selectores dentro de Ajustes | Permite cambiar valores sin abandonar la pantalla | Duplica la interfaz, alarga la vista y crea dos formas distintas de editar la misma respuesta | Descartada |
| Mostrar el valor actual y abrir su pregunta original | Mantiene una única forma de responder, reduce ruido y permite confirmar o cancelar | Añade una transición de pantalla | Adoptada |

## Decisión adoptada

### Matriz de comportamiento

| Respuesta | Tamaño interno | Paleta | Efecto en el ranking |
| --- | --- | --- | --- |
| Seguir el sistema | Escala base de Rumbo, además del escalado de Android | Paleta AA de Rumbo | Ninguno |
| Texto más grande | Multiplica por 1,25 tamaños e interlineados de los estilos tipográficos | Paleta AA de Rumbo | Ninguno |
| Contraste reforzado | Escala base | Paleta reforzada | Ninguno |
| Texto más grande y contraste reforzado | Multiplicador 1,25 | Paleta reforzada | Ninguno |

El factor 1,25 es una decisión conservadora de producto: hace visible la
diferencia sin fijar tamaños absolutos ni desactivar `allowFontScaling`. Android
puede seguir ampliando el texto por encima de ese valor. No se presenta como un
umbral clínico y deberá revisarse con personas con baja visión.

### Paleta reforzada

La variante reforzada no corrige un incumplimiento de la paleta normal —que ya
se diseñó para WCAG 2.2 AA—, sino que ofrece una separación mayor para quien la
prefiera. Sus relaciones principales, calculadas según la luminancia relativa
de WCAG, son:

| Uso | Primer plano | Fondo | Relación de contraste |
| --- | --- | --- | ---: |
| Texto principal | `#000000` | `#FFFFFF` | 21,00:1 |
| Acción verde | `#005A2B` | `#FFFFFF` | 8,41:1 |
| Texto sobre verde suave | `#003D1D` | `#F1FFF7` | 12,10:1 |
| Texto secundario | `#202020` | `#FFFFFF` | 16,29:1 |
| Información favorable | `#003D73` | `#F1F7FF` | 10,18:1 |
| Aviso ámbar | `#3D2900` | `#FFF8E5` | 13,07:1 |

Además de oscurecer texto e iconos, el modo refuerza bordes en tarjetas,
opciones, métricas y avisos. Los iconos y rótulos se conservan, por lo que la
distinción no depende exclusivamente del color.

### Contenido de Ajustes

La pantalla mantiene una única columna, texto grande y separadores sencillos,
inspirados en la referencia recibida. Incluye:

1. **Preferencias de las rutas**: vuelve a abrir las catorce preguntas con las
   respuestas actuales. Si se habían omitido, informa de que siguen activos los
   dos perfiles generales y ofrece «Crear mi perfil personalizado».
2. **Presentación visual**: muestra la respuesta vigente y un botón que abre
   únicamente la pregunta con las cuatro opciones visuales. El tema actúa como
   vista previa dentro de esa pantalla, pero solo se conserva al confirmar.
3. **Voz e interacción**: muestra por separado el modo y, cuando procede, la
   velocidad guardados. Cada botón «Editar» abre la pregunta correspondiente:
   lectura automática, escucha bajo demanda o voz adicional desactivada; y
   velocidad lenta, normal, rápida o muy rápida. La aclaración distingue estos
   ajustes de TalkBack.
4. **Aprendizaje adaptativo**: en el perfil personalizado muestra si está
   activado y abre la pregunta de consentimiento mediante «Editar aprendizaje
   adaptativo»; pausar no borra el estado aprendido. En modo general explica que
   la activación y el estado se gestionan por separado al elegir cada perfil,
   evitando un control ambiguo que afectase a dos modelos.
5. **Lugares guardados**: lista alias y dirección, permite eliminar cada
   elemento y abre el formulario de alta. Estos lugares aparecen después como
   opciones de origen y destino. La sección se sitúa al principio de Ajustes,
   antes de las opciones visuales y de voz, para que sea localizable sin un
   desplazamiento largo.
6. **Privacidad y almacenamiento**: resumen comprensible del enfoque local.

La pantalla se abre como una vista a pantalla completa sobre el flujo vigente.
Al volver, origen, destino, paso y resultados permanecen donde estaban. El
modal también aísla el árbol accesible de la pantalla subyacente mientras está
abierto. El acceso permanece disponible durante la navegación para poder
cambiar texto o contraste sin abandonarla. En ese caso se avisa de que los
cambios del perfil de movilidad solo se aplicarán a la siguiente comparación:
la ruta activa no se sustituye silenciosamente.

Los apartados de Ajustes usan separadores lineales y texto sobre el fondo
principal. No se emplean recuadros azules para agrupar opciones: el azul queda
reservado a estados semánticos allí donde sea necesario, no a la estructura de
esta pantalla.

Al editar una sola preferencia, «Volver» descarta el borrador y regresa a
Ajustes; «Guardar cambios» actualiza la respuesta completa, la persiste en el
almacenamiento local y vuelve a Ajustes. Reutilizar la pregunta original evita
que el mismo concepto tenga textos, opciones o comportamiento diferentes en el
primer uso y en revisiones posteriores.

Durante el primer uso se mantiene un borrador separado del perfil definitivo.
Al elegir texto grande o contraste, el proveedor visual lee inmediatamente ese
borrador y vuelve a dibujar la misma pregunta. El engranaje abre Ajustes con los
mismos valores provisionales, de modo que un cambio realizado allí también se
refleja al volver al cuestionario. El borrador no se considera un perfil válido
para el ranking ni se conserva como configuración terminada hasta que la
persona finaliza las catorce preguntas o decide omitirlas. Así se ofrece una
vista previa real sin convertir un formulario incompleto en una decisión
algorítmica.

## Justificación

Separar presentación y movilidad evita una inferencia incorrecta: necesitar
texto grande no implica preferir rutas distintas. Por ello, texto, contraste y
voz nunca se envían como pesos ni como restricciones. La misma respuesta se
utiliza solo para configurar la interfaz.

Un proveedor global evita copiar condiciones en cada pantalla. Los componentes
compartidos —texto, barra superior, botones, opciones, tarjetas, avisos,
métricas, búsqueda y banda de acción— consultan la presentación efectiva. De
esta forma, el árbol de accesibilidad y los controladores de negocio no cambian
entre modos.

## Datos de entrada y salida

### Entrada

- `presentation`: `system`, `largeText`, `highContrast` o `both`.
- `speech`: `automatic`, `onDemand` o `never`.
- `speechRate`: `slow`, `normal`, `fast` o `very_fast`.
- Respuestas ya guardadas del cuestionario.
- Cambio explícito del interruptor de aprendizaje.
- Lista local de lugares guardados.

### Salida

- Tema reactivo con tipografía y paleta efectivas.
- Respuestas completas actualizadas en la entrada local
  `onboarding:v1:answers`.
- Consentimiento adaptativo sincronizado con el controlador de aprendizaje.

El perfil y el aprendizaje no incorporan nombre, diagnóstico ni localización.
La función separada de lugares guardados sí conserva localmente un alias,
dirección y coordenadas, tal como se explica en su especificación y en el aviso
de privacidad de Ajustes.

## Implementación

- `app/src/theme/presentation.tsx`: proveedor global, factor de texto y paleta
  reforzada.
- `app/src/components/AccessibleText.tsx` y componentes visuales compartidos:
  consumen tipografía y color efectivos.
- `app/src/screens/SettingsScreen.tsx`: pantalla y secciones accesibles.
- `app/src/screens/OnboardingQuestionEditorScreen.tsx`: edición aislada de una
  pregunta, vista previa local y confirmación explícita.
- `app/src/app/index.tsx`: carga, guardado, apertura a pantalla completa y
  retorno sin desmontar el flujo anterior; separa el borrador inicial del perfil
  terminado.
- `app/src/features/onboarding/useOnboarding.ts`: formulario controlado durante
  el primer uso para que pregunta, tema y Ajustes compartan el mismo borrador.
- `app/src/screens/NavigationScreen.tsx`: acceso a Ajustes durante la ruta sin
  recalcularla ni detenerla; consume inmediatamente el modo y velocidad
  guardados.
- `app/src/features/saved-places/` y
  `app/src/screens/SavedPlaceEditorScreen.tsx`: persistencia y formulario de
  lugares; la especificación completa está en
  [Lugares guardados en el dispositivo](lugares-guardados.md).
- `app/i18n/es.ts`: textos en español y etiquetas accesibles.
- `app/src/features/onboarding/storage.ts`: persistencia local ya existente,
  reutilizada sin introducir otra fuente de verdad.

## Pruebas

- Texto grande aumenta tanto `fontSize` como `lineHeight`.
- Contraste reforzado utiliza negro para el texto principal.
- Ajustes no contiene radios ni interruptores directos: expone resúmenes y
  acciones de edición.
- Seleccionar texto grande en su editor modifica la vista previa y solo
  actualiza la respuesta completa al pulsar «Guardar cambios».
- Un borrador con texto grande y contraste modifica la introducción antes de
  completar o guardar el perfil.
- El engranaje está disponible en la introducción y durante las preguntas.
- La flecha de retroceso es verde y conserva un fondo transparente.
- El editor de aprendizaje actualiza solo el consentimiento adaptativo.
- El modo general no muestra un interruptor único y explica dónde se configura
  el aprendizaje de cada perfil.
- El modo de voz y la velocidad abren editores independientes y se actualizan
  como respuestas locales completas al guardar.
- Los lugares guardados se listan y pueden añadirse o eliminarse.
- TypeScript y el análisis estático de Expo no notifican incidencias.
- La suite previa de cuestionario, ranking y aprendizaje se conserva.

## Resultados

Las pruebas específicas de presentación, Ajustes y lugares guardados superan
los casos nominales descritos. Las
pruebas encadenadas verifican además que presentación y voz no cambian la
identidad del aprendizaje, mientras que una modificación de restricciones sí
la cambia. La validación visual manual con los tamaños extremos del sistema y
con una persona usuaria sigue pendiente; por tanto, el resultado demuestra
coherencia funcional, no eficacia perceptiva.

## Riesgos y limitaciones

- El factor 1,25 puede combinarse con una escala grande de Android y producir
  pantallas más largas. El contenido desplazable evita recortes, pero debe
  probarse al máximo de escala.
- Las cadenas largas pueden ocupar varias líneas. Se ha evitado fijar alturas
  de texto, pero todavía es necesaria una revisión visual de cada pantalla.
- El modo reforzado no sustituye la compatibilidad con inversión de color,
  ampliación u otras ayudas del sistema.
- No hay sincronización entre dispositivos ni recuperación tras desinstalar.
- La dirección y sus coordenadas se guardan en el dispositivo; dependen de la
  protección local de Android y deben tratarse como información sensible.

## Texto base para la memoria

> La preferencia de presentación se implementó como una dimensión independiente
> del perfil de movilidad. Un proveedor temático global aplica de forma reactiva
> cuatro configuraciones: ajustes del sistema, ampliación interna del 25 %,
> contraste reforzado y combinación de ambas. El modo reforzado emplea texto
> negro sobre blanco y un verde de acción con una relación de 8,41:1, además de
> reforzar los contornos de los componentes. Los cambios se guardan únicamente
> en el dispositivo y no intervienen en las restricciones ni en la puntuación
> de rutas. Una pantalla de Ajustes a pantalla completa permite modificar la
> presentación, configurar la voz, revisar el cuestionario, gestionar lugares
> habituales y controlar el aprendizaje sin perder el trayecto que estaba
> configurándose. Esta implementación demuestra
> consistencia funcional y cumplimiento técnico; su utilidad perceptiva deberá
> validarse con personas ciegas o con baja visión.

## Trabajo pendiente

- [ ] Revisar manualmente todas las pantallas con los cuatro modos y la escala
  máxima de Android.
- [ ] Evaluar comprensión, legibilidad y preferencia con participantes.
- [ ] Incorporar una acción confirmada para borrar el perfil local completo.

## Referencias y evidencias

- W3C (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*, criterios
  1.4.3, 1.4.4 y 1.4.11. <https://www.w3.org/TR/WCAG22/>.
- [Perfil inicial y preferencias de comparación](perfil-inicial-preferencias.md).
- [Sistema de diseño de la aplicación móvil](sistema-diseno-app.md).
- Pruebas: `app/__tests__/presentationSettings.test.tsx` y
  `app/__tests__/onboarding.test.tsx`.
- Pruebas de lugares: `app/__tests__/savedPlaces.test.tsx`.

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
