# Búsqueda y selección de lugares del área piloto

Estado: `Validado`
Última actualización: `2026-08-12`
Responsabilidad principal: `product`

## Problema que resuelve

La comparación de rutas no debe depender permanentemente de unas coordenadas
escritas en el código. La persona necesita identificar de forma comprensible el
origen y el destino, mientras que el backend necesita recibir coordenadas WGS84
validadas. La búsqueda se limita al área piloto para garantizar que cualquier
dirección seleccionada quede dentro de la instantánea OSM usada después para
evaluar las rutas. El catálogo inicial ofrece una demostración reproducible; la
segunda versión incorpora geocodificación externa para calles y portales.

## Requisitos

- Buscar por nombre cuatro ubicaciones reconocibles del eje
  Moncloa–Argüelles–Príncipe Pío–Plaza de España como respaldo local.
- Resolver calles, números y lugares libres dentro del área piloto.
- Ignorar diferencias de mayúsculas y tildes en la consulta.
- Mantener separados el texto buscado y el lugar finalmente seleccionado.
- Exponer origen, destino, resultados y errores a TalkBack.
- No comparar una ruta si origen y destino representan el mismo lugar.
- Ejecutar la petición externa solo después de una acción explícita de búsqueda.
- No incluir consultas, coordenadas ni credenciales en logs o mensajes de error.
- Mantener una caché privada con una clave derivada y sin el texto en el nombre
  del archivo.
- No fabricar coordenadas cuando no exista una coincidencia.
- Rechazar resultados fuera de la cobertura espacial aunque el geocodificador
  los devuelva.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Coordenadas fijas | Muy simple y reproducible | No permite probar una selección real | Se conservan solo como valores iniciales |
| Catálogo local | Privado, rápido, reproducible y suficiente para el área piloto | Cobertura geográfica limitada | Elegido para el MVP inicial |
| Geocodificador público de ORS | Admite direcciones libres y reutiliza la credencial ya configurada | Depende de Pelias y de la red; los resultados pueden cambiar | Elegido, acotado al área piloto y con caché |

## Decisión adoptada

`GET /api/v1/places/search` coordina dos fuentes. El catálogo local se consulta
primero y actúa como respaldo reproducible. Cuando existe configuración externa,
el backend consulta el servicio público de geocodificación de ORS —servido por
Pelias— con un límite rectangular coincidente con el área piloto. La app nunca
recibe la credencial y solo conserva en el estado el resultado elegido. Moncloa
y Príncipe Pío siguen seleccionados al abrir la demostración.

La búsqueda se activa explícitamente mediante un botón o la acción de búsqueda
del teclado. No se implementa autocompletado en cada pulsación: se reducen la
exposición del texto, las llamadas y la variabilidad durante el uso con
TalkBack. Los resultados son botones independientes con un nombre accesible
completo.

La restricción enviada al proveedor reduce resultados irrelevantes, pero no se
considera una garantía. Cada coordenada devuelta se valida de nuevo en el
backend frente al mismo límite antes de exponerse a la aplicación.

## Justificación

El catálogo local permite evaluar desde el principio la separación entre la
intención expresada por la persona —un nombre de lugar— y el dato técnico usado
por el motor —unas coordenadas—. También evita que los experimentos dependan de
cambios en servicios externos. La arquitectura mantiene una interfaz HTTP y
tipos públicos, por lo que posteriormente se podrá añadir un proveedor más
amplio sin acoplar la pantalla a su implementación.

## Datos de entrada y salida

### Entrada

- `q`: texto de consulta, entre 2 y 80 caracteres.
- `limit`: máximo de resultados, entre 1 y 10.

### Salida

- Identificador estable del lugar.
- Nombre y descripción para la interfaz accesible.
- Coordenadas WGS84 validadas.
- Procedencia `pilot_catalog` u `ors_geocoder`.

## Implementación

- `backend/places/`: catálogo, normalización y orden de relevancia.
- `backend/api/routes/places.py`: operación HTTP pública.
- `app/src/api/`: tipos, validación defensiva y cliente.
- `app/src/components/PlaceSearchField.tsx`: búsqueda y selección accesible.
- `app/src/features/route-comparison/`: incorporación de las coordenadas elegidas
  a la petición de comparación.

