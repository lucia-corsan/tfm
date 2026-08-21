# Lugares guardados en el dispositivo

Estado: `Validado`
Última actualización: `21 de agosto de 2026`
Responsabilidad principal: `product`

## Problema que resuelve

Escribir una dirección completa cada vez añade tiempo y carga de interacción,
especialmente cuando se utiliza TalkBack o un teclado externo. Los destinos
habituales —por ejemplo, casa, trabajo o gimnasio— deben poder reconocerse por
un nombre breve y reutilizarse como origen o destino.

La función no crea una cuenta ni sincroniza lugares con un servidor. El nombre,
la dirección seleccionada y sus coordenadas se guardan únicamente en SQLite en
el dispositivo. Las coordenadas son necesarias para pedir una ruta cuando se
elige el lugar; no se usan como historial de movimientos ni como traza GPS.

## Requisitos

- Preguntar, después de la configuración inicial, si se desea guardar un primer
  lugar habitual.
- Permitir omitir el paso sin bloquear el acceso a la aplicación.
- Exigir un nombre comprensible y una dirección seleccionada de resultados
  geocodificados; no aceptar texto ambiguo que todavía no tenga coordenadas.
- Permitir añadir y eliminar lugares desde Ajustes.
- Mostrar los lugares guardados en la elección de origen y de destino.
- Mostrar el apartado incluso cuando esté vacío y ofrecer desde él un acceso
  directo al formulario de Ajustes.
- Conservarlos entre reinicios y mantenerlos fuera de las peticiones hasta que
  la persona elija uno para calcular una ruta.
- No almacenar audio, trazas GPS ni un historial de veces que se utilizó cada
  lugar.
- Mantener etiquetas, pistas y objetivos táctiles compatibles con TalkBack.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Guardar solo el texto escrito | Muy sencillo | Puede no corresponder a un punto geográfico válido y obliga a geocodificar de nuevo | Descartada |
| Guardar el resultado geocodificado y un alias local | Selección inmediata, reproducible y con un nombre reconocible | Conserva una coordenada sensible en el teléfono | Adoptada, con almacenamiento exclusivamente local |
| Cuenta y sincronización remota | Recuperación en varios dispositivos | Amplía innecesariamente identidad, seguridad y protección de datos | Descartada para el MVP |
| Añadir la pregunta dentro de las catorce prioridades | Un único cuestionario lineal | Mezcla movilidad con datos opcionales y exige un formulario dentro de una opción | Descartada |
| Paso opcional después del perfil | Separa las preferencias del ranking y permite omitirlo | Añade una pantalla al primer uso | Adoptada |

## Decisión adoptada

Al terminar o saltar el cuestionario se presenta una pantalla independiente:
«¿Quieres guardar un lugar habitual?». «Ahora no» continúa directamente y
explica que la función seguirá disponible en Ajustes. Si se acepta, el formulario
solicita:

1. un nombre local, como «Casa» o «Gimnasio»;
2. una consulta de dirección;
3. la selección explícita de uno de los resultados devueltos por el buscador.

El botón «Guardar lugar» permanece desactivado hasta que existen ambos valores.
La aplicación conserva el resultado estructurado que ya contiene nombre,
descripción, identificador, fuente y coordenadas. Al planificar, primero aparece
la barra de búsqueda, que sigue siendo la forma principal de introducir una
dirección nueva. Inmediatamente debajo se muestra «Elige un lugar guardado» y
cada lugar habitual puede seleccionarse con una sola acción.

La respuesta a este paso se persiste de forma independiente del perfil. Esta
separación también resuelve la actualización de instalaciones existentes: si
ya había un perfil creado antes de incorporar los lugares guardados, Rumbo
muestra la pregunta una vez después de la portada. Guardar un lugar o pulsar
«Ahora no» deja constancia local de que el paso ya fue respondido, por lo que no
se repite en cada apertura.

En Ajustes, «Lugares guardados» muestra el alias y la dirección, permite añadir
otros y elimina cada elemento mediante un botón cuyo nombre incluye el alias.
El borrado afecta solo a ese elemento y no altera el perfil, el aprendizaje ni
las rutas activas.

El apartado ocupa una posición inicial en Ajustes para que no quede oculto tras
las opciones de voz y aprendizaje. En origen y destino se mantiene siempre el
título «Elige un lugar guardado»: cuando la lista está vacía, explica el estado
y muestra «Añadir un lugar desde Ajustes». Después del alta, al cerrar Ajustes,
la nueva opción aparece en la misma pantalla sin repetir la búsqueda.

Este orden evita que los lugares ya almacenados parezcan las únicas opciones
disponibles. La persona encuentra primero un campo conocido para buscar
cualquier dirección y, como atajo opcional, consulta después sus lugares
habituales.

