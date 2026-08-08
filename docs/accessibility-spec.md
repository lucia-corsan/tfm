# Especificación inicial de accesibilidad

## Principios

- No afirmar que una ruta es accesible de forma absoluta.
- Mostrar adecuación, confianza e incertidumbre por separado.
- Mantener al usuario como responsable de la elección final.
- No depender únicamente del mapa, el color, el GPS o la voz.
- Ofrecer siempre controles manuales y estados de error comprensibles.

## Interfaz

- Compatibilidad prioritaria con TalkBack.
- Rol, etiqueta y estado accesibles en cada control.
- `accessibilityHint` cuando aclare el resultado de una acción.
- Objetivos táctiles de al menos 44 por 44 puntos.
- Orden de foco lógico.
- Contraste mínimo WCAG 2.2 AA.
- Anuncios no intrusivos para carga, errores y rerouting.

## Datos

Cada atributo se clasificará como favorable, desfavorable o desconocido. Un
valor desconocido reducirá la confianza, aumentará la incertidumbre o producirá
un aviso; nunca sumará como evidencia positiva.

La cobertura de una fuente se registrará separadamente del estado observado.
Así se evita confundir «no se han encontrado escalones» con «se ha confirmado
que no hay escalones». Los porcentajes estarán acotados entre cero y uno y todo
atributo `unknown` deberá aparecer en el resumen de incertidumbre de la ruta.

El perfil separará:

- Restricciones críticas que pueden descartar una alternativa.
- Preferencias graduables que influyen en su orden.
- Máximo desvío aceptado respecto a la ruta más corta.

Los pesos graduables serán no negativos y deberán contener al menos una
preferencia activa. Se normalizarán al calcular el scoring; no sustituirán las
restricciones críticas.

La evidencia conservará por separado pasos de peatones, semáforos, ayudas
acústicas o vibratorias, pavimento podotáctil, bordillos, aceras, rampas,
escalones, superficie y pendiente. Los atributos relacionados de un mismo cruce
se agruparán en pocas preferencias comprensibles para evitar doble conteo y una
interfaz excesivamente compleja. El detalle seguirá disponible para avisos y
explicaciones accesibles.

## Navegación

La narración será determinista y compartirá una única fuente estructurada con
la interfaz y TTS. Con TalkBack activo se evitarán locuciones automáticas que
puedan solaparse con el lector de pantalla.