El proveedor de rutas mediante datos sintéticos solo reconoce el recorrido
Moncloa–Príncipe Pío. Las demás combinaciones requieren el proveedor ORS
enriquecido; la interfaz debe comunicar los errores sin presentar resultados
inventados.

## Pruebas

- Consultas con y sin tildes y con distintas mayúsculas.
- Orden determinista, límite de resultados y ausencia de coincidencias.
- Rechazo de respuestas con coordenadas, procedencias o identificadores inválidos.
- Filtrado posterior de coordenadas externas fuera del área piloto.
- Caché privada, clave opaca y reutilización sin una segunda llamada.
- Respaldo local ante fallo externo y error explícito cuando no existe respaldo.
- Propagación de las coordenadas seleccionadas a la petición de rutas.
- Etiquetas y estados accesibles de campos y resultados.
- Bloqueo de una comparación con origen y destino iguales.

## Resultados

La búsqueda local y externa, la caché, el cliente HTTP y los selectores de la
pantalla están validados de forma automática. El backend supera 175 pruebas y la
aplicación, 46 pruebas, además de las comprobaciones de Ruff, TypeScript y
ESLint. Una consulta real resolvió «Calle de Ferraz 22» y la segunda ejecución
idéntica se recuperó de la caché en aproximadamente 0,17 segundos.

La comprobación manual en Android Emulator confirmó que una dirección real del
área piloto puede buscarse, seleccionarse como origen o destino y utilizarse en
la comparación de rutas. El resultado se incorpora al orden de lectura de
TalkBack como un control independiente y las coordenadas elegidas llegan al
backend sin mostrarse ni registrarse en la interfaz. Con esta prueba queda
cerrada la búsqueda libre prevista para la segunda semana.

## Riesgos y limitaciones

- La búsqueda se limita deliberadamente a la cobertura del área piloto; no
  equivale todavía a una búsqueda completa de Madrid.
- Un nombre representa un punto de referencia aproximado, no una entrada exacta
  ni una garantía de accesibilidad del acceso al edificio.
- Para ofrecer cobertura general debe ampliarse primero la evidencia OSM y
  después el límite espacial de geocodificación.

## Texto base para la memoria

La selección de origen y destino se introdujo primero mediante un catálogo local
del área piloto. Esta solución permitió desacoplar la interfaz de usuario de las
coordenadas internas, validar el flujo completo de búsqueda y preservar la
reproducibilidad de las pruebas sin depender de un geocodificador externo. La
consulta ignora mayúsculas y tildes, pero nunca genera ubicaciones inexistentes:
si no hay coincidencia, devuelve una lista vacía. La app valida además la
procedencia y las coordenadas de cada resultado antes de incorporarlo a una
petición de rutas.

Sobre esta base se incorporó el geocodificador público de ORS para admitir
calles y portales libres dentro del área piloto. El backend limita y vuelve a
validar espacialmente los resultados, conserva la clave fuera de la app y
reutiliza las respuestas mediante una caché privada. El catálogo permanece como
respaldo reproducible. Esta combinación prioriza privacidad, accesibilidad y
control experimental; ampliar la búsqueda a todo Madrid requiere antes extender
la cobertura de evidencia OSM.

## Trabajo pendiente

- [x] Validar visualmente el flujo completo con TalkBack.
- [x] Evaluar un proveedor de geocodificación para ampliar la cobertura dentro
  del área piloto.
- [x] Validar la búsqueda libre con direcciones reales del área piloto.
- [ ] Definir puntos de entrada más precisos cuando se trabaje con edificios.

## Referencias y evidencias

- `docs/product/especificacion-api.md`
- `tests/places/test_catalog.py`
- `tests/api/test_places.py`
- `app/__tests__/apiClient.test.ts`
- `app/__tests__/apiValidation.test.ts`
- [Geocodificación de ORS](https://giscience.github.io/openrouteservice/api-reference/endpoints/geocoder/)
- [API pública de ORS](https://openrouteservice.org/dev/)

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
