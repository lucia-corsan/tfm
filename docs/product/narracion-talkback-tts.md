# Narración determinista, TalkBack y TTS

Estado: `Vigente`  
Última actualización: 8 de agosto de 2026  
Responsabilidad principal: `product`

## Problema que resuelve

Comunicar instrucciones y avisos sin depender del mapa visual ni generar
mensajes incompatibles entre pantalla, lector de pantalla y voz automática.

## Requisitos

- Instrucciones deterministas en español.
- Una fuente estructurada común para pantalla y TTS.
- Avisos críticos e incertidumbre no omitibles.
- Controles manuales para avanzar y retroceder.
- Evitar solapamiento entre TalkBack y locuciones automáticas.

## Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
| --- | --- | --- | --- |
| Texto libre con LLM | Variación lingüística | Riesgo de omisión o invención | Descartada para el MVP |
| Plantillas deterministas | Reproducibles y fáciles de probar | Menor variedad | Adoptada |

## Decisión adoptada

El backend generará objetos de instrucción validados. La aplicación mostrará el mismo
contenido y decidirá cuándo enviarlo a TTS. TalkBack leerá las etiquetas y
estados accesibles de la interfaz; si está activo, se reducirán anuncios
automáticos que puedan interferir.

## Justificación

Las plantillas permiten demostrar fidelidad entre datos, explicación y salida
oral. TTS transforma texto en voz y TalkBack lee la interfaz; ninguno modifica
las reglas de seguridad ni la clasificación.

## Datos de entrada y salida

Entrada: maniobra, distancia, referencia de vía y avisos validados. Salida:
texto visible, etiqueta accesible y frase apta para TTS.

## Implementación

La compatibilidad inicial de la pantalla Expo con TalkBack está validada. El
módulo de narración y la coordinación con TTS están pendientes.

## Pruebas

- Orden de foco y lectura de controles.
- Avisos obligatorios con baja confianza.
- Fidelidad entre instrucción estructurada y texto narrado.
- Comportamiento con TalkBack activo y desactivado.

## Resultados

TalkBack lee correctamente la pantalla inicial del MVP en un Pixel 9 virtual con
Android 16. La navegación paso a paso (*turn-by-turn*) todavía no se ha implementado.

## Riesgos y limitaciones

- Dos canales de voz simultáneos pueden solaparse.
- Una plantilla necesita referencias espaciales comprensibles, no solo nombres
  de calles procedentes de ORS.

## Texto base para la memoria

Se eligió una narración determinista para asegurar que toda locución procede de
información previamente validada. TalkBack y TTS actúan como canales de acceso a
esa información, no como componentes de decisión ni como aportaciones propias
de inteligencia artificial.

## Trabajo pendiente

- [ ] Definir el modelo de instrucciones.
- [ ] Implementar plantillas españolas.
- [ ] Integrar TTS y política de solapamiento con TalkBack.
