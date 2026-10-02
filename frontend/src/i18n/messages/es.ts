import type { Messages } from './en';

export const es: Messages = {
  header: {
    tagline: 'Innovación AgTech · En colaboración con Syngenta',
    domain: 'greenbyte-ag.com',
    brandSubtitle: 'Agricultura inteligente',
    demoSignIn: 'Iniciar sesión demo',
    demoSignOut: 'Cerrar sesión',
    demoSignedInAs: '{user}',
  },
  nav: {
    innovation: 'Innovación',
    precision: 'Agricultura de precisión',
    sustainability: 'Sostenibilidad',
    news: 'Noticias',
    demoPlant: 'UC1 Pasco',
    demoPlantUx: 'Línea de tiempo del programa',
    demoPlantFlow: 'UC1 UI↔API',
    demoArchitecture: 'Arquitectura',
  },
  demoCommon: {
    labels: {
      step: 'Paso',
      of: 'de',
      back: 'Atrás',
      next: 'Siguiente',
      finish: 'Finalizar',
      restart: 'Reiniciar recorrido',
    },
    viewPlant: 'Ver recorrido UC1 — capacidad de planta',
    viewArchitecture: 'Ver diagramas de arquitectura',
  },
  demoArchitecture: {
    eyebrow: 'Hackathon Syngenta · Base técnica',
    title: 'Arquitectura del demo',
    subtitle:
      'El demo que corre es UC1. React solo llama al BFF. El BFF lee y escribe PostgreSQL. El agente narra el plan que ya armaron las reglas.',
    docNote: 'Documento v1.3 · Sin conexión a sistemas productivos Syngenta.',
    useCasesTitle: 'Briefs de Syngenta',
    genAiRoleLabel: 'Rol GenAI',
    useCaseCards: [
      {
        id: 'UC1',
        name: 'Capacidad de planta (Pasco)',
        problem:
          'Las líneas de acondicionamiento compiten por lotes; pedidos urgentes y fallos de QA obligan a replanear a mano sin explicación clara.',
        genAiRole:
          'PostgreSQL reordena la línea y escribe una razón en cada posición. El agente solo narra ese plan. Una persona acepta. No se escribe en SAP.',
      },
    ],
    fieldLabels: {
      syngentaGoal: 'Criterios de éxito Syngenta (demo)',
      data: 'Datos hackathon (repo)',
      demoRoute: 'Recorrido GreenByte',
    },
    groups: {
      shared: {
        title: 'Lo que corre este demo',
        intro:
          'Un solo camino. El navegador no llama a la base ni al agente. El Data API de Camilo y el Agent API de David son servicios aparte. Mientras sus URLs base estén vacías, el BFF ejecuta el SQL y una plantilla de texto.',
      },
      uc1: {
        title: 'UC1 — Capacidad de planta',
        intro:
          'Un operador publica un cambio SAP, una orden nueva de COISPI o un Fail. PostgreSQL reordena la línea. El agente explica ese diff. El programador acepta. Accept no escribe en SAP.',
        syngentaGoal: 'Las reglas proponen el orden y la razón. Una persona valida. Sin conexión SAP en vivo.',
        dataSource:
          'Excel de acondicionamiento Pasco LSV/SSV (programas, órdenes SAP, logs de acondicionamiento, pass/fail), cargado en PostgreSQL.',
      },
    },
    teamTitle: 'Responsabilidades del equipo',
    teamIntro:
      'Tres responsables. El camino que corre es el BFF más PostgreSQL. Camilo y David se conectan cuando sus URLs base están definidas en core-api.',
    teamTable: {
      role: 'Rol',
      owner: 'Responsable',
      responsibility: 'Alcance',
      useCases: 'Qué cubre aquí',
    },
    teamRows: [
      {
        role: 'UI + BFF',
        owner: 'Mauricio / GreenByte',
        responsibility: 'Un contrato para el navegador. El BFF llama a PostgreSQL y, después de un replan, al agente.',
        useCases:
          'GET /demo/plant/lines/{lineId}/queue · POST ingest (prioridad, refresh COISPI, pass/fail) · POST /schedule/accept · POST /batches/explain',
      },
      {
        role: 'Datos en PostgreSQL',
        owner: 'Camilo',
        responsibility:
          'ETL, esquema y calidad de datos. Su Data API HTTP es el contrato cuando DATA_API_BASE_URL tiene valor. Este demo no lo llama mientras esa URL está vacía.',
        useCases: 'gold.replan escribe el orden. gold.accept_plan registra la decisión humana. No es una ruta del navegador.',
      },
      {
        role: 'Agent API',
        owner: 'David',
        responsibility:
          'Narra el plan. No reordena la línea y no lee la base. El BFF le envía el diff y queueSnapshot.',
        useCases:
          'POST /explain-replan · POST /batches/explain. Una plantilla dentro del BFF hasta que AGENT_API_BASE_URL tenga valor.',
      },
    ],
    endpointsTitle: 'Contratos UC1',
    endpointTable: {
      layer: 'Capa',
      examples: 'Ejemplos',
      purpose: 'Propósito en este caso de uso',
    },
    uc1Endpoints: [
      {
        layer: 'BFF',
        examples:
          'GET .../queue · POST .../ingest/* · POST .../schedule/accept · POST .../batches/explain',
        purpose: 'Ingest del operador, el poll de la cola, el visto bueno humano y la pregunta de ventas',
      },
      {
        layer: 'PostgreSQL',
        examples: 'gold.replan · gold.accept_plan · gold.v_open_queue',
        purpose: 'Las reglas escriben el orden y una razón por posición. Accept guarda la decisión. Sin escritura SAP.',
      },
      {
        layer: 'Agent API',
        examples: 'POST /explain-replan · POST /batches/explain',
        purpose: 'Resumen en lenguaje claro de un plan que las reglas ya calcularon. La pregunta de ventas es de solo lectura.',
      },
    ],
    rulesTitle: 'Cómo encajan las piezas',
    rules: [
      'El navegador solo llama a /demo/plant/*.',
      'El orden y las razones salen de gold.replan. El agente no rankea la línea.',
      'El agente recibe el diff y queueSnapshot. queueSnapshot es la cola del plan, con otro nombre. No debe inventar órdenes ni fechas.',
      'Si AGENT_API_BASE_URL está vacío, sigue la plantilla dentro del BFF. Si la llamada al agente falla, el plan se entrega igual.',
      'Accept registra la decisión humana. No escribe en SAP.',
    ],
    diagrams: {
      shared: `React  /demo/plant
        |
        |  solo este salto
        v
core-api  BFF
        |
        +-- PostgreSQL
        |     gold.replan        orden + razón por posición
        |     gold.accept_plan   visto bueno humano, sin escritura SAP
        |
        +-- Agente
              POST /explain-replan     diff + queueSnapshot
              POST /batches/explain    pregunta de ventas, solo lectura
              plantilla dentro del BFF mientras AGENT_API_BASE_URL está vacío`,
      uc1Flow: `Excel Pasco -- ETL --> PostgreSQL

Operador
  POST /demo/plant/ingest/sap-priority-change
  POST /demo/plant/ingest/sap-queue-refresh
  POST /demo/plant/ingest/pass-fail-log
        |
        v
core-api BFF -- gold.replan --> plan propuesto
        |
        +-- POST /explain-replan --> texto del copiloto
                    queueSnapshot = la cola del plan

React consulta GET /demo/plant/lines/{lineId}/queue
El programador POST /demo/plant/schedule/accept --> gold.accept_plan`,
      uc1Sequence: `Operador     React          BFF            PostgreSQL       Agente
   |           |              |                 |              |
   |-- ingest --------------->|                 |              |
   |           |              |-- gold.replan ->|              |
   |           |              |<- cola + diff --|              |
   |           |              |-- explain-replan ------------->|
   |           |              |<- resumen ---------------------|
   |           |-- GET cola -->|                 |              |
   |           |<- plan + por -|                 |              |
   |           |-- accept ---->|-- accept_plan ->|              |`,
    },
    sections: {
      container: {
        title: 'Camino en ejecución',
        description: 'El navegador se queda en el BFF. Las reglas viven en PostgreSQL. El agente solo recibe el plan.',
      },
      teamStack: {
        title: 'Stack del equipo',
        description: 'Está en la tabla de arriba.',
      },
      uc1Flow: {
        title: 'UC1 — Del ingest a la aceptación',
        description: 'La pantalla del programador no publica el evento SAP ni el de QA. Lo publica un ingest de operador. La pantalla consulta la cola.',
      },
      uc1Sequence: {
        title: 'UC1 — Orden de llamadas',
        description: 'El replan termina antes del explain. Accept no llama al agente.',
      },
    },
    monolithTitle: 'Qué está desplegado de verdad',
    monolithBody:
      'Este demo despliega la app React, core-api y PostgreSQL. El Data API y el Agent API son contratos. Siguen dentro del BFF hasta que Camilo y David publiquen sus URLs base.',
  },
  demoPlant: {
    eyebrow: 'Syngenta UC1 · Capacidad de planta',
    title: 'Planta de semillas Pasco — demo guiada',
    subtitle:
      'Recorre el disparador “demo-ready” de Syngenta: lote rush o fallo de calidad (QA) → replan → explicación en lenguaje claro y visto bueno humano. Pantallas de concepto y datos tipo Pasco.',
    plainLanguage: {
      sectionTitle: 'La idea, en palabras simples',
      problemHeading: '¿Qué problema resolvemos?',
      problem:
        'Después de la cosecha, la semilla pasa por máquinas en fila (limpieza, tamaño, etc.). Hay muchos lotes compitiendo. Si los ordenas mal, la planta parece llena pero los pedidos salen tarde. Hoy alguien reordena la lista a mano y con estrés.',
      analogyHeading: 'Piénsalo como…',
      analogy:
        'Un taller mecánico con seis trabajos en cola. Entra uno urgente: “necesito el carro hoy”. Reordenar tiene sentido, pero quieres saber por qué antes de dejar atrás a otro cliente — sobre todo si cambiar de tipo de trabajo cuesta una hora de preparación.',
      walkthroughHeading: 'Lo que verás en los seis pasos de abajo',
      walkthroughSteps: [
        'Elige Línea 1 o Línea 2. La lista es la cola abierta de esa línea: activas, no completas.',
        'Un trabajo con fecha límite y proxies de pedido cliente en POs clave.',
        'Cambio de prioridad SAP — un PO existente sube (ingest, no botón en UI).',
        'Un Fail en pass/fail pone un lote en HOLD y reordena la línea.',
        'Programación + copiloto muestran el nuevo orden y el porqué.',
        'El programador acepta el plan propuesto. Ese visto bueno queda guardado y no escribe en SAP.',
      ],
      tagline:
        'En una frase: «¿Qué va primero cuando llega un rush o falla un test — y por qué?»',
    },
    tourLivePreview: 'UI en vivo — mismos componentes que /demo/plant',
    tourLinePreviewNote:
      'Esta imagen sigue el snapshot del guion de la Línea 1. En /demo/plant, la Línea 2 carga la cola abierta de LSVLN2.',
    tourInjectNoteRush:
      'Imagen tras POST /demo/plant/ingest/sap-priority-change. La llamada en vivo guarda la prioridad o la fecha y arma un plan propuesto. La pantalla consulta GET cola ~cada 5 s.',
    tourInjectNoteQa:
      'Imagen tras POST /demo/plant/ingest/pass-fail-log — HOLD + replan. La llamada en vivo necesita un PO abierto (ejemplo 1002266350, Dent, Equipment ID Line 1).',
    tourSapRefreshHint:
      'Lote sorpresa: POST /demo/plant/ingest/sap-queue-refresh inserta un PO nuevo y replanifica esa línea — mapa: /demo/plant/flow?step=03c',
    steps: [
      {
        title: '1. La cola de siempre',
        plainLine:
          'El programador elige la línea. Solo entran las que tienen demo_line_id: Línea 1 (Line 1 Schedule) y Línea 2 (Line 2 Schedule).',
        body: 'GET /demo/plant/lines/{lineId}/queue lee gold.v_open_queue: órdenes activas y no completas de esa línea. Cada fila es un lote: cultivo, kilos y fin programado.',
        highlight: 'Mapa UI ↔ API: /demo/plant/flow?step=01',
      },
      {
        title: '2. Un pedido que no puede esperar mucho',
        plainLine: 'Hay un pedido con fecha cercana: si sigue cayendo en la lista, el agricultor puede quedarse sin semilla a tiempo.',
        body: 'La app marca los lotes con compromisos próximos. Aquí no hacemos magia numérica: solo detectamos quién está en riesgo.',
        highlight: 'Ejemplo: maíz dulce, 2026-07-06. Mapa: /demo/plant/flow?step=02',
      },
      {
        title: '3. Rush — prioridad en un PO existente',
        plainLine:
          'Un operador publica un cambio de prioridad o de fecha sobre un lote que ya está en la línea. La UI del programador no tiene botón rush.',
        body:
          'La llamada en vivo guarda ese cambio y arma un plan propuesto, con una razón por posición. El PO 1002307551 está en la Línea 2 (LSVLN2), por eso el ejemplo usa line-2. Esta imagen sigue el movimiento del guion de la Línea 1.',
        highlight: 'Mapa UI ↔ API: /demo/plant/flow?step=03 · PO nuevo en el refresh COISPI: sap-queue-refresh (paso 03c), que también replanifica.',
      },
      {
        title: '4. Fallo QA — log pass/fail',
        plainLine:
          'Una fila Fail sobre un lote que ya estaba en proceso — PO, línea (Equipment ID) y motivo (Dent, Discolored, …) — deja ese lote en hold y reordena la línea.',
        body:
          'La llamada en vivo guarda la prueba y arma un plan propuesto. La imagen sigue el guion de Dent. Usa un PO abierto en la línea elegida, por ejemplo 1002266350 en la Línea 1.',
        highlight: 'Mapa: /demo/plant/flow?step=03b',
      },
      {
        title: '5. Programación + copiloto',
        plainLine: 'Después de un recálculo, el planificador ve el orden propuesto, la razón de cada lote y el resumen simulado del copiloto.',
        body: 'GET /demo/plant/lines/{lineId}/queue devuelve ese plan propuesto mientras espera la aceptación. El navegador no llama al agente. El BFF arma el resumen a partir del plan.',
        highlight: '/demo/plant/flow?step=04 · Poll: paso=05',
      },
      {
        title: '6. Visto bueno',
        plainLine: 'Accept schedule registra el visto bueno humano sobre el plan propuesto — sin escritura SAP.',
        body: 'Accept registra la decisión humana. No escribe en SAP. El plan propuesto ya quedó guardado cuando corrió el ingest.',
        highlight: 'Arquitectura: /demo/architecture · curl operador: docs/hackathon/uc1-demo-operator-ingest.md',
      },
    ],
  },
  plantFlowGallery: {
    eyebrow: 'Mapa de integración UC1',
    title: 'Controles UI ↔ BFF ↔ JSON (componentes en vivo)',
    subtitle:
      'Izquierda: los mismos widgets que la pantalla de planta. Derecha: el contrato HTTP. Mientras un plan está PROPOSED, GET cola devuelve ese plan y el resumen del copiloto; si no, lee gold.v_open_queue. Estas imágenes usan el snapshot del guion para que rush y QA sigan una sola historia.',
    componentNote: 'Snapshot de la vista previa: plantDemoServer. /demo/plant en vivo: GET cola devuelve el plan propuesto mientras está PROPOSED; si no, gold.v_open_queue.',
    previewHeading: 'Vista previa UI',
    previewNote:
      'En /demo/plant el selector llama GET /demo/plant/lines/{lineId}/queue (line-1 o line-2). Mientras un plan está PROPOSED el BFF devuelve ese plan y el resumen del copiloto; si no, lee gold.v_open_queue.',
    stepNavLabel: 'Pasos del flujo',
    prev: 'Anterior',
    next: 'Siguiente',
    backendOwnersLabel: 'Responsables backend (hackathon)',
    backendOwners: {
      s01: 'Mauricio · BFF GET /demo/plant/lines/{lineId}/queue. Este ejemplo es la cola abierta en calma (gold.v_open_queue; lastEvent y pendingExplanation van en null). Mientras un plan está PROPOSED, el mismo GET devuelve ese orden, sus razones y el resumen del copiloto — ver paso 05.',
      s02: 'Igual que paso 01 — sin servicio extra; Camilo · Data API (campos de cola).',
      s03:
        'Mauricio · BFF POST /demo/plant/ingest/sap-priority-change llama gold.ingest_sap_priority_change: prioridad o fecha de un PO existente, y luego un plan propuesto.',
      s03c:
        'Mauricio · BFF POST /demo/plant/ingest/sap-queue-refresh inserta el PO nuevo en la línea y llama gold.replan (evento queue_refresh).',
      s03b:
        'Mauricio · BFF POST /demo/plant/ingest/pass-fail-log llama gold.ingest_pass_fail: fila Fail en silver.quality_test, y luego un plan propuesto con ese lote en hold.',
      s04: 'David · POST /explain-replan. El navegador no lo llama. El BFF envía este cuerpo después de cada ingest. Mientras AGENT_API_BASE_URL está vacío, una plantilla dentro del BFF escribe el texto. Define esa URL base (sin barra final) y vuelve a desplegar core-api para usar su servicio. Él devuelve solo alertBanner, summary, bullets e impact. El BFF lo guarda en explanation del ingest y en pendingExplanation del GET mientras el plan está PROPOSED.',
      s05: 'Mauricio · BFF GET /demo/plant/lines/{lineId}/queue mientras el plan está PROPOSED. La misma ruta que el paso 01. El ejemplo es el cuerpo del poll: lastEvent, pendingDiff, pendingExplanation — no el cuerpo del POST de ingest.',
      s06: 'Mauricio · BFF POST /demo/plant/schedule/accept llama gold.accept_plan: plan_decision ACCEPT y schedule_plan → ACCEPTED. Sin escritura SAP.',
      s07:
        'Mauricio · BFF POST /demo/plant/batches/explain. El panel muestra el cuerpo del navegador. El BFF llama a David POST /batches/explain con po, question, locale, lineId y planVersion. Él devuelve po, answer, citations y suggestedFollowUps. Sigue simulado dentro del BFF hasta que AGENT_API_BASE_URL tenga valor.',
    },
    triggers: {
      s01: 'Usuario abre /demo/plant y elige línea — plantDemoApi.getQueue(lineId).',
      s02: 'Misma respuesta GET — la UI usa finish, atRisk, reasonShort (sin segunda petición).',
      s03: 'Operador publica cambio de prioridad SAP — POST /demo/plant/ingest/sap-priority-change.',
      s03c: 'Operador publica un PO nuevo de COISPI — POST /demo/plant/ingest/sap-queue-refresh (inserta y replanifica).',
      s03b: 'Operador publica una fila Fail — POST /demo/plant/ingest/pass-fail-log (PO abierto, Equipment ID, failedFor).',
      s04: 'Llamada privada después de cada ingest. Este ejemplo es el plan rush del paso 03. queueSnapshot es la queue de esa respuesta, con otro nombre. Un PO nuevo de COISPI va como eventType rush y el PO en diff.added. Un Fail va como eventType qa_fail y el PO en diff.held.',
      s05: 'La pantalla consulta GET cola. Mientras está PROPOSED la respuesta trae el orden propuesto, pendingDiff y pendingExplanation.',
      s06: 'Clic Accept schedule — POST /demo/plant/schedule/accept.',
      s07: 'Ventas pregunta por un lote — POST /demo/plant/batches/explain.',
    },
    slideTitles: {
      s01: 'Tabla de cola — carga inicial',
      s02: 'Fecha programada y filas en riesgo',
      s03: 'Ingest prioridad SAP',
      s03c: 'Refresh cola SAP (PO sorpresa)',
      s03b: 'Ingest log pass/fail',
      s04: 'Copiloto IA — qué cambió',
      s05: 'Timeline / Gantt de programación',
      s06: 'Aceptar programación',
      s07: 'Explicar mi lote (ventas)',
    },
  },
  plantMvp: {
    eyebrow: 'Syngenta UC1 · Objetivo demo hackathon',
    title: 'Pasco acondicionamiento',
    subtitle:
      'Espacio del programador: la cola se actualiza cuando llegan datos upstream (prioridad SAP / log pass-fail). Revisa Programación y acepta — sin escritura ERP.',
    demoTargetBadge: 'Demo target B+ · Alineado al brief Syngenta + mockups wow GreenByte.',
    links: {
      tour: 'Historia guiada (6 pasos)',
      tourCta: 'Empezar por la historia en 6 pasos',
      architecture: 'Arquitectura de integración',
      flowSlides: 'Flujo UI ↔ API (mapa en vivo)',
      backMvp: 'Volver al demo Línea 1',
    },
    lineScheduleHeading: 'Programa de línea',
    lineSelectLabel: 'Línea de acondicionamiento',
    lineNames: {
      'line-1': 'Línea 1',
      'line-2': 'Línea 2',
    },
    lineLoadError: 'No se pudo cargar esta línea.',
    lineQueueHeading: 'Cola {line}',
    lineTitle: 'Cola Línea 1',
    lineSubtitle: 'Estado estable — los replanes aparecen cuando ingest/BFF recibe filas nuevas (poll ~5 s).',
    loading: 'Cargando cola…',
    status: { calm: 'Tranquilo y estable', eventActive: 'Evento activo — revisa plan propuesto' },
    statusLabels: { planned: 'PLANIFICADO', atRisk: 'EN RIESGO', complete: 'COMPLETO', hold: 'RETENIDO QA' },
    queueTitle: 'Orden de corrida (acondicionamiento)',
    table: {
      position: '#',
      po: 'PO',
      species: 'Especie',
      kg: 'Kg',
      finish: 'Fin programado',
      status: 'Estado',
      reason: 'Motivo (posición)',
    },
    scheduleShell: {
      brandLine: 'GreenByte',
      facilityLine: 'Pasco Acondicionamiento — Línea 1',
      dateRange: '29 Jun – 6 Jul 2026',
      clockLabel: '10:42 PDT',
      notificationsAria: 'Notificaciones',
      ganttTitle: 'Línea de tiempo del programa',
      ganttHint: 'De arriba a abajo es el orden de la cola. Cada barra está en la fecha de fin de ese lote.',
      batchCol: 'Lote / operación',
      species: 'Especie',
      client: 'Cliente',
      priority: 'Prioridad',
      urgent: 'URGENTE',
      zoom1h: '1H',
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      zoomHint: 'Escala de tiempo. Acercar llega a horas; alejar, a días o a una semana.',
      dayHeaders: ['LUN 29', 'MAR 30', 'MIÉ 1', 'JUE 2', 'VIE 3', 'SÁB 4', 'DOM 5'],
      hourTicks: ['00:00', '06:00', '12:00', '18:00', '00:00', '06:00', '00:00'],
      footerTotal: '{count} lotes · Tiempo total: {runtime}',
      demoRuntime: '5d 2h 45m',
      adjustManually: 'Ajustar manualmente',
      adjustHint: 'Arrastre un lote a otro lugar. El que ya está corriendo se queda primero. Los lotes en retención siguen ahí.',
      adjustDrag: 'Arrastrar para reordenar',
      adjustDone: 'Listo',
      adjustUp: 'Subir',
      adjustDown: 'Bajar',
      adjustRunning: 'En curso',
      thisOrder: 'Esta orden',
      selectRowHint: 'Seleccione una orden en la línea de tiempo y pregunte por ella aquí.',
      hideCopilot: 'Ocultar copiloto',
      showCopilot: 'Mostrar copiloto',
      layoutVertical: 'Vertical',
      layoutHorizontal: 'Horizontal',
      layoutApproval: 'Aprobación',
      approvalSubtitle: 'Vista simple para aprobar (no es el ERP)',
      holdArea: 'Área de retención',
      movedUpShort: 'Subió',
      legendMovedUp: 'Subió',
      legendHold: 'En retención',
      legendUnchanged: 'Sin cambio',
      layoutToggleAria: 'Disposición de la línea de tiempo',
      holdShort: 'En retención',
      movedUp: 'Subió · Venía de la posición {n}',
      movedDown: 'Bajó · Venía de la posición {n}',
      heldWas: 'En retención · Venía de la posición {n}',
      ganttScrollHint: 'Desplázate para ver todos los lotes en la línea de tiempo.',
      ganttScrollRegionVertical: 'Línea de tiempo del programa, vista vertical',
      ganttScrollRegionHorizontal: 'Línea de tiempo del programa, tira horizontal de tarjetas',
      expand: 'Ampliar línea de tiempo',
      closeExpanded: 'Cerrar línea de tiempo ampliada',
      queuePosition: 'Posición en la cola {n}',
    },
    pagination: {
      rowsPerPage: 'Filas por página',
      showing: 'Mostrando {from}–{to} de {total}',
      prev: 'Anterior',
      next: 'Siguiente',
      pageOf: 'Página {page} de {totalPages}',
    },
    baselineDashboard: {
      nav: {
        panel: 'Panel',
        queue: 'Cola',
        scheduling: 'Programación',
        copilot: 'Copiloto IA',
      },
      systemsOk: 'Todos los sistemas normales',
      lastUpdated: 'Última actualización: Justo ahora',
      pageTitle: 'Pasco Acondicionamiento — Línea 1',
      moodLine: 'Tranquilo · Estable · Listo',
      queueTitle: 'Cola Línea 1',
      orderCount: '{n} órdenes',
      queueSubtitle: 'Estado estable · ANTES de cualquier evento · Sin alertas activas',
      queueSubtitleEvent: 'Cola replanificada — revisa la línea de tiempo y el copiloto abajo',
      moodLineEvent: 'Evento activo · Plan propuesto en la línea de tiempo',
      summaryHeadlineEvent: 'Replanificado',
      summaryBulletsEvent: 'Revisa movimientos en la línea de tiempo · Aceptar solo registra (sin ERP)',
      sortFilter: 'Ordenar / Filtrar',
      colPo: 'Nº PO',
      colSpecies: 'Especie',
      actionsAria: 'Acciones de fila',
      finishFormat: '{date} · {time}',
      summaryTitle: 'Resumen de línea',
      summaryHeadline: 'Tranquilo y estable',
      summaryBullets: 'Sin eventos · Sin retrasos · Todos los sistemas normales',
      metricLoad: 'Carga de cola',
      metricNextFinish: 'Próximo fin',
      metricUtilization: 'Utilización de línea',
      copilotReady: 'Copiloto IA listo',
      sectionDashboard: 'Resumen de línea',
      sectionQueue: 'Cola Línea 1',
      sectionScheduling: 'Línea de tiempo',
      sectionCopilot: 'Copiloto IA — Qué cambió',
      eventBannerHint: 'Abre Programación en el menú para revisar el replan y aceptar.',
      navBadgeScheduling: 'Evento pendiente — revisar y aceptar',
      navBadgeQueue: 'Cola actualizada tras aceptar',
      notificationsBellAria: 'Notificaciones, {n} sin leer',
      notificationsEmpty: 'No hay notificaciones nuevas',
      notificationSchedulingTitle: 'Programación requiere revisión',
      notificationSchedulingBody: 'Replan por rush o QA pendiente de aceptar',
      notificationQueueTitle: 'Cola actualizada',
      notificationQueueBody: 'Plan aceptado — revisa orden y fechas',
    },
    dataFeed: {
      title: 'Los eventos vienen de los datos — no de esta pantalla',
      body: 'UC1 Syngenta: rush y QA se disparan cuando actualizan SAP o el log LSV pass/fail. Operadores o Data API hacen POST a ingest del BFF; esta UI hace poll de la cola y muestra notificaciones cuando hay replan pendiente.',
      sapPath: 'POST /demo/plant/ingest/sap-priority-change',
      sapRefreshPath: 'POST /demo/plant/ingest/sap-queue-refresh',
      passFailPath: 'POST /demo/plant/ingest/pass-fail-log',
      operatorDoc: 'Ejemplos curl: docs/hackathon/uc1-demo-operator-ingest.md',
    },
    actions: {
      accept: 'Aceptar programa',
      accepted: 'Aceptado',
    },
    copilotTitle: 'Copiloto IA — Qué cambió',
    copilotIdle: 'Cuando llegue un replan desde datos upstream, abre Programación para revisar orden y explicación.',
    copilotIdleHere: 'No hay un cambio de programa pendiente.',
    footerStats: '{count} lotes activos en cola (POs estilo Pasco).',
    acceptedNote: 'Aceptación humana registrada en el plan propuesto. Sin escritura en SAP.',
    uxCompare: {
      previewLink: 'Probar demo',
      signedInAs: 'Sesión: {user}',
      signOut: 'Cerrar sesión',
    },
    uxLogin: {
      eyebrow: 'Acceso demo',
      title: 'Iniciar sesión — vista UX Línea 1',
      subtitle: 'Puerta demo del hackathon — cuenta compartida de planificador.',
      usernameLabel: 'Usuario',
      passwordLabel: 'Contraseña',
      submit: 'Continuar',
      error: 'Usuario o contraseña incorrectos.',
      hint: 'Usuario demo por defecto en frontend/.env.example (override con VITE_DEMO_PLANT_USERNAME / VITE_DEMO_PLANT_PASSWORD).',
    },
    ux: {
      navHelp: 'Ayuda',
      pillSmooth: 'Operación normal',
      pillSmoothSub: 'Todos los sistemas normales',
      pillAction: 'Acción requerida',
      pillActionSub: 'Hay un cambio de programa pendiente de su aprobación',
      pillApproved: 'Programa aprobado',
      pillApprovedSub: 'Confirme el orden en la cola',
      calmTitle: 'Tranquilo y estable',
      calmBody: 'Sin cambios pendientes · {line} según plan',
      calmMeta: 'Próximo fin: {finish} · Utilización {utilization}%',
      amberTitle: 'Cambio de programa pendiente de aprobación',
      amberBody: 'Revise la línea de tiempo y el resumen; apruebe si está de acuerdo. Nada se envía a SAP de forma automática.',
      approvedStrip: 'Aprobado · Solo registro demo — sin escritura en ERP en vivo',
      whereNext: 'Siguiente paso',
      nextCalm: 'Todo según plan. Revise la Cola para ver fechas de fin.',
      nextApproved: 'Abra la Cola para confirmar el nuevo orden.',
      notifTitle: 'Notificaciones',
      notifEmptySub: 'Está al día en {line}',
      reviewUpdated: 'Revisar programa actualizado',
      pBell: 'Cambio de prioridad en Línea 1 — ventana de cliente',
      qBell: 'Fallo de calidad — lote en retención',
      openSchedule: 'Abrir Programación',
      dismiss: 'Descartar',
      askBtn: 'Preguntar por una orden…',
      helpTitle: 'Ayuda',
      helpClose: 'Cerrar',
      helpIntroTitle: 'Acondicionamiento Pasco',
      helpIntroBody:
        'Un pedido urgente o un control de calidad fallido reordena la línea. Mire cada lote y por qué se movió, y acepte el plan si está de acuerdo. No se envía nada a SAP.',
      glossaryTitle: 'Glosario',
      journeysTitle: 'Flujos habituales',
      timelineTitle: 'Cómo leer la línea de tiempo',
      timelineLegend: [
        { tone: 'up' as const, label: 'Subió en la cola' },
        { tone: 'rush' as const, label: 'Pedido urgente' },
        { tone: 'hold' as const, label: 'En retención' },
        { tone: 'quiet' as const, label: 'Sin cambio' },
      ],
      timelineRules: [
        'El lote que ya está corriendo se queda primero.',
        'Los lotes en retención no se mueven.',
        'Aprobación es solo para revisar. Arrastre un lote en Vertical u Horizontal.',
        'Seleccione una orden en la línea de tiempo. Pregunte por ella con el botón de chat de la esquina.',
        'Oculte el copiloto si quiere el programa más ancho. Se abre de nuevo cuando llega un cambio.',
      ],
      glossary: [
        { term: 'PO (orden)', def: 'Un lote de semilla con su propio número de orden.' },
        { term: 'Retención', def: 'Lote apartado tras un fallo de calidad.' },
        { term: 'Aprobar', def: 'Está de acuerdo con el orden propuesto; solo registro demo.' },
        { term: 'Nota ERP', def: 'Aprobar aquí no cambia SAP/ERP automáticamente.' },
      ],
      journeys: [
        {
          title: 'Revisión de la mañana',
          steps: [
            'Abra Panel y verifique estado verde',
            'Revise KPIs y abra Cola para fechas de fin',
            'Opcional: abra Programación para la semana',
          ],
        },
        {
          title: 'Evento de prioridad o calidad',
          steps: [
            'La campana muestra 1 — abra notificaciones',
            'Abra Programación y lea el copiloto junto a la línea de tiempo',
            'Apruebe programa y confirme orden en Cola',
          ],
        },
      ],
      whatChanged: 'Qué cambió',
      queueSubAfter: 'La cola refleja el plan aprobado — verifique orden y fechas',
      filterLabel: 'Filtrar cola',
      fAll: 'Todas las órdenes',
      fRisk: 'En riesgo',
      fHold: 'En retención',
      fSwco: 'Solo SWCO',
      fCorn: 'Solo CORN',
      clearFilter: 'Ver todo',
      noRows: 'Ninguna orden coincide con este filtro.',
      confirmTitle: 'Confirmar orden en cola',
      confirmBody: 'Aprobó el plan — revise posiciones y fechas de fin',
      openQueue: 'Abrir Cola',
      menuHistory: 'Historial de decisiones',
      historyTitle: 'Historial de decisiones',
      historySub: 'Aprobaciones en esta sesión del navegador. Nada se envía a ERP ni SAP.',
      historyEmpty: 'Aún no hay decisiones. Las aprobaciones aparecerán aquí.',
      histPriority: 'Aprobó actualización de prioridad — orden 1002307551 replanificada',
      histQuality: 'Aprobó retención por calidad — orden 1001884747 en hold',
      histBy: 'Planificador de línea · hoy {t}',
      selectAll: 'Seleccionar todas las visibles',
      selectRow: 'Seleccionar orden {po}',
      nSelected: '{n} seleccionadas',
      compare: 'Comparar seleccionadas',
      clearSel: 'Limpiar',
      cmpTitle: 'Comparar órdenes',
      cmpSub: 'Lado a lado con datos actuales de Línea 1. La cola no cambia.',
      cmpTotal: 'Peso total',
      cmpCrops: 'Cultivos',
      cmpFirst: 'Primera en terminar',
      cmpLast: 'Última en terminar',
      cmpHolds: '{n} en retención — sin fecha de envío',
      cmpPosition: 'Posición',
      colOrder: 'Orden',
      colWeight: 'Peso',
      colFinish: 'Fin programado',
      colStatus: 'Estado',
      paused: 'Sin fecha de envío',
    },
    salesChat: {
      eyebrow: 'Cuando un cliente pregunta por un lote',
      title: 'Explicar mi lote (ventas / servicio al cliente)',
      subtitle:
        'Pregunta por qué un PO espera, cuándo sale o qué haría falta para subirlo — respuestas ancladas a la cola actual (Agent API en vivo).',
      poLabel: 'Orden de producción (PO)',
      quickPrompts: ['¿Por qué está esperando?', '¿Cuándo sale?', '¿Qué haría falta para subirlo?'],
      inputPlaceholder: 'Pregunta sobre este lote…',
      askButton: 'Preguntar',
      railPrompt: 'Pregunte por esta orden. La respuesta usa la cola actual y no cambia el programa.',
      youLabel: 'Usted',
      copilotLabel: 'Copiloto',
      thinking: 'Buscando esta orden…',
      askError: 'La respuesta no llegó. Vuelva a preguntar en un momento.',
      citationsLabel: 'Fuentes',
    },
  },

  lang: {
    switchLabel: 'Idioma',
    en: 'EN',
    es: 'ES',
  },
  hero: {
    eyebrow: 'AgTech · IA generativa',
    title: 'Las tecnologías que combaten el calor y la sequía',
    subtitle:
      '¿Cómo pueden los agricultores proteger sus cultivos ante temperaturas extremas? GreenByte explora respuestas basadas en datos e IA — en colaboración con Syngenta para el hackathon.',
    ctaDiscover: 'Descubrir GreenByte',
    ctaPrecision: 'Agricultura de precisión',
    ctaDemoPlant: 'Demo UC1 Pasco',
    ctaArchitecture: 'Arquitectura',
  },
  intro: {
    title: 'GreenByte',
    body: 'Ofrecemos avances para los agricultores, en cada campo, para que puedan responder a las exigencias de la agricultura moderna. Mediante innovación de vanguardia — incluida la IA generativa — ayudamos a cultivar cosechas resilientes y saludables que alimenten a una población global creciente, produciendo alimentos de forma que contribuya a mejorar nuestro planeta.',
  },
  discover: {
    title: 'Descubrir GreenByte',
    readMore: 'Leer más',
    cards: [
      {
        title: 'Cómo la IA ayuda a predecir el rendimiento de híbridos antes de sembrar',
        tag: 'Innovación',
      },
      {
        title: 'Predicción de soluciones para la resistencia a herbicidas',
        tag: 'Investigación',
      },
      {
        title: 'Las malas hierbas que más afectan la seguridad alimentaria global',
        tag: 'Perspectivas',
      },
      {
        title: '¿Pueden los biológicos reducir la dependencia de fertilizantes?',
        tag: 'Sostenibilidad',
      },
      {
        title: 'Probando los rasgos del mañana',
        tag: 'Semillas y rasgos',
      },
      {
        title: 'Dentro del laboratorio que resuelve el próximo reto agrícola',
        tag: 'Ciencia',
      },
    ],
  },
  precision: {
    title: '¿Qué es la agricultura de precisión?',
    body1:
      'Es un enfoque agrícola que utiliza tecnología para monitorizar y gestionar la variabilidad del campo en los cultivos.',
    body2:
      'Descubra cómo ayuda a hacer la agricultura más eficiente, productiva y sostenible — con GreenByte como la plataforma que estamos construyendo durante el hackathon.',
    learnMore: 'Saber más →',
    mapLabel: 'Mapa de variabilidad del campo',
  },
  news: {
    title: 'Comunicados de prensa',
    items: [
      {
        date: 'Sep 2026',
        title: 'GreenByte lanza colaboración AgTech en hackathon con Syngenta',
      },
      {
        date: 'Sep 2026',
        title: 'Vista previa de la plataforma de agricultura de precisión en greenbyte-ag.com',
      },
      {
        date: 'Próximamente',
        title: 'Asistente de IA generativa para recomendaciones a nivel de campo',
      },
    ],
  },
  sustainability: {
    title: 'Nuestras prioridades de sostenibilidad',
    body: 'Trabajando con los agricultores, creemos que la agricultura puede convertirse en una solución climática, regenerando suelos y naturaleza, mientras alimenta al mundo. Nuestras prioridades establecen objetivos claros para reducir nuestra huella ambiental.',
    cta: 'Explorar prioridades',
  },
  footer: {
    blurb:
      'Avances para los agricultores, en cada campo — impulsados por datos e IA generativa. Proyecto de hackathon en colaboración con Syngenta.',
    explore: 'Explorar',
    about: 'Acerca de GreenByte',
    sustainability: 'Sostenibilidad',
    contact: 'Contacto',
    prioritiesTitle: 'Nuestras prioridades',
    prioritiesBody:
      'Agricultura regenerativa, salud del suelo y cultivos resilientes que alimenten a un mundo en crecimiento — con una huella ambiental reducida.',
    copyright: 'GreenByte. Proyecto independiente de hackathon.',
    disclaimer: 'No afiliado ni respaldado por Syngenta. Socio del sector para el hackathon.',
  },
};