## Justificación

Separar esta función del perfil evita interpretar una dirección como una
preferencia del algoritmo. El ranking recibe exactamente las mismas coordenadas
que recibiría tras una búsqueda manual; por tanto, guardar un lugar reduce la
carga de entrada, pero no modifica restricciones, pesos ni aprendizaje.

El alias breve mejora la reconocibilidad y el resultado geocodificado evita
ambigüedad. El coste de privacidad se limita mediante cuatro decisiones: no hay
cuenta, no hay sincronización, no se registra el uso y el dato solo sale del
dispositivo cuando la persona lo selecciona para solicitar una ruta.

## Datos de entrada y salida

### Entrada

- `name`: alias escrito por la persona y sin espacios extremos.
- `place`: resultado validado del catálogo piloto o del geocodificador de ORS.
- Acción explícita de añadir, seleccionar o eliminar.

### Salida

- `SavedPlace`: identificador local, alias y `PlaceResult` completo.
- Lista visible en Ajustes y en las pantallas de origen y destino.
- Coordenadas de origen o destino únicamente cuando el elemento se selecciona.

## Implementación

- `app/src/features/saved-places/storage.ts`: modelo, validación defensiva,
  versión del formato, carga, guardado y marca independiente del paso inicial.
- `app/src/features/saved-places/useSavedPlaces.ts`: estado reactivo y
  persistencia de altas y bajas.
- `app/src/screens/SavedPlacesOnboardingScreen.tsx`: decisión opcional tras el
  perfil.
- `app/src/screens/SavedPlaceEditorScreen.tsx`: alias y búsqueda de dirección.
- `app/src/screens/SettingsScreen.tsx`: listado, alta y eliminación.
- `app/src/screens/PlaceQueryScreen.tsx`: reutilización como origen o destino.
- `app/src/app/index.tsx`: fuente única de la lista durante la sesión.
- Almacenamiento: `expo-sqlite/kv-store`, ya utilizado por las preferencias; no
  se ha añadido una dependencia ni una base de datos remota.

## Pruebas

- Guardado y recuperación completa en un almacén local en memoria.
- Conservación de nombre, dirección y coordenadas.
- Selección de un elemento guardado como destino.
- Presencia del buscador antes del apartado de lugares guardados tanto en
  origen como en destino.
- Estado vacío visible en la elección de origen, con acceso a Ajustes.
- Presencia de las acciones «Sí, guardar un lugar» y «Ahora no» en el primer
  uso.
- Persistencia de la respuesta al paso para que no se repita y para que también
  alcance a instalaciones con un perfil anterior.
- TypeScript, lint y 162 pruebas de la aplicación superados.

## Resultados

La función está conectada de extremo a extremo: configuración inicial, Ajustes,
almacenamiento y selección del trayecto comparten la misma lista. La prueba
automatizada confirma la persistencia y la reutilización. La reducción de tiempo
y gestos todavía no se ha medido con participantes.

## Riesgos y limitaciones

- Una dirección guardada revela hábitos si otra persona accede al teléfono. El
  MVP depende de la protección del dispositivo y debe explicarlo en privacidad.
- Los elementos no se sincronizan ni se recuperan después de desinstalar.
- No existe todavía edición: para corregir un lugar se elimina y se vuelve a
  añadir.
- El alias no se comprueba frente a diagnósticos ni categorías; es texto libre
  local.
- Un cambio real en una calle no actualiza automáticamente un resultado ya
  guardado.

## Texto base para la memoria

> Para reducir la carga repetitiva de introducción, se incorporaron lugares
> habituales almacenados exclusivamente en el dispositivo. Cada registro une
> un alias elegido por la persona con un resultado geocodificado validado. La
> función se ofrece como paso opcional tras el perfil y permanece disponible en
> Ajustes; los registros pueden seleccionarse posteriormente como origen o
> destino. Esta capa no modifica el algoritmo de clasificación: únicamente
> proporciona las coordenadas que también se obtendrían mediante una búsqueda
> manual. No se mantiene una cuenta, un historial de uso ni una traza de
> ubicación.

## Trabajo pendiente

- [ ] Añadir edición directa del alias o la dirección.
- [ ] Permitir ordenar los lugares de forma explícita si las pruebas de uso lo
  justifican.
- [ ] Evaluar el recorrido con TalkBack y participantes.
- [ ] Incorporar una opción confirmada para borrar todos los datos locales.

## Referencias y evidencias

- [Búsqueda y selección de lugares](busqueda-lugares.md).
- [Ajustes locales y modos de presentación](ajustes-presentacion.md).
- Prueba: `app/__tests__/savedPlaces.test.tsx`.

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
