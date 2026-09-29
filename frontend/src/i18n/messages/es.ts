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
      'Recorre qué pasa cuando entra un lote urgente. Pantallas de concepto y datos de prueba — siempre hay una persona que aprueba el plan.',
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
        'Llega algo urgente — toca proponer un nuevo orden.',
        'La lista cambia en pantalla y el asistente explica el porqué en lenguaje cotidiano.',
        'El responsable dice “de acuerdo” (o lo ajusta) — la IA sugiere, la persona manda.',
      ],
      tagline: 'En una frase: «¿Qué lote va primero cuando aparece un imprevisto?»',
    },
    steps: [
      {
        title: '1. La cola de siempre',
        plainLine: 'Primero miramos la lista de hoy en la Línea 1: quién va primero, segundo, tercero.',
        body: 'Cada fila es un lote: tipo de cultivo, peso y cuándo debería estar listo. Todo avanza; aún no hay alertas.',
        imageSrc: '/demo/uc1-plant-baseline.png',
        imageAlt: 'Cola base antes de cualquier evento',
      },
      {
        title: '2. Un pedido que no puede esperar mucho',
        plainLine: 'Hay un pedido con fecha cercana: si sigue cayendo en la lista, el agricultor puede quedarse sin semilla a tiempo.',
        body: 'La app marca los lotes con compromisos próximos. Aquí no hacemos magia numérica: solo detectamos quién está en riesgo.',
        highlight: 'Ejemplo con datos demo: lote de maíz dulce, entrega 2026-07-06, prioridad alta.',
      },
      {
        title: '3. Llega lo urgente',
        plainLine: 'Operaciones avisa: «hay que subir este lote». El sistema propone un nuevo orden — respetando tiempos de limpieza entre cultivos distintos.',
        body: 'Este paso es el disparador. En planta real se usa historial (cuánto tarda preparar y correr) para que la sugerencia tenga base, no corazonada.',
        highlight: 'Clave: la herramienta recomienda; quien programa la línea decide.',
      },
      {
        title: '4. Nuevo orden + explicación clara',
        plainLine: 'Aquí está el “wow”: cambia la cola y lees el motivo en palabras normales.',
        body: 'Por ejemplo: «Subimos el lote A porque vence antes y es el mismo cultivo en la misma línea — así evitamos una limpieza extra de máquina».',
        imageSrc: '/demo/uc1-plant-capacity-wow.png',
        imageAlt: 'Tras el rush — cola replanificada y panel copiloto',
      },
      {
        title: '5. Tú das el visto bueno',
        plainLine: 'Aceptas el plan o lo retocas. En esta demo del hackathon no escribimos en sistemas reales de fábrica.',
        body: 'Así se gana confianza: el software ayuda a decidir más rápido, no corre la planta solo.',
        highlight: 'Próximo paso del build: conectar datos e IA en vivo (página Arquitectura).',
      },
    ],
  },
  demoBreeding: {
    eyebrow: 'Syngenta UC4 · Unificación R&D',
    title: 'Investigación de variedades — demo guiada',
    subtitle:
      'Recorre cómo un fitomejorador hace una pregunta y obtiene respuesta cruzando campo, lab y árbol genealógico — y conserva la última palabra. Solo CSVs de demo.',
    plainLanguage: {
      sectionTitle: 'La idea, en palabras simples',
      problemHeading: '¿Qué problema resolvemos?',
      problem:
        'Antes de lanzar una variedad nueva, se prueban muchos candidatos durante años. Las notas están en Excel distintos, informes de lab y correos. Juntar una foto completa puede tardar semanas y frena todo el pipeline.',
      analogyHeading: 'Piénsalo como…',
      analogy:
        'Un médico con el historial del paciente repartido en cinco carpetas. Preguntas «¿este tratamiento funciona?» y quieres una respuesta con analíticas y visitas — no una suposición.',
      walkthroughHeading: 'Lo que verás en los cinco pasos de abajo',
      walkthroughSteps: [
        'Un solo espacio de trabajo que alcanza todas las fuentes de datos demo.',
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
        plainLine: 'En lugar de cinco archivos sueltos, imagina un escritorio con todo enlazado.',
        body: 'Ensayos, mediciones en campo, resultados de lab, árbol genealógico de la planta y actividades en parcela — accesibles desde el mismo hub demo.',
        imageSrc: '/demo/uc4-breeding-baseline.png',
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
        imageSrc: '/demo/uc4-rd-unification-wow.png',
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
