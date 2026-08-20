# Guía de demostración reproducible

Estado: `Vigente`  
Última actualización: 18 de agosto de 2026  
Responsabilidad principal: `operations`

## Problema que resuelve

La demostración combina dos procesos, un emulador, un servicio externo y un
lector de pantalla. Esta guía reduce errores de preparación y define qué debe
observar el tribunal en cada paso. Incluye un modo real y un respaldo local para
que un fallo puntual de red no impida enseñar el sistema de decisión.

## Antes del día de la defensa

Desde la raíz del repositorio, ejecutar:

```bash
bash scripts/verificar-mvp.sh
```

Después:

1. Abrir Android Studio y arrancar el Pixel 9 virtual.
2. Comprobar que aparece como `device`:

   ```bash
   adb devices
   ```

3. Confirmar que `.env` existe, no está versionado y contiene la clave ORS solo
   si se va a usar el modo real.
4. Comprobar que la instantánea OSM local indicada por `OSM_SNAPSHOT_PATH`
   existe.
5. Ensayar una vez el flujo real y una vez el respaldo sintético.
6. Configurar Android en español de España y recorrer la app con TalkBack.

## Modo principal: rutas ORS enriquecidas con OSM

La configuración local debe contener:

```text
ROUTING_PROVIDER=ors
PLACE_SEARCH_PROVIDER=ors
ORS_API_KEY=valor_local_no_versionado
OSM_SNAPSHOT_PATH=data/raw/osm-routing/moncloa_principe_pio.snapshot.json
```

No se debe mostrar ni copiar la clave durante la defensa.

### Terminal 1: backend

```bash
source .venv/bin/activate
python -m uvicorn backend.main:app --reload
```

En otra terminal se puede comprobar la API:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

### Terminal 2: aplicación

```bash
cd app
npm run android
```

Expo debe abrir la aplicación en el emulador. Si Metro ya está activo, se puede
recargar desde su terminal o desde el menú de desarrollo.

## Guion principal de diez minutos

### 1. Perfil y control de la persona

- Mostrar las preferencias declaradas.
- Explicar que las restricciones críticas se aplican antes del aprendizaje.
- Señalar que el aprendizaje comienza desactivado y se puede pausar o reiniciar.

Qué demuestra: personalización explícita, consentimiento y límites de seguridad.

### 2. Origen y destino

- Buscar dos direcciones del área piloto.
- Elegir origen y destino y solicitar la comparación.

Qué demuestra: ORS convierte el par de lugares en geometrías; OSM aporta la
evidencia usada para analizar esas geometrías.

### 3. Comparación explicable

- Recorrer las alternativas ordenadas.
- Leer adecuación, confianza, información desconocida, razones y avisos.
- Recordar que «primera» significa mayor ajuste al perfil, no seguridad absoluta.

Qué demuestra: clasificación multicriterio explicable y separación entre
preferencia y calidad de los datos.

### 4. Navegación accesible

- Elegir una ruta.
- Recorrer una instrucción completa con TalkBack.
- Mostrar la referencia de calle y la evidencia próxima, si existe.
- Avanzar y retroceder con controles manuales.

Qué demuestra: la navegación no depende del mapa, la voz propia ni el GPS.

### 5. GPS y recálculo confirmado

- Activar el seguimiento en primer plano.
- Usar los controles de ubicación del emulador para enviar varias posiciones
  fiables alejadas de la geometría activa durante al menos diez segundos.
- Rechazar una vez la propuesta y comprobar que se conserva la ruta.
- Repetir con posiciones definidas respecto a la geometría vigente, aceptar y
  comprobar que se vuelve a enriquecer, filtrar y puntuar.

Qué demuestra: una muestra ruidosa no basta y la ruta solo cambia tras una
decisión explícita y una respuesta válida.

### 6. Aprendizaje opcional

- Volver a la comparación y activar el aprendizaje.
- Elegir entre alternativas válidas.
- Mostrar el contador, la fase de observación y los pesos declarados y efectivos.
- Explicar que el estado se guarda localmente y no contiene coordenadas.

Qué demuestra: el ciclo de retroalimentación está integrado, es reversible y
no sustituye las restricciones.

## Respaldo si ORS no está disponible

Cambiar únicamente estas dos variables del `.env` y reiniciar FastAPI:

```text
ROUTING_PROVIDER=fixture
PLACE_SEARCH_PROVIDER=catalog
```

El respaldo permite demostrar perfiles, ranking, explicaciones, navegación,
errores y aprendizaje sin red. Debe presentarse honestamente como datos
sintéticos para desarrollo; no demuestra la integración real con ORS y OSM.

## Pruebas de fallo que aportan valor a la defensa

### Backend detenido

1. Detener FastAPI con `Ctrl+C`.
2. Solicitar una comparación.
3. Comprobar que la app explica el fallo y ofrece reintento.
4. Reiniciar FastAPI y reintentar.

### Recálculo fallido

1. Mantener una ruta activa.
2. Detener FastAPI antes de aceptar el recálculo.
3. Confirmar que la ruta y la instrucción anteriores permanecen disponibles.

### Permiso de ubicación denegado

1. Denegar el permiso al activar GPS.
2. Confirmar que las instrucciones y controles manuales siguen utilizables.

Estas pruebas son más informativas que una pantalla sin errores porque muestran
la degradación segura del sistema.

## TalkBack

Para abrir sus ajustes desde una terminal:

```bash
adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS
```

La activación se realiza desde la interfaz de Android. Durante la demostración
conviene comprobar título, párrafos, métricas, avisos, diálogo de desviación y
botones. TalkBack y la voz propia de la app no deben hablar simultáneamente.

## Recuperación de incidencias frecuentes

### Puerto 8000 ocupado

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
```

Cerrar primero la terminal que mantiene ese proceso. No iniciar un segundo
servidor sobre el mismo puerto.

### `adb` no aparece

Abrir una terminal nueva después de configurar `ANDROID_HOME`, o ejecutar el
binario desde el directorio `platform-tools` del SDK. La configuración completa
se conserva en [Entorno de desarrollo](entorno-desarrollo.md).

### Expo pierde la conexión

Mantener Metro activo, comprobar que el emulador sigue conectado y pulsar
recargar. Detener FastAPI no detiene Metro; son procesos independientes.

## Privacidad durante la demostración

- No proyectar el contenido de `.env`.
- No copiar trazas que incluyan credenciales.
- No usar direcciones personales.
- No afirmar que se guardan recorridos: el GPS se procesa en memoria y el
  aprendizaje conserva solo vectores de costes e identificadores opacos.

## Resultado esperado

La demostración debe permitir diferenciar claramente:

1. ORS genera candidatas.
2. OSM aporta evidencia de accesibilidad.
3. Las reglas eliminan incompatibilidades.
4. El ranking ordena las alternativas válidas.
5. La persona conserva la decisión y el control del recálculo.
6. El aprendizaje opcional intenta ajustar preferencias, pero no promete
   mejorar siempre y permanece sometido a evaluación.

## Trabajo pendiente

- [ ] Ensayar el guion sobre una compilación nativa de desarrollo.
- [ ] Sustituir la simulación GPS por un recorrido físico controlado.
- [ ] Adaptar duración y lenguaje después de una prueba con participantes.

## Referencias y evidencias

- [Cierre y criterios de aceptación](../evaluation/cierre-mvp.md).
- [GPS y recálculo](../product/gps-rerouting.md).
- [Aprendizaje en la aplicación](../research/integracion-aprendizaje-adaptativo-app.md).
- [Entorno reproducible](entorno-desarrollo.md).

