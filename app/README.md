# App Android

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

Para comprobar que Metro puede construir el bundle Android sin arrancar un
emulador:

```bash
npx expo export --platform android --output-dir /tmp/tfm-expo-export
```

## Arranque

```bash
npm run start
```

La primera pantalla puede probarse inicialmente con Expo Go. GPS, reconocimiento
de voz y otras integraciones nativas se validarán después mediante una
development build.

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
