export const ES = {
  appName: 'Rutas a tu medida',
  adaptivePreferences: {
    title: 'Personalización adaptativa',
    description:
      'Si la activas, la app observará qué ruta eliges entre las alternativas válidas y ajustará poco a poco la importancia de tus preferencias.',
    switchLabel: 'Aprender de mis elecciones',
    switchDescription:
      'Está desactivado al principio. Puedes pausarlo o borrar lo aprendido cuando quieras.',
    switchHint:
      'Activa o pausa el aprendizaje local a partir de elecciones explícitas de ruta.',
    loading: 'Cargando las preferencias guardadas en este dispositivo.',
    disabledStatus:
      'Aprendizaje desactivado. Tus elecciones no se registran ni cambian la recomendación.',
    observationStatus: (count: number, total: number) =>
      `Periodo inicial de observación: ${count} de ${total} elecciones. El orden todavía utiliza solo tus preferencias declaradas.`,
    activeStatus: (count: number, influence: number) =>
      `Personalización activa: ${count} elecciones observadas. Los pesos aprendidos aportan ahora un ${influence} % del cálculo gradual.`,
    privacy:
      'Se guarda localmente: costes de las alternativas, elección, pesos y día aproximado. No se guardan coordenadas, direcciones, audio ni trazas GPS.',
    recoveredState:
      'Se encontró un estado local incompatible o dañado y se restauraron las preferencias declaradas.',
    resetButton: 'Reiniciar lo aprendido',
    resetHint:
      'Solicita confirmación para borrar las elecciones y recuperar los pesos iniciales.',
    resetDialogTitle: '¿Reiniciar el aprendizaje?',
    resetDialogDescription:
      'Se borrarán las elecciones guardadas y los pesos aprendidos de este perfil. Tus preferencias declaradas no cambiarán.',
    cancelResetButton: 'Cancelar',
    confirmResetButton: 'Borrar lo aprendido',
    observationRecorded: (count: number, total: number) =>
      `Esta elección se ha guardado como observación ${count} de ${total}. Todavía no modifica el orden de las rutas.`,
    influentialChoice: (
      changes: { direction: 'more' | 'less'; label: string }[],
    ) =>
      `Esta elección ha actualizado la personalización. Ahora se da ${changes
        .map((change) =>
          change.direction === 'more'
            ? `más importancia a ${change.label}`
            : `menos importancia a ${change.label}`,
        )
        .join(' y ')}. Las restricciones críticas y los avisos no cambian.`,
    noEffectiveChange:
      'Esta elección se ha guardado, pero no ha producido un cambio apreciable en las preferencias efectivas.',
    singleRouteNotice:
      'Solo había una ruta válida. Puedes navegar con ella, pero no se ha usado como señal de aprendizaje porque no existía una alternativa comparable.',
    storageError:
      'No se ha podido acceder al aprendizaje local. La navegación sigue disponible y se mantienen las preferencias declaradas.',
  },
  routeComparison: {
    eyebrow: 'MVP · Madrid',
    title: 'Compara rutas para caminar según tus preferencias',
    description:
      'Elige dos lugares del área piloto y prueba cómo cambia la recomendación al modificar el perfil.',
    locationSectionTitle: 'Elige el origen y el destino',
    locationSectionDescription:
      'La búsqueda inicial se limita al entorno de Moncloa, Argüelles, Príncipe Pío y Plaza de España.',
    samePlaceError: 'El origen y el destino deben ser lugares distintos.',
    placeSearch: {
      selectedLabel: 'Lugar seleccionado',
      loading: 'Buscando direcciones y lugares del área piloto.',
      minimumCharacters: 'Escribe al menos dos caracteres para buscar.',
      noResults: 'No se han encontrado direcciones ni lugares dentro del área piloto.',
      error: 'No se ha podido completar la búsqueda. Inténtalo de nuevo.',
      origin: {
        label: 'Origen',
        inputLabel: 'Buscar lugar de origen',
        inputHint: 'Escribe al menos dos caracteres y activa Buscar origen.',
        searchButton: 'Buscar origen',
        searchHint: 'Consulta lugares coincidentes dentro del área piloto.',
        resultsTitle: 'Resultados para el origen',
        resultHint: 'Selecciona este lugar como origen.',
      },
      destination: {
        label: 'Destino',
        inputLabel: 'Buscar lugar de destino',
        inputHint: 'Escribe al menos dos caracteres y activa Buscar destino.',
        searchButton: 'Buscar destino',
        searchHint: 'Consulta lugares coincidentes dentro del área piloto.',
        resultsTitle: 'Resultados para el destino',
        resultHint: 'Selecciona este lugar como destino.',
      },
    },
    profileSectionTitle: 'Elige un perfil para esta comparación',
    profileGroupLabel: 'Perfiles de preferencias',
    profiles: {
      balanced_demo: {
        label: 'Preferencias equilibradas',
        description: 'Valora por igual distancia, cruces, orientación, pendiente e incertidumbre.',
        hint: 'Selecciona un perfil que mantiene la misma importancia inicial para todos los factores.',
      },
      simpler_crossings_demo: {
        label: 'Priorizar cruces sencillos',
        description: 'Da más importancia a reducir la complejidad de los cruces sin ignorar los demás datos.',
        hint: 'Selecciona un perfil que aumenta la importancia de evitar cruces complejos.',
      },
    },
    compareButton: 'Comparar rutas',
    compareHint: 'Solicita al servidor hasta tres alternativas para el perfil seleccionado.',
    loadingButton: 'Comparando rutas…',
    loading: 'Estamos comparando las alternativas. Espera un momento.',
    idleTitle: 'Comparación preparada',
    idleDescription:
      'Selecciona un perfil y pulsa Comparar rutas. El servidor indicará la procedencia de cada alternativa.',
    resultSummary: (accepted: number, rejected: number) =>
      `Comparación terminada. ${accepted} rutas disponibles y ${rejected} descartadas.`,
    resultTitle: 'Alternativas ordenadas',
    resultIntroduction:
      'La primera posición indica mayor adecuación al perfil, no una garantía absoluta de accesibilidad.',
    noAcceptedRoutesTitle: 'No hay rutas compatibles con este perfil',
    noAcceptedRoutesDescription:
      'Las alternativas encontradas incumplen al menos una restricción crítica. Revisa los motivos de descarte antes de cambiar tus preferencias.',
    rankLabel: (rank: number) => `Puesto ${rank}`,
    syntheticData: 'Datos sintéticos para desarrollo',
    realData: 'Ruta real enriquecida',
    realDataProvenance:
      'Recorrido generado por OpenRouteService y evaluado con evidencia de OpenStreetMap.',
    distance: 'Distancia',
    duration: 'Duración estimada',
    adequacy: 'Adecuación al perfil',
    confidence: 'Confianza de los datos',
    uncertainty: 'Información desconocida',
    reasonsTitle: 'Por qué ocupa esta posición',
    unknownEvidenceTitle: 'Información que falta por confirmar',
    unknownEvidenceIntroduction: (percentage: string, count: number) =>
      `${percentage} de información desconocida. ${count === 1 ? 'Este aspecto no tiene evidencia concluyente:' : `Estos ${count} aspectos no tienen evidencia concluyente:`}`,
    noUnknownEvidence:
      'No hay atributos clasificados como desconocidos con los datos disponibles.',
    unfavorableEvidenceTitle: 'Evidencia desfavorable encontrada',
    noUnfavorableEvidence:
      'No se ha encontrado evidencia desfavorable con los datos disponibles.',
    chooseRouteButton: 'Elegir esta ruta',
    choosingRouteButton: 'Guardando la elección…',
    chooseRouteHint: (routeName: string) =>
      `Abre la navegación manual de ${routeName}.`,
    rejectedTitle: 'Alternativas descartadas',
    rejectedDescription:
      'Estas rutas incumplen una restricción crítica del perfil y no participan en el ranking.',
    disclaimer:
      'La aplicación compara evidencia disponible. La decisión final sobre el recorrido permanece en tus manos.',
    retryButton: 'Reintentar comparación',
    retryHint: 'Vuelve a solicitar las rutas con el mismo perfil.',
    errorTitle: 'No hemos podido comparar las rutas',
    errors: {
      invalid_request: 'El perfil o el trayecto enviado no es válido.',
      route_scenario_not_found: 'Todavía no hay rutas de prueba para este trayecto.',
      routing_provider_unavailable: 'El servicio de rutas no está disponible ahora mismo.',
      place_search_unavailable: 'El servicio de búsqueda de direcciones no está disponible ahora mismo.',
      invalid_response: 'El servidor ha devuelto datos que la aplicación no puede interpretar.',
      network_error: 'No se ha podido conectar con el servidor. Comprueba que el backend esté encendido.',
    },
    dimensions: {
      distance: 'distancia',
      complex_crossings: 'complejidad de los cruces',
      crossing_support: 'ayudas disponibles en los cruces',
      sidewalk_evidence: 'evidencia sobre las aceras',
      steps: 'presencia de escalones',
      surface: 'información sobre la superficie',
      orientation_complexity: 'complejidad para orientarse',
      slope: 'pendiente',
      uncertainty: 'cantidad de información desconocida',
    },
    reasonKinds: {
      relative_advantage: 'Ventaja respecto a las demás alternativas',
      low_absolute_cost: 'Condición favorable según la escala utilizada',
      least_costly_active_factor: 'Factor más favorable de esta alternativa',
    },
    attributes: {
      sidewalk: 'aceras',
      step_free: 'ausencia de escalones',
      pedestrian_access: 'acceso peatonal',
      crossing_compatibility: 'compatibilidad de los cruces',
      traffic_signals: 'semáforos',
      audible_signals: 'señales acústicas',
      tactile_paving: 'pavimento podotáctil',
      kerb: 'bordillos',
      ramp_access: 'rampas',
      surface: 'superficie',
      slope: 'pendiente',
    },
    warningStates: {
      unknown: 'Información no confirmada',
      unfavorable: 'Evidencia desfavorable',
    },
    constraints: {
      steps: 'Se han confirmado escalones y el perfil indica evitarlos.',
      pedestrian_access: 'No se ha confirmado un acceso peatonal compatible.',
      incompatible_crossings: 'Se han detectado cruces incompatibles con el perfil.',
      maximum_slope: 'La pendiente confirmada supera el máximo aceptado.',
      maximum_detour: 'El desvío supera el máximo aceptado.',
    },
  },
  navigation: {
    eyebrow: 'Navegación en primer plano',
    title: 'Sigue las instrucciones de la ruta',
    routeLabel: (routeName: string) => `Ruta elegida: ${routeName}.`,
    manualMode:
      'Los controles manuales permanecen disponibles aunque el GPS esté activo o no pueda utilizarse.',
    gpsTitle: 'Seguimiento de la ruta mediante GPS',
    activateGpsButton: 'Activar GPS durante la navegación',
    activateGpsHint:
      'Solicita permiso para usar tu ubicación solo mientras esta pantalla permanezca abierta.',
    gpsStatus: {
      gps_inactive:
        'El GPS está desactivado. Puedes navegar manualmente o activarlo para seguir tu posición durante esta navegación.',
      requesting_permission:
        'Solicitando permiso para utilizar la ubicación mientras esta pantalla está abierta.',
      waiting_for_location:
        'GPS activado. Esperando una primera medición de ubicación.',
      permission_denied:
        'No se ha concedido el permiso de ubicación. Puedes continuar con los controles manuales.',
      location_unavailable:
        'No se ha podido activar el GPS. Puedes continuar con los controles manuales.',
      poor_accuracy:
        'La medición GPS es demasiado imprecisa y no se utilizará para avanzar ni detectar una desviación.',
      on_route:
        'GPS activo. La posición estimada se encuentra próxima al recorrido.',
      possible_deviation:
        'La posición parece alejarse del recorrido. La aplicación seguirá comprobándolo antes de mostrar una alerta.',
      confirmation_required:
        'Varias mediciones indican una posible desviación. Continúa con los controles disponibles hasta confirmar un nuevo recorrido.',
      reroute_in_progress:
        'Se están calculando nuevas alternativas. La ruta anterior continúa disponible.',
      reroute_cooldown:
        'La ruta se ha actualizado. Durante un minuto no se mostrarán nuevas alertas de desviación.',
    },
    rerouteDialogTitle: 'Posible desviación de la ruta',
    rerouteDialogDescription:
      'Varias mediciones fiables indican que te has separado del recorrido. ¿Quieres calcular nuevas alternativas desde tu posición actual? La ubicación solo se enviará si lo confirmas.',
    keepRouteButton: 'Mantener la ruta actual',
    keepRouteHint:
      'Cierra este aviso y conserva las instrucciones actuales sin enviar tu posición.',
    confirmRerouteButton: 'Calcular una nueva ruta',
    confirmRerouteHint:
      'Confirma el envío de la posición actual al backend para volver a calcular las alternativas.',
    reroutingLoading: 'Calculando nuevas alternativas accesibles.',
    reroutingSuccess:
      'Ruta actualizada. Se han aplicado de nuevo tu perfil, las restricciones y la información disponible.',
    reroutingErrorTitle: 'No se ha podido actualizar la ruta',
    reroutingErrors: {
      invalid_request:
        'La posición o el perfil no tienen un formato válido. Puedes mantener la ruta actual.',
      route_scenario_not_found:
        'No se han encontrado rutas para esta posición dentro del área disponible.',
      routing_provider_unavailable:
        'El servicio de rutas no está disponible ahora. La ruta anterior se mantiene.',
      place_search_unavailable:
        'El servicio no está disponible ahora. La ruta anterior se mantiene.',
      invalid_response:
        'El servidor ha devuelto una respuesta que no se puede utilizar con seguridad.',
      network_error:
        'No se ha podido conectar con el servidor. La ruta anterior se mantiene.',
      no_valid_routes:
        'Las nuevas alternativas no cumplen las restricciones del perfil. La ruta anterior se mantiene.',
    },
    retryRerouteButton: 'Reintentar el recálculo',
    retryRerouteHint:
      'Vuelve a solicitar alternativas desde la última posición fiable.',
    progress: (current: number, total: number) =>
      `Instrucción ${current} de ${total}`,
    currentInstructionTitle: 'Instrucción actual',
    streetLabel: (streetName: string) => `Referencia: ${streetName}.`,
    stepDistance: 'Distancia de este tramo',
    stepDuration: 'Duración estimada del tramo',
    instructionAccessibilityTitle: 'Información de accesibilidad en este tramo',
    noInstructionAccessibilityEvents:
      'No hay información puntual de OpenStreetMap asociada a esta instrucción.',
    speech: {
      title: 'Voz de las instrucciones',
      talkBackTitle: 'Indicaciones mediante TalkBack',
      status: {
        checking:
          'Comprobando si hay un lector de pantalla activo antes de habilitar la voz de la aplicación.',
        disabled:
          'Puedes escuchar la instrucción actual o activar su reproducción al cambiar de paso.',
        enabled:
          'Las instrucciones se leerán mediante TalkBack. La voz adicional de la aplicación permanece desactivada para evitar dos locuciones simultáneas. Su velocidad se configura en los ajustes de Android.',
      },
      rateTitle: 'Velocidad de la voz de la aplicación',
      rateDescription:
        'Elige la velocidad que te resulte más comprensible. Este ajuste no modifica la velocidad de TalkBack.',
      rateGroupLabel: 'Opciones de velocidad de la voz',
      rateLabels: {
        slow: 'Lenta, 0,8',
        normal: 'Normal, 1,0',
        fast: 'Rápida, 1,25',
        very_fast: 'Muy rápida, 1,5',
      },
      rateHint: (rateId: 'slow' | 'normal' | 'fast' | 'very_fast') =>
        `Selecciona la velocidad ${
          {
            slow: 'lenta',
            normal: 'normal',
            fast: 'rápida',
            very_fast: 'muy rápida',
          }[rateId]
        } para la voz de las instrucciones.`,
      automaticTitle: 'Indicaciones de navegación por voz',
      automaticDescription:
        'Está desactivado al inicio. Si lo activas, la app leerá automáticamente cada nuevo paso mientras TalkBack no esté activo.',
      automaticHint:
        'Activa o desactiva las indicaciones automáticas de navegación por voz.',
      listenButton: 'Escuchar instrucción',
      listenHint:
        'Reproduce la instrucción actual con la voz y la velocidad seleccionadas.',
      stopButton: 'Detener voz',
      stopHint: 'Interrumpe inmediatamente la locución de la aplicación.',
      error:
        'No se ha podido reproducir la instrucción. Puedes seguir leyéndola en pantalla o con TalkBack.',
      persistenceNotice:
        'Durante este MVP, la velocidad se conserva en esta navegación. Se guardará entre sesiones junto con el perfil local, sin enviarla al servidor.',
    },
    accessibilityEventDistance: (distance: string) =>
      `Aproximadamente a ${distance} desde el inicio de este tramo.`,
    accessibilitySource: 'Fuente: OpenStreetMap.',
    evidenceStates: {
      favorable: 'Información favorable declarada',
      unfavorable: 'Aviso declarado',
      unknown: 'Información no confirmada',
    },
    previousButton: 'Instrucción anterior',
    previousHint: 'Vuelve a la instrucción anterior de esta ruta.',
    nextButton: 'Siguiente instrucción',
    nextHint: 'Avanza a la siguiente instrucción de esta ruta.',
    finishButton: 'Terminar navegación',
    finishHint: 'Cierra la navegación y vuelve a la comparación de rutas.',
    routeContextTitle: 'Información que debes conservar durante el recorrido',
    unknownSummary: (count: number) =>
      `${count === 1 ? 'Hay un aspecto' : `Hay ${count} aspectos`} sin información concluyente en esta ruta.`,
    unfavorableSummary: (count: number) =>
      `${count === 1 ? 'Hay un aviso' : `Hay ${count} avisos`} de evidencia desfavorable en esta ruta.`,
    noWarnings:
      'No hay avisos desconocidos o desfavorables con los datos disponibles.',
    disclaimer:
      'Las instrucciones describen el recorrido, pero no garantizan que sea completamente accesible.',
  },
} as const;
