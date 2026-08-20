# Arquitectura del MVP

Fecha de decisión inicial: 8 de agosto de 2026.

## Objetivo

Separar el cálculo de rutas, el análisis de accesibilidad, el aprendizaje y la
interfaz para que cada parte pueda probarse con datos reproducibles.

## Componentes

```text
Aplicación Android
    ├── presentación accesible
    ├── estado local de comparación
    ├── selección explícita de ruta
    ├── aprendizaje adaptativo local y consentido
    ├── persistencia SQLite por perfil
    ├── navegación por instrucciones y GPS en primer plano
    ├── sesión local con ruta, destino y perfil
    ├── confirmación y estado de rerouting
    ├── validación de respuestas
    └── cliente HTTP
            ↓ HTTP/JSON
FastAPI
    ↓
Servicio de comparación
    ├── proveedor de *fixtures*
    ├── proveedor ORS
    ├── agregación y deduplicación de candidatas
    ├── enriquecimiento OSM
    ├── restricciones y scoring
    └── narración determinista
```

- `backend/routing`: proveedores intercambiables y rerouting.
- `backend/services`: coordinación entre proveedor, restricciones, ranking y
  modelos de respuesta.
- `backend/enrichment`: relación entre geometrías y atributos OSM.
- `backend/scoring`: restricciones, adecuación, confianza y diversidad.
- `backend/narration`: instrucciones y explicaciones verificables.
- `backend/feedback`: adaptación acotada de pesos.
- `app`: interfaz Android accesible y persistencia local.
- `ml`: evaluación reproducible del aprendizaje.

La aplicación no contendrá la clave de ORS. Las peticiones externas se realizarán desde
el backend y el proveedor de *fixtures* permitirá trabajar sin conexión.

La navegación comparte una secuencia validada entre backend y app. ORS aporta
códigos de maniobra y posiciones sobre la geometría; el backend los transforma
en maniobras independientes del proveedor y genera una frase española mediante
plantillas. La app valida de nuevo orden y posiciones antes de mostrar el
contenido. En el primer incremento, la persona avanza manualmente. El GPS podrá
decidir cuándo proponer el siguiente paso, pero no cambia el texto ni las reglas
de accesibilidad. La app calcula localmente la distancia entre cada muestra y la
polilínea, filtra la precisión y mantiene el detector separado del componente
visual. La suscripción existe solo mientras la pantalla de navegación está
montada. El rerouting reutiliza el estado de confirmación producido por este
detector. La app conserva durante la sesión la ruta, el destino y el perfil
completo, pero no crea una cuenta ni una sesión remota. Tras una confirmación,
`POST /api/v1/routes/reroute` trata la última posición fiable como nuevo origen
y reutiliza el mismo proveedor, enriquecimiento, restricciones y ranking de la
comparación. La primera ruta aceptada reemplaza a la anterior solo después de
validar la respuesta; cualquier error conserva el estado previo.

La aplicación también se divide por responsabilidades. Los componentes no
realizan peticiones ni calculan puntuaciones; un hook controla los estados y un
cliente pequeño representa la frontera HTTP. Los tipos TypeScript documentan la
estructura y una validación en ejecución comprueba rangos, identificadores,
orden y coherencia matemática antes de que una respuesta llegue a la pantalla.
De este modo, el tipado estático no se confunde con validación de datos externos.

La dirección del backend es configuración pública mediante
`EXPO_PUBLIC_API_URL`, con `10.0.2.2` como dirección predeterminada para Android
Emulator. No se almacenarán secretos en variables `EXPO_PUBLIC_*`, dado que Expo
las incorpora al código de la aplicación.

El endpoint de comparación no contiene la fórmula. Delega en un servicio que
obtiene el escenario del proveedor configurado, ejecuta el mismo ranking probado
de forma aislada y construye la respuesta de la API. Esta capa evita acoplar
FastAPI, ORS y el sistema de decisión.

La generación y el ranking constituyen etapas distintas. El backend podrá
analizar una colección interna mayor que la respuesta pública, pero la app
recibirá como máximo tres alternativas. La ampliación será escalonada y nunca
relajará restricciones críticas. Esta separación se documenta en
`docs/research/generacion-rutas-candidatas.md`.

La deduplicación combina una huella exacta con una comparación espacial
simétrica. Esta última proyecta las líneas a `EPSG:25830` y aplica la regla
calibrada de 2 metros, 98 % de solapamiento y 3 % de diferencia de longitud. La
justificación, el barrido y sus límites se encuentran en
[la calibración espacial](evaluation/calibracion-deduplicacion-espacial.md).

El enriquecimiento no reutiliza los puntos representativos del estudio de
densidad. Una instantánea independiente conserva nodos y geometrías completas
de las vías del corredor piloto. La consulta, su fecha base y su esquema se
validan en cada lectura; Overpass queda fuera del flujo de comparación. La
correspondencia entre etiquetas y dimensiones se detalla en
[la preparación de OSM para rutas](research/preparacion-osm-para-rutas.md).

Las geometrías ORS y OSM se proyectan a ETRS89 / UTM zona 30N
(`EPSG:25830`) y se consultan mediante un índice espacial. El corredor general
de asociación se ha fijado inicialmente en 5 m tras comparar 5, 10, 15 y 20 m
con las mismas rutas reales. Las barreras críticas no se confirman por estar
dentro del corredor: exigen una distancia máxima de 0,5 m y, para vías, al
menos 3 m de alineación. Esta separación reduce el riesgo de atribuir a la ruta
una escalera o restricción de una calle paralela. La calibración y sus límites
se detallan en [la evaluación del corredor OSM](evaluation/calibracion-corredor-osm.md).

