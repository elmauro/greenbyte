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
    demoPlant: 'Demo: Planta',
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
      'Vista de integración GreenByte: React y BFF en este repo; Data API y Agent API como servicios HTTP separados. Mismos diagramas que docs/hackathon/syngenta-demo-architecture.md.',
    docNote: 'Documento v1.2 · Sin conexión a sistemas productivos Syngenta.',
    links: {
      plant: 'Recorrido UC1',
      breeding: 'Recorrido UC4',
    },
    teamTitle: 'Responsabilidades del equipo',
    teamTable: {
      role: 'Rol',
      owner: 'Responsable',
      responsibility: 'Alcance',
    },
    teamRows: [
      {
        role: 'UI + BFF',
        owner: 'Mauricio / GreenByte',
        responsibility: 'Contrato único al React; CORS; MSW; persistencia de override',
      },
      {
        role: 'Data API',
        owner: 'Camilo',
        responsibility: 'ETL, esquema, tools de solo lectura, calidad de datos',
      },
      {
        role: 'Agent API',
        owner: 'David',
        responsibility: 'Chat, triage, explain; llamadas tools al Data API',
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
      generic: {
        title: 'Plantilla genérica (UC1 o UC4)',
        description: 'Cambiar fuentes (Excel vs CSV) y ruta (/demo/plant vs /demo/breeding).',
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
    title: 'Acondicionamiento Pasco — demo guiada',
    subtitle:
      'Recorrido de cómo un planner replanifica la Línea 1 cuando entra un lote urgente. Datos mock y UI conceptual — el humano valida cada plan.',
    steps: [
      {
        title: '1. Base — cola estable Línea 1',
        body: 'El planner abre la vista de planta. Los lotes están ordenados con PO, especie, kg y fechas SAP. La línea opera sin alertas.',
        imageSrc: '/demo/uc1-plant-baseline.png',
        imageAlt: 'Cola base antes de cualquier evento',
      },
      {
        title: '2. Detectar pedido en riesgo',
        body: 'El BFF carga órdenes SAP del extracto demo. Un lote tiene fecha cercana y prioridad alta; si baja en la cola, puede fallar la ventana de entrega.',
        highlight: 'Ejemplo: PO 1002307551 — SWCO, fin 2026-07-06, prioridad 2.',
      },
      {
        title: '3. Inyectar lote rush (evento)',
        body: 'Operaciones marca un lote urgente. El evento va al Data API; heurísticas proponen nuevo orden (reglas de changeover por especie e historial Pasco).',
        highlight: 'Humano en el loop: el sistema recomienda; el planner decide.',
      },
      {
        title: '4. Momento clave — replan con explicación IA',
        body: 'La cola se reordena. El Agent API explica en lenguaje claro qué PO subió o bajó y por qué (fecha SAP, prioridad, changeover evitado).',
        imageSrc: '/demo/uc1-plant-capacity-wow.png',
        imageAlt: 'Tras el rush — cola replanificada y panel copiloto',
      },
      {
        title: '5. Aceptar el plan',
        body: 'El planner revisa, acepta o ajusta manualmente. Plan aceptado queda registrado. Sin escritura a SAP live — solo demo según el brief.',
        highlight: 'Siguiente: conectar BFF con APIs Data + Agent (doc de arquitectura).',
      },
    ],
  },
  demoBreeding: {
    eyebrow: 'Syngenta UC4 · Unificación R&D',
    title: 'Inteligencia de breeding — demo guiada',
    subtitle:
      'Recorrido de un breeder senior: una pregunta cruzando ensayos, campo, lab, pedigrí y operaciones — con override. CSVs mock unificados.',
    steps: [
      {
        title: '1. Base — espacio unificado',
        body: 'Hoy los datos viven en hojas separadas. El hub demo conecta cinco fuentes a un Data API de solo lectura — base para tools tipo MCP.',
        imageSrc: '/demo/uc4-breeding-baseline.png',
        imageAlt: 'Workspace unificado antes de la pregunta',
      },
      {
        title: '2. Pregunta en lenguaje natural',
        body: 'El breeder escribe en el chat. El BFF reenvía al Agent API, que planifica llamadas a tools — sin inventar IDs no recuperados.',
        highlight:
          'Ejemplo: «¿Qué líneas superaron 45 t/ha con baja enfermedad y pedigrí compartido?»',
      },
      {
        title: '3. Agente invoca tools de solo lectura',
        body: 'Ensayo, pedigrí, observaciones de campo y lab, operaciones. Hechos fusionados en dossier con citas (TRIAL_GUID, MATERIAL_GUID, traits).',
        highlight: 'Regla: toda respuesta cita campos JSON recuperados.',
      },
      {
        title: '4. Momento clave — dossier R / A / G',
        body: 'Semáforo rojo, ámbar o verde con una línea de motivo. Paneles de campo, lab y pedigrí juntos — la promesa UC4 de un solo lugar.',
        imageSrc: '/demo/uc4-rd-unification-wow.png',
        imageAlt: 'Dossier con triage y citas en el chat',
      },
      {
        title: '5. Override del breeder (auditoría)',
        body: 'Acepta, ajusta u override. Queda en audit trail. Decisión final humana — requisito UC4.',
        highlight: 'Siguiente: Agent + Data en vivo y persistencia de override en BFF.',
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
    ctaDemoPlant: 'Demo UC1 planta',
    ctaDemoBreeding: 'Demo UC4 breeding',
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
