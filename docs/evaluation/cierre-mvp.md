# Cierre y criterios de aceptación del MVP

Estado: `Validado`  
Última actualización: 18 de agosto de 2026  
Responsabilidad principal: `evaluation`

## Problema que resuelve

Una aplicación puede ejecutar una demostración y, aun así, no haber satisfecho
todos sus requisitos. Este cierre transforma los criterios definidos al inicio
del proyecto en una matriz verificable. También evita mezclar cuatro tipos de
evidencia que tienen distinta fuerza: una prueba automática, una comprobación
manual en emulador, un resultado parcial y una tarea todavía pendiente.

## Requisitos

- Revisar todos los criterios publicados en el alcance del MVP.
- Asociar cada afirmación con una evidencia reproducible o manual concreta.
- No presentar una simulación como una prueba con participantes.
- No presentar Expo Go como una compilación de desarrollo propia.
- Mantener separados funcionamiento técnico, accesibilidad de la interfaz y
  eficacia del aprendizaje.

## Niveles de evidencia

| Estado | Significado |
| --- | --- |
| **Automático** | Existe una prueba repetible o una comprobación estática que falla si se rompe el comportamiento. |
| **Manual** | El flujo se recorrió en Android Emulator y se registró el resultado. |
| **Parcial** | Hay evidencia válida, pero no cubre toda la población, el entorno o la afirmación original. |
| **Pendiente** | No existe todavía evidencia suficiente y no se considera completado. |

Los estados no forman una escala en la que «manual» sea peor que «automático».
TalkBack, por ejemplo, necesita una comprobación auditiva y de foco que una
prueba unitaria no sustituye. La evidencia más sólida combina ambas cuando es
posible.

## IA y seguridad

| Criterio | Estado | Evidencia y alcance real |
| --- | --- | --- |
| Un dato desconocido nunca mejora una ruta | Automático | Las pruebas de costes y puntuación tratan lo desconocido como coste o reducción de confianza, nunca como beneficio. |
| Una restricción crítica elimina la alternativa | Automático | Las restricciones se aplican antes de la puntuación fija o adaptativa. |
| El aprendizaje no modifica restricciones críticas | Automático | Las pruebas vuelven a clasificar con pesos adaptados y comprueban que una ruta incompatible continúa descartada. |
| Los pesos son no negativos y suman uno | Automático | Se prueba la proyección tras cientos de elecciones y la paridad entre Python y TypeScript. |
| Una elección no provoca un cambio brusco | Automático | Las tres primeras elecciones son de observación y cada actualización del vector aprendido está acotada. |
| El modelo recupera preferencias conocidas | Parcial | `EXP-002` lo demuestra con preferencias sintéticas. No demuestra aprendizaje de preferencias humanas. |
| Las explicaciones corresponden al cálculo | Automático y manual | Las razones proceden de los mismos costes del ranking y se recorrieron con TalkBack. Falta un estudio de comprensión con participantes. |
| Reiniciar restaura el perfil declarado | Automático y manual | Se prueba la transición y se comprobó en el emulador después de persistir elecciones. |

## GPS y recálculo

| Criterio | Estado | Evidencia y alcance real |
| --- | --- | --- |
| Una muestra aislada o imprecisa no genera una alerta | Automático | El detector descarta precisión insuficiente y exige persistencia temporal. |
| Tres muestras fiables durante al menos diez segundos solicitan confirmación | Automático y manual | Se validó con secuencias simuladas y con los controles de ubicación del emulador. |
| Rechazar conserva la ruta | Automático y manual | No cambia ni la geometría ni la instrucción activa. |
| Un fallo de ORS conserva la navegación | Automático y manual | La ruta anterior sigue visible y puede reintentarse la operación. |
| La nueva ruta conserva perfil y restricciones | Automático | El endpoint de recálculo reutiliza el mismo proceso de enriquecimiento, filtrado y puntuación. |
| El GPS se detiene al abandonar la navegación | Automático | La suscripción se elimina al desmontar la pantalla. |
| La denegación del permiso mantiene controles manuales | Automático y manual | La navegación paso a paso sigue disponible sin seguimiento GPS. |

## Accesibilidad

| Criterio | Estado | Evidencia y alcance real |
| --- | --- | --- |
| Controles con etiqueta, rol y estado | Automático y manual | Las pruebas cubren los controles principales y TalkBack recorrió los flujos completos. No sustituye una auditoría externa exhaustiva. |
| Carga, error y recálculo se anuncian | Automático y manual | Se verificaron regiones dinámicas y diálogos accesibles. |
| La información no depende solo del color o de un mapa | Automático y manual | Índice, confianza, incertidumbre, avisos e instrucciones tienen equivalente textual. |
| Objetivos táctiles de al menos 44 × 44 puntos | Parcial | Es una regla de diseño aplicada a los controles propios; falta una medición sistemática sobre todos los tamaños y escalas de fuente. |
| Orden de foco lógico | Manual | Se recorrieron perfil, comparación, navegación, diálogo de desviación y aprendizaje con TalkBack. |
| Uso sin voz propia ni GPS | Automático y manual | TalkBack y los controles manuales permiten completar el flujo sin TTS propio ni ubicación. |