El proveedor de rutas se resuelve por configuración. `fixture` conserva el
flujo reproducible y sin red; `ors` ejecuta de forma asíncrona la generación,
la asociación OSM, el enriquecimiento conservador, las restricciones y el mismo
ranking explicable antes de responder a la aplicación.

## Especificaciones compartidas

Los límites HTTP usarán Pydantic v2. La aplicación mantendrá tipos TypeScript
equivalentes y centralizados. Los datos desconocidos se representarán de forma
explícita, nunca mediante valores favorables por defecto.

El estado móvil ignora cualquier respuesta que pertenezca a una selección de
perfil anterior. Esta regla evita una condición de carrera en la que una
petición lenta podría sobrescribir un resultado más reciente y presentar una
recomendación bajo el perfil incorrecto.

### Modelo de dominio y decisión explicable

Los modelos de datos compartidos se concentran en `backend/domain/models.py` para que
el proveedor de rutas, el scoring y la API utilicen la misma definición. El
primer corte vertical contiene:

- Coordenadas validadas y geometrías con al menos dos puntos.
- Perfil de movilidad y pesos declarados de preferencia.
- Evidencia trivaluada: `favorable`, `unfavorable` o `unknown`.
- Características medibles de cada ruta.
- Resumen explícito de incertidumbre.
- Candidato de ruta independiente del proveedor.
- Restricciones críticas aplicadas antes de cualquier coste gradual.
- Costes normalizados, adecuación, confianza e incertidumbre separadas.
- Ranking determinista con factores explicativos y avisos estructurados.

Los pesos representan importancia relativa, no seguridad. Las restricciones
críticas (`avoid_steps`, acceso peatonal y compatibilidad de cruces) se modelan
por separado y no podrán ser modificadas por el aprendizaje posterior.

La selección del perfil se mantiene durante la sesión móvil y el backend no
almacena preferencias. El aprendizaje utiliza SQLite como base de datos local
del dispositivo para el estado de los pesos y un historial acotado de
elecciones. No existe una base de datos remota ni una cuenta de usuario: cada
petición incluye el perfil activo y los pesos efectivos, mientras el backend
continúa sin estado respecto a la identidad de la persona.

El núcleo de aprendizaje de referencia está implementado en
`backend/feedback` y su versión móvil equivalente, en
`app/src/features/adaptive-preferences`. Conserva tres vectores distintos: el
declarado, que no se sobrescribe; el aprendido, que resume las elecciones; y el
efectivo, que mezcla ambos con una influencia aprendida máxima del 50 %. La
clasificación acepta este último como argumento explícito y opcional. El estado
se inicializa desactivado y solo podrá influir tras una activación explícita. El
perfil efímero empleado para puntuar no modifica las restricciones: `rank_routes`
ejecuta siempre `evaluate_constraints` antes de aplicar cualquier peso. De este
modo se evita que el componente estadístico readmita una ruta incompatible.
El constructor de cada plataforma recibe la clasificación ya filtrada y solo
genera comparaciones entre sus rutas aceptadas. La acción «Elegir esta ruta» se
vincula a esa misma respuesta mostrada, en lugar de aceptar identificadores o
costes reconstruidos fuera del flujo.

La aplicación es la propietaria del estado local y envía al backend los pesos
efectivos necesarios en cada comparación y recálculo. Python permanece como
implementación de referencia de la fórmula y un caso dorado compartido comprueba
que la traducción TypeScript reproduce la misma actualización hasta doce
decimales. SQLite conserva un único sobre versionado por perfil con estado e
historial; no guarda coordenadas, direcciones, geometrías, audio ni trazas GPS.
El flujo completo se documenta en
[Integración del aprendizaje adaptativo en la app](research/integracion-aprendizaje-adaptativo-app.md).

`backend/feedback/signal_quality.py` permanece junto al núcleo porque consume
el mismo formato mínimo de elecciones, pero tiene una responsabilidad distinta:
diagnostica contraste y diversidad sin actualizar pesos ni ordenar rutas. Su
resultado no controla todavía la aplicación. Esta separación evita confundir
una herramienta experimental validada sobre dos bancos con una política de
activación general.

Los *fixtures* de `backend/routing/fixture_data/` son escenarios sintéticos para
las pruebas y el desarrollo sin red. Sus geometrías sitúan el ejercicio en el
corredor
Moncloa–Argüelles–Príncipe Pío, pero sus atributos no deben citarse como
observaciones reales ni utilizarse como evidencia empírica en la memoria.

La explicación completa de ORS, OSM, Mapillary y el plan de cuatro semanas se
encuentra en `docs/product/alcance-mvp.md`.

La definición detallada de perfil, preferencias, evidencia, rutas e
incertidumbre, junto con la justificación de cada decisión, se encuentra en
`docs/research/modelo-dominio-accesibilidad.md`.

La fórmula, sus escalas iniciales, la política de restricciones y los resultados
sintéticos del día 3 se documentan en
`docs/research/scoring-explicable.md`. La API consumirá estos resultados sin
duplicar la lógica en la aplicación móvil.
