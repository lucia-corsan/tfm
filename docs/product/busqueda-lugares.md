# Búsqueda y selección de lugares del área piloto

Estado: `En implementación`
Última actualización: `2026-08-11`
Responsabilidad principal: `product`

## Problema que resuelve

La comparación de rutas no debe depender permanentemente de unas coordenadas
escritas en el código. La persona necesita identificar de forma comprensible el
origen y el destino, mientras que el backend necesita recibir coordenadas WGS84
validadas. En esta fase se limita la búsqueda al área piloto para poder probar el
flujo completo sin introducir todavía un proveedor externo de geocodificación.

## Requisitos

- Buscar por nombre cuatro ubicaciones reconocibles del eje
  Moncloa–Argüelles–Príncipe Pío–Plaza de España.
- Ignorar diferencias de mayúsculas y tildes en la consulta.
- Mantener separados el texto buscado y el lugar finalmente seleccionado.
- Exponer origen, destino, resultados y errores a TalkBack.
- No comparar una ruta si origen y destino representan el mismo lugar.
- No realizar tráfico externo ni almacenar las consultas en esta primera versión.
- No fabricar coordenadas cuando no exista una coincidencia.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Coordenadas fijas | Muy simple y reproducible | No permite probar una selección real | Se conservan solo como valores iniciales |
| Catálogo local | Privado, rápido, reproducible y suficiente para el área piloto | Cobertura geográfica limitada | Elegido para el MVP inicial |
| Geocodificador externo | Cobertura amplia y nombres actuales | Dependencia de red, privacidad y mayor manejo de errores | Pospuesto como alternativa futura |

## Decisión adoptada

Se incorpora un catálogo local validado en el backend y se consulta mediante
`GET /api/v1/places/search`. La app no usa directamente coordenadas escritas en
la interfaz: presenta nombres y descripciones, valida la respuesta y solo guarda
en el estado de la pantalla el resultado elegido. Moncloa y Príncipe Pío siguen
seleccionados al abrir la demostración para preservar un recorrido funcional.

La búsqueda se activa explícitamente mediante un botón o la acción de búsqueda
del teclado. Esta decisión evita peticiones en cada pulsación y produce un flujo
más predecible para TalkBack. Los resultados son botones independientes con un
nombre accesible completo.

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
- Procedencia `pilot_catalog`.

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
- Propagación de las coordenadas seleccionadas a la petición de rutas.
- Etiquetas y estados accesibles de campos y resultados.
- Bloqueo de una comparación con origen y destino iguales.

## Resultados

La búsqueda, el cliente HTTP y los selectores de la pantalla están validados de
forma automática. El backend supera 157 pruebas y la aplicación, 43 pruebas,
además de las comprobaciones de Ruff, TypeScript y ESLint. La comprobación
manual del nuevo flujo con TalkBack sigue pendiente.

## Riesgos y limitaciones

- El catálogo no equivale a una búsqueda completa de Madrid.
- Un nombre representa un punto de referencia aproximado, no una entrada exacta
  ni una garantía de accesibilidad del acceso al edificio.
- El catálogo debe ampliarse o sustituirse antes de ofrecer cobertura general.

## Texto base para la memoria

La selección de origen y destino se introdujo primero mediante un catálogo local
del área piloto. Esta solución permitió desacoplar la interfaz de usuario de las
coordenadas internas, validar el flujo completo de búsqueda y preservar la
reproducibilidad de las pruebas sin depender de un geocodificador externo. La
consulta ignora mayúsculas y tildes, pero nunca genera ubicaciones inexistentes:
si no hay coincidencia, devuelve una lista vacía. La app valida además la
procedencia y las coordenadas de cada resultado antes de incorporarlo a una
petición de rutas. Esta primera versión prioriza privacidad, accesibilidad y
control experimental; la ampliación a todo Madrid queda planteada mediante un
proveedor intercambiable.

## Trabajo pendiente

- [ ] Validar visualmente el flujo completo con TalkBack.
- [ ] Evaluar un proveedor de geocodificación para ampliar la cobertura.
- [ ] Definir puntos de entrada más precisos cuando se trabaje con edificios.

## Referencias y evidencias

- `docs/product/especificacion-api.md`
- `tests/places/test_catalog.py`
- `tests/api/test_places.py`
- `app/__tests__/apiClient.test.ts`
- `app/__tests__/apiValidation.test.ts`

## Revisión previa a la publicación

- [x] La ortografía, las tildes, la puntuación y la concordancia son correctas.
- [x] Los términos técnicos están definidos y se han evitado anglicismos
  innecesarios.
- [x] El estado descrito coincide con la implementación y las pruebas reales.
- [x] El documento no contiene secretos, datos personales ni rutas locales.