## Criterios finales

| Criterio original | Estado | Conclusión |
| --- | --- | --- |
| Python 3.9 | Automático | El script de cierre verifica la versión y la integración continua usa Python 3.9. |
| Compilación de desarrollo Android | Pendiente | El prototipo se validó con Expo Go y se genera un paquete JavaScript Android reproducible. No se ha generado ni probado una compilación nativa de desarrollo propia. |
| Persistencia del perfil y los pesos | Automático y manual | El estado local sobrevive al cierre y se puede reiniciar. No existe una base remota. |
| Comparación de rutas reales en el área piloto | Automático y manual | ORS y OSM se probaron en Moncloa–Argüelles–Príncipe Pío. Depende de disponibilidad externa en una demostración en vivo. |
| GPS solo en primer plano | Automático y manual | Implementado sin ubicación en segundo plano. |
| Detección conservadora de desviaciones | Automático y manual | No reacciona a una única muestra ruidosa. |
| Recálculo solo después de confirmar | Automático y manual | Aceptar y rechazar producen estados distintos y seguros. |
| Adecuación, confianza, incertidumbre y razones | Automático y manual | Se muestran por alternativa y no se convierten en una garantía absoluta. |
| Flujo principal compatible con TalkBack | Manual | Validado en Pixel 9 virtual; falta evaluación con personas ciegas o con baja visión. |
| Valor añadido del ranking adaptativo | Parcial | Es positivo en el banco sintético y negativo en el banco real reducido. La aportación demostrada es el algoritmo acotado y el análisis de cuándo existe señal suficiente, no una mejora universal. |
| Separación entre IA y tecnologías auxiliares | Documental | La memoria distingue aprendizaje y ranking de ORS, OSM, GPS, recálculo, TalkBack y TTS. |

## Verificación automática reproducible

Desde la raíz del repositorio:

```bash
bash scripts/verificar-mvp.sh
```

El comando comprueba Python 3.9, Ruff, todas las pruebas del backend, Jest,
ESLint, TypeScript y la exportación del paquete Android. La salida generada se
guarda bajo `app/.evaluation-build/`, que está ignorado por Git. No prueba ORS,
GPS ni TalkBack porque esas verificaciones necesitan, respectivamente, una
credencial y red, un emulador y una interacción auditiva.

## Decisión de cierre

El núcleo funcional y experimental del MVP queda cerrado. No se añadirá una
funcionalidad grande antes de la defensa. Las dos carencias que deben
presentarse de forma explícita son la compilación nativa de desarrollo y la
evaluación con participantes. Ninguna invalida las pruebas del algoritmo ni la
demostración en Expo Go, pero ambas limitan lo que se puede afirmar sobre
distribución y uso real.

## Riesgos y limitaciones

- ORS puede fallar durante una demostración; se conserva un proveedor sintético
  reproducible como respaldo.
- El emulador no reproduce todas las condiciones de GPS, ruido urbano, batería
  o rendimiento de un teléfono físico.
- Una revisión con TalkBack por la desarrolladora no equivale a una evaluación
  de usabilidad con la población objetivo.
- Los resultados adaptativos con rutas reales proceden de un banco pequeño y
  no justifican activar el aprendizaje por defecto.

## Texto base para la memoria

El cierre del MVP se realizó mediante una matriz de trazabilidad que separa
pruebas automáticas, validaciones manuales, resultados parciales y tareas
pendientes. El prototipo superó las pruebas de dominio, seguridad, API,
persistencia y presentación, y los flujos de comparación, navegación y
recálculo se recorrieron con TalkBack en Android Emulator. La exportación
Android es reproducible, aunque no se generó una compilación nativa de
desarrollo. La evaluación adaptativa fue positiva en simulación y negativa en
un banco real reducido, por lo que el resultado se interpreta como evidencia
de un mecanismo explicable y acotado, no como una mejora universal ni como una
validación con usuarios.

## Trabajo pendiente

- [ ] Generar y probar una compilación nativa de desarrollo antes de distribuir
  la aplicación fuera del entorno de Expo Go.
- [ ] Ejecutar un recorrido físico controlado.
- [ ] Realizar una auditoría y un estudio con personas ciegas o con baja visión.
- [ ] Replicar la evaluación adaptativa con elecciones longitudinales reales.

## Referencias y evidencias

- [Alcance y criterios originales](../product/alcance-mvp.md).
- [Resultados cuantitativos](resultados.md).
- [Limitaciones](limitaciones.md).
- [Guía de demostración](../operations/guia-demostracion.md).
- `scripts/verificar-mvp.sh`.
- `.github/workflows/backend.yml` y `.github/workflows/mobile.yml`.

