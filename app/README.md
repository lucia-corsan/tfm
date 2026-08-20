# Aplicación Android

Aplicación React Native con Expo SDK 57 y TypeScript. Android es la plataforma
prioritaria y toda funcionalidad se diseña para poder utilizarse con TalkBack.

## Instalación

```bash
npm ci
```

## Comprobaciones

```bash
npm test
npm run lint
npm run typecheck
```

Para comprobar que Metro puede construir el paquete Android sin arrancar un
emulador:

```bash
npm run export:android
```

## Arranque

```bash
npm run start
```

El flujo actual se ha validado en Android Emulator mediante Expo Go, incluidos
GPS en primer plano, `expo-speech` y persistencia SQLite. También se exporta el
paquete JavaScript Android en la integración continua. Esto no equivale a haber
generado y probado una compilación nativa de desarrollo propia; ese empaquetado
permanece como tarea previa a una distribución fuera de Expo Go.

## Organización

```text
i18n/           # textos de interfaz en español
src/app/        # rutas y layouts de Expo Router
src/components/ # componentes visuales accesibles
src/screens/    # composición de pantallas
__tests__/      # pruebas de interacción
```

Los controles interactivos deben tener rol y etiqueta accesibles, una superficie
táctil mínima de 44 por 44 puntos y no depender únicamente del color.

## Aprendizaje adaptativo local

La personalización adaptativa está desactivada inicialmente. En la pantalla de
comparación puede activarse, pausarse y reiniciarse por perfil. Su estado se
guarda con `expo-sqlite/kv-store`; el backend no almacena elecciones ni perfiles.

Para inspeccionar la base durante el desarrollo, mantener Metro abierto, pulsar
`Shift+M` en su terminal y elegir el complemento de `expo-sqlite`. Esta
herramienta es de diagnóstico: no debe usarse para introducir o corregir a mano
el estado de una evaluación.

La comprobación manual mínima consiste en activar el aprendizaje, elegir una
ruta entre al menos dos alternativas válidas, cerrar la app, volver a abrirla y
confirmar que el contador continúa. Después debe probarse «Reiniciar lo
aprendido» y comprobar que el contador vuelve a cero sin cambiar el perfil
declarado.
