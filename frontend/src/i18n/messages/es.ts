import type { Messages } from './en';

export const es: Messages = {
  header: {
    tagline: 'Innovación AgTech · En colaboración con Syngenta',
    domain: 'greenbyte-ag.com',
    brandSubtitle: 'Agricultura inteligente',
  },
  nav: {
    innovation: 'Innovación',
    precision: 'Agricultura de precisión',
    sustainability: 'Sostenibilidad',
    news: 'Noticias',
    demoPlant: 'UC1 Pasco',
    demoBreeding: 'Demo: Breeding',
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
    viewBreeding: 'Ver recorrido UC4 — inteligencia de breeding',
    viewArchitecture: 'Ver diagramas de arquitectura',
  },
  demoArchitecture: {
    eyebrow: 'Hackathon Syngenta · Base técnica',
    title: 'Arquitectura del demo',
    subtitle:
      'Una plataforma compartida (React + BFF + Data + Agent) con dos briefs Syngenta mapeados abajo: UC1 capacidad de planta y UC4 unificación R&D.',
    scopeNote:
      'Documento v1.2 · Solo datos demo (Excel Pasco, CSVs UC4) · Diagramas técnicos de arquitectura en inglés; recorridos UC1/UC4 usan mockups en español con idioma ES.',
    docNote: 'Documento v1.2 · Sin conexión a sistemas productivos Syngenta.',
    links: {
      plant: 'MVP UC1 (Línea 1)',
      tour: 'Tour guiado UC1',
      breeding: 'Recorrido UC4',
    },
    useCasesTitle: 'Casos de uso Syngenta que cubre esta arquitectura',
    genAiRoleLabel: 'Rol GenAI',
    useCaseCards: [
      {
        id: 'UC1',
        name: 'Capacidad de planta (Pasco)',
        problem:
          'Las líneas de acondicionamiento compiten por lotes; pedidos urgentes y fallos de QA obligan a replanear a mano sin explicación clara.',
        genAiRole:
          'Explicar en lenguaje natural los cambios tras el replan del Data API; aceptación humana — sin escribir en ERP.',
      },
      {
        id: 'UC4',
        name: 'Unificación de fuentes R&D',
        problem:
          'Las cuatro familias de fuentes mock de Syngenta (ensayos, operaciones, lab, germplasm/pedigree) están en archivos distintos; el breeder necesita una respuesta con evidencia.',
        genAiRole:
          'Chat NL + triage R/A/G anclado a tools del Data API; override del breeder con auditoría.',
      },
    ],
    fieldLabels: {
      syngentaGoal: 'Criterios de éxito Syngenta (demo)',
      data: 'Datos hackathon (repo)',
      demoRoute: 'Recorrido GreenByte',
    },
    groups: {
      shared: {
        title: 'Plataforma compartida (ambos casos)',
        intro:
          'Todo flujo empieza igual: React solo llama al BFF; ETL carga Excel o CSV a PostgreSQL; el Agent no lee archivos crudos en runtime — solo SQL vía Data API.',
      },
      uc1: {
        title: 'UC1 — Arquitectura capacidad de planta',
        intro:
          'UI de cola → evento (rush o QA) → replan Data API → Agent explica el diff → aceptación humana.',
        syngentaGoal: 'Recomendaciones con explicación; validación humana; sin SAP en vivo.',
        dataSource:
          'Excel Pasco LSV/SSV (schedules, órdenes SAP, logs de acondicionamiento, pass/fail).',
      },
      uc4: {
        title: 'UC4 — Arquitectura unificación R&D',
        intro:
          'Pregunta en NL → BFF reenvía al Agent → tools de solo lectura en Data API → triage + citas → override opcional auditado en BFF.',
        syngentaGoal: 'Vista unificada; GenAI central; humano en el loop con auditoría de override.',
        dataSource:
          'Cuatro familias de fuentes Syngenta (ensayos incl. obs campo, operaciones, lab, germplasm/pedigree) — cinco CSV UC4 en el pack del hackathon, con TRIAL_GUID / MATERIAL_GUID.',
      },
    },
    teamTitle: 'Responsabilidades del equipo',
    teamIntro:
      'La propiedad es por capa; UC1 vs UC4 cambia sobre todo qué rutas BFF y endpoints Agent implementas — no la forma del contenedor.',
    teamTable: {
      role: 'Rol',
      owner: 'Responsable',
      responsibility: 'Alcance',
      useCases: 'Enfoque UC1 / UC4',
    },
    teamRows: [
      {
        role: 'UI + BFF',
        owner: 'Mauricio / GreenByte',
        responsibility: 'Contrato único al React; CORS; MSW; persistencia de override',
        useCases: 'UC1: /demo/plant/* cola, eventos, accept · UC4: /demo/breeding/* ask, dossier, override',
      },
      {
        role: 'Data API',
        owner: 'Camilo',
        responsibility: 'ETL, esquema, tools de solo lectura, calidad de datos',
        useCases: 'UC1: cola, replan, batch · UC4: trial, material, obs, lab, ops',
      },
      {
        role: 'Agent API',
        owner: 'David',
        responsibility: 'Chat, triage, explain; llamadas tools al Data API',
        useCases: 'UC1: explain-replan, suggest-rank opcional · UC4: /chat, /triage con tools',
      },
    ],
    endpointsTitle: 'Endpoints ilustrativos (contrato BFF según UC elegido)',
    endpointTable: {
      layer: 'Capa',
      examples: 'Ejemplos',
      purpose: 'Propósito en este caso de uso',
    },
    uc1Endpoints: [
      {
        layer: 'BFF',
        examples: 'GET /demo/plant/lines/{lineId}/queue · POST /demo/plant/events · POST /demo/plant/schedule/accept',
        purpose: 'UI de cola, evento rush/QA, aceptación humana del plan',
      },
      {
        layer: 'Data API',
        examples: 'GET /lines/{id}/queue · POST /schedule/replan · GET /batches/{po}',
        purpose: 'Datos Pasco, reorden heurístico, contexto de lote',
      },
      {
        layer: 'Agent API',
        examples: 'POST /explain-replan · POST /suggest-rank (opcional)',
        purpose: 'Explicación NL del diff; sugerencia de ranking validada por BFF',
      },
    ],
    uc4Endpoints: [
      {
        layer: 'BFF',
        examples: 'POST /demo/breeding/ask · GET /demo/breeding/materials/{guid}/dossier · POST .../override',
        purpose: 'Pregunta NL, dossier agregado, auditoría de override',
      },
      {
        layer: 'Data API',
        examples: 'GET /trials/{guid} · GET /materials/{guid}/pedigree · GET .../observations · GET .../operations',
        purpose: 'Tools de solo lectura que llama el Agent (MCP vía HTTP)',
      },
      {
        layer: 'Agent API',
        examples: 'POST /chat · POST /triage',
        purpose: 'Orquestación de tools, R/A/G con razones ancladas al JSON recuperado',
      },
    ],
    rulesTitle: 'Reglas de integración (día 1)',
    rules: [
      'Contrato primero: OpenAPI o JSON compartido BFF ↔ front y BFF ↔ Data/Agent.',
      'Mocks en paralelo: MSW refleja respuestas del BFF para demo offline.',
      'Tools de solo lectura en Data API con límites y filtros permitidos.',
      'Grounding del agente: contexto LLM solo desde JSON del Data API; citar IDs estables.',
      'Timeouts y fallback en BFF si el Agent no responde.',
    ],
    sections: {
      container: {
        title: 'Diagrama de contenedores común',
        description: 'El front solo habla con el BFF; el Agent llama al Data API (estilo MCP vía HTTP).',
      },
      teamStack: {
        title: 'Stack del equipo (quién hace qué)',
        description: 'Frontend y BFF en GreenByte; APIs Data y Agent como servicios hermanos detrás del BFF.',
      },
      uc1Flow: {
        title: 'UC1 — Flujo capacidad de planta',
        description: 'Pasco: cola, eventos, replan, explicación, aceptación humana.',
      },
      uc1Sequence: {
        title: 'UC1 — Secuencia (evento + replan + explain)',
        description: 'Orden de llamadas ante lote rush o fallo de QA.',
      },
      uc4Flow: {
        title: 'UC4 — Flujo unificación R&D',
        description: 'CSVs unificados, pregunta NL, tools, triage, auditoría de override.',
      },
      uc4Sequence: {
        title: 'UC4 — Secuencia (ask + tools)',
        description: 'BFF reenvía chat; Agent recupera hechos antes de responder.',
      },
    },
    monolithTitle: 'Monolito vs distribuido',
    monolithBody:
      'Para jurado puede bastar la historia “copiloto”. El equipo implementa tres servicios + BFF. Diagramas de una sola caja (todo en core-api) son vista lógica; el despliegue físico sigue el diagrama de contenedores.',
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
      walkthroughHeading: 'Lo que verás en los cinco pasos de abajo',
      walkthroughSteps: [
        'La lista normal de la Línea 1 — todo tranquilo.',
        'Un trabajo con fecha límite que no puede seguir bajando en la cola.',
        'Entra un lote rush o falla un test QA — hay que reordenar y explicar.',
        'La lista cambia en pantalla y el asistente explica el porqué en lenguaje cotidiano.',
        'El responsable dice “de acuerdo” (o lo ajusta) — la IA sugiere, la persona manda.',
      ],
      tagline:
        'En una frase: «¿Qué va primero cuando llega un rush o falla un test — y por qué?»',
    },
    steps: [
      {
        title: '1. La cola de siempre',
        plainLine: 'Primero miramos la lista de hoy en la Línea 1: quién va primero, segundo, tercero.',
        body: 'Cada fila es un lote: tipo de cultivo, peso y cuándo debería estar listo. Todo avanza; aún no hay alertas.',
        imageSrc: '/demo/es/uc1-plant-baseline.png',
        imageAlt: 'Cola base antes de cualquier evento',
      },
      {
        title: '2. Un pedido que no puede esperar mucho',
        plainLine: 'Hay un pedido con fecha cercana: si sigue cayendo en la lista, el agricultor puede quedarse sin semilla a tiempo.',
        body: 'La app marca los lotes con compromisos próximos. Aquí no hacemos magia numérica: solo detectamos quién está en riesgo.',
        highlight: 'Ejemplo con datos demo: lote de maíz dulce, entrega 2026-07-06, prioridad alta.',
      },
      {
        title: '3. Rush o QA fallido',
        plainLine:
          'En el hackathon Syngenta inyectas uno de dos eventos en vivo: un lote rush sorpresa, o un resultado pass/fail que obliga a reordenar la línea.',
        body:
          'En ambos casos el sistema propone un nuevo orden — respetando tiempos de changeover entre variedades y tamaños, con historial de acondicionamiento de los extracts Pasco (no un optimizador opaco).',
        highlight:
          'Mismo flujo para ambos: re-secuenciar → explicar en palabras normales → el programador valida antes de dar por final el plan.',
      },
      {
        title: '4. Nuevo orden + explicación clara',
        plainLine: 'Aquí está el “wow”: cambia la cola y lees el motivo en palabras normales.',
        body: 'Por ejemplo: «Subimos el lote A porque vence antes y es el mismo cultivo en la misma línea — así evitamos una limpieza extra de máquina».',
        imageSrc: '/demo/es/uc1-plant-capacity-wow.png',
        imageAlt: 'Tras rush o evento QA — cola replanificada y panel copiloto',
      },
      {
        title: '5. Tú das el visto bueno',
        plainLine: 'Aceptas el plan o lo retocas. En esta demo del hackathon no escribimos en sistemas reales de fábrica.',
        body: 'Así se gana confianza: el software ayuda a decidir más rápido, no corre la planta solo.',
        highlight: 'Próximo paso del build: conectar datos e IA en vivo (página Arquitectura).',
      },
    ],
  },
  plantMvp: {
    eyebrow: 'Syngenta UC1 · MVP hackathon',
    title: 'Pasco acondicionamiento — Línea 1',
    subtitle:
      'Cola en vivo, inyectar rush o fallo QA, ver replan explicado y aceptar el programa. Mock en cliente hasta conectar BFF + Data + Agent.',
    links: {
      tour: 'Historia guiada (5 pasos)',
      architecture: 'Arquitectura de integración',
      backMvp: 'Volver al MVP Línea 1',
    },
    lineTitle: 'Cola Línea 1',
    lineSubtitle: 'Estado estable — inyecta un evento para replanificar (flujo demo-ready Syngenta).',
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
    },
    actions: {
      rush: 'Simular lote rush',
      qaFail: 'Simular fallo QA',
      reset: 'Restablecer cola',
      accept: 'Aceptar programa',
      accepted: 'Aceptado',
    },
    copilotTitle: 'Copiloto IA — Qué cambió',
    copilotIdle: 'Inyecta rush o fallo QA para ver el orden propuesto y la explicación.',
    explanations: {
      rush: {
        alertBanner: 'Evento inyectado: Lote rush — ventana de cliente en riesgo.',
        summary: 'Se adelantó PO 1002307551 para proteger la ventana del 2026-07-06.',
        bullets: [
          'PO 1002307551 pasó por delante de PO 1001759341.',
          'Motivo: fecha fin SAP 2026-07-06 y prioridad 2.',
          'Se evitaron ~1,5 h de changeover: misma especie SWCO en Línea 1.',
        ],
        impact: 'Impacto: ventana de cliente protegida · Changeover neto: −1,5 h (heurística demo).',
      },
      qa_fail: {
        alertBanner: 'Evento inyectado: Test QA fallido — lote en hold y cola reordenada.',
        summary: 'PO 1001858227 en hold QA; el resto de lotes SWCO sigue flujo sin el slot fallido.',
        bullets: [
          'PO 1001858227 en HOLD según log pass/fail (demo).',
          'Posiciones siguientes ajustadas; sin escritura en ERP — valida el programador.',
          'Bloques SWCO siguientes sin cambiar especie donde sea posible.',
        ],
        impact: 'Impacto: la línea sigue; lote fallido aislado hasta disposición.',
      },
    },
    footerStats: '{count} lotes activos en cola (datos demo).',
    acceptedNote: 'Aceptación humana registrada (demo). Sin actualización ERP en vivo.',
    mockNote: 'Sustituir mock por BFF → replan Data API + explain-replan Agent según docs/hackathon/uc1-mvp-scope.md.',
  },
  demoBreeding: {
    eyebrow: 'Syngenta UC4 · Unificación R&D',
    title: 'Investigación de variedades — demo guiada',
    subtitle:
      'Recorre cómo un fitomejorador pregunta en lenguaje natural sobre las cuatro fuentes mock unificadas de Syngenta (ensayos incl. campo, operaciones, lab, germplasm/pedigree) — y conserva la última palabra. Solo CSVs de demo.',
    plainLanguage: {
      sectionTitle: 'La idea, en palabras simples',
      problemHeading: '¿Qué problema resolvemos?',
      problem:
        'Antes de lanzar una variedad nueva, se prueban muchos candidatos durante años. Las notas están en Excel distintos, informes de lab y correos. Juntar una foto completa puede tardar semanas y frena todo el pipeline.',
      analogyHeading: 'Piénsalo como…',
      analogy:
        'Un médico con el historial repartido en cuatro carpetas (visitas, analíticas, antecedentes, notas de cuidado). Preguntas «¿funciona el tratamiento?» y quieres hechos — no una suposición.',
      walkthroughHeading: 'Lo que verás en los cinco pasos de abajo',
      walkthroughSteps: [
        'Un workspace conectado a las cuatro familias de fuentes Syngenta (cinco CSV en el pack del hackathon).',
        'Haces una pregunta normal en el chat.',
        'El asistente busca hechos en cada fuente (no inventa cifras).',
        'Ves una recomendación tipo semáforo con motivo breve y evidencias.',
        'Aceptas o corriges — queda registrado lo que decidiste.',
      ],
      tagline: 'En una frase: «¿Esta línea sigue adelante — con todos los papeles en un solo sitio?»',
    },
    steps: [
      {
        title: '1. Un solo punto de partida',
        plainLine:
          'En lugar de perseguir cuatro tipos de fuente desconectados, imagina un escritorio con todo enlazado.',
        body:
          'Ensayos (incl. observaciones de campo), operaciones en parcela, resultados de lab y germplasm/pedigree — las mismas cuatro familias del brief Syngenta, cargadas desde el set CSV UC4.',
        imageSrc: '/demo/es/uc4-breeding-baseline.png',
        imageAlt: 'Workspace unificado antes de la pregunta',
      },
      {
        title: '2. Preguntas como persona, no como base de datos',
        plainLine: 'Escribes como le hablarías a un colega en la mesa.',
        body: 'En esta historia no necesitas memorizar códigos internos: el asistente traduce tu pregunta en consultas.',
        highlight: 'Ejemplo: «¿Qué líneas rindieron bien, se mantuvieron sanas y comparten los mismos padres?»',
      },
      {
        title: '3. Buscar primero, responder después',
        plainLine: 'La IA trae filas de la base demo y solo entonces redacta la respuesta.',
        body: 'Así evitamos “alucinaciones”: si un número no salió de los datos, no debería aparecer en el texto.',
        highlight: 'Deberías ver de dónde salió cada dato.',
      },
      {
        title: '4. Recomendación que puedes cuestionar',
        plainLine: 'Verde, ámbar o rojo — más una frase del porqué — y la evidencia al lado.',
        body: 'Notas de campo, lab y pedigrí juntos para que revises la historia antes de confiar.',
        imageSrc: '/demo/es/uc4-rd-unification-wow.png',
        imageAlt: 'Dossier con triage y citas en el chat',
      },
      {
        title: '5. La última palabra es tuya',
        plainLine: 'Aceptas, ajustas o cambias la recomendación. El sistema anota tu decisión.',
        body: 'En mejoramiento vegetal manda el experto. La IA es asistente de investigación, no jefe.',
        highlight: 'Próximo paso del build: servicios de datos e IA en vivo (página Arquitectura).',
      },
    ],
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
    ctaDemoBreeding: 'Demo UC4 breeding',
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
