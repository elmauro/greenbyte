export const en = {
  header: {
    tagline: 'AgTech innovation · Partnering with Syngenta',
    domain: 'greenbyte-ag.com',
    brandSubtitle: 'Intelligent agriculture',
  },
  nav: {
    innovation: 'Innovation',
    precision: 'Precision agriculture',
    sustainability: 'Sustainability',
    news: 'News',
    demoPlant: 'UC1 Pasco',
    demoPlantFlow: 'UC1 UI↔API',
    demoBreeding: 'Demo: Breeding',
    demoArchitecture: 'Architecture',
  },
  demoCommon: {
    labels: {
      step: 'Step',
      of: 'of',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      restart: 'Restart walkthrough',
    },
    viewPlant: 'View UC1 plant capacity walkthrough',
    viewBreeding: 'View UC4 breeding intelligence walkthrough',
    viewArchitecture: 'View architecture diagrams',
  },
  demoPlant: {
    eyebrow: 'Syngenta UC1 · Plant Capacity',
    title: 'Pasco conditioning — guided demo',
    subtitle:
      'Walk through Syngenta’s demo-ready trigger: a rush batch or a failed quality test forces a replan — with plain-language explanation and human sign-off. Concept screens and Pasco-style demo data only.',
    plainLanguage: {
      sectionTitle: 'The idea, in plain language',
      problemHeading: 'What problem are we solving?',
      problem:
        'After harvest, seed goes through cleaning and sizing on production lines. Many batches compete for the same machines. If you run them in the wrong order, the plant looks busy but orders ship late. Today someone reorders the list by hand, under pressure.',
      analogyHeading: 'Think of it like…',
      analogy:
        'A car shop with six jobs booked. A walk-in says “I need my car today.” You shuffle the queue — but you want a clear reason before you bump someone else, especially if switching job types costs an hour of setup.',
      walkthroughHeading: 'What you will see in the five steps below',
      walkthroughSteps: [
        'The normal waiting list for Line 1 — calm, no surprises yet.',
        'A job with a tight deadline that could slip if it stays too far back.',
        'A rush batch lands or a batch fails QA — time to re-sequence and explain.',
        'The list updates on screen and the assistant explains why in everyday words.',
        'The planner says yes (or tweaks it) — AI suggests, humans decide.',
      ],
      tagline:
        'In one line: “What runs next when a rush order or a failed test hits the line — and why?”',
    },
    tourLivePreview: 'Live UI — same components as /demo/plant',
    tourInjectNote:
      'Read-only preview after a rush inject (QA failure uses the same screen with HOLD status). Try buttons on the interactive demo.',
    steps: [
      {
        title: '1. The normal queue',
        plainLine: 'First we look at today’s list on Line 1 — who goes first, second, third.',
        body: 'Each row is a batch: crop type, weight, and when it must be finished. Everything is moving; nothing is flashing red yet.',
        highlight: 'See UI ↔ API map: /demo/plant/flow?step=01',
      },
      {
        title: '2. A job that cannot wait much longer',
        plainLine: 'One order has a due date soon — if it keeps falling down the list, a grower may not get seed on time.',
        body: 'The app highlights batches tied to near-term commitments. You are not solving math yet; you are spotting who is at risk.',
        highlight: 'Example from demo data: sweet-corn batch, finish date 2026-07-06, high priority. Map: /demo/plant/flow?step=02',
      },
      {
        title: '3. Rush batch or failed QA',
        plainLine:
          'Syngenta’s hackathon demo injects one of two events live: a surprise rush batch, or a pass/fail test that forces the line to reorder.',
        body:
          'Either way the system drafts a new run order — respecting changeover rules between varieties and sizes, using conditioning history from the Pasco extracts (not a black-box optimizer).',
        highlight:
          'Same flow for both triggers: re-sequence → explain in plain language → planner validates before the plan is final.',
      },
      {
        title: '4. New order + plain explanation',
        plainLine: 'This is the “aha” moment: the queue changes and you read why in normal language.',
        body: 'For example: “Moved batch A ahead of batch B because its due date is sooner and both are the same crop on the same line — so we avoided extra machine cleanup.”',
      },
      {
        title: '5. You sign off',
        plainLine: 'You accept the plan or adjust it yourself. Nothing is sent to live factory systems in this hackathon demo.',
        body: 'That keeps trust: software helps you decide faster, it does not auto-run the plant.',
        highlight: 'Coming next in the build: live hooks to our data and AI services (see Architecture page).',
      },
    ],
  },
  plantFlowGallery: {
    eyebrow: 'UC1 integration map',
    title: 'UI controls ↔ BFF ↔ JSON (live components)',
    subtitle:
      'Left: real React widgets with the same mock JSON as plantDemoServer. Right: HTTP contract. Export PNGs later from this page (Playwright) — no hotspot drift.',
    componentNote: 'Data source: plantDemoServer snapshots (matches plantDemoTypes.ts).',
    previewHeading: 'UI preview (components + mock data)',
    previewNote: 'On /demo/plant the same fields come from GET /demo/plant/lines/line-1/queue via plantDemoApi.',
    liveDemoCta: 'Try live Line 1 demo',
    tourLink: '5-step story',
    stepNavLabel: 'Flow steps',
    prev: 'Previous',
    next: 'Next',
    backendOwnersLabel: 'Likely backend owners (hackathon)',
    backendOwners: {
      s01: 'Mauricio · BFF (core-api) proxies → Camilo · Data API GET /lines/line-1/queue · PostgreSQL (Pasco seed).',
      s02: 'Same as step 01 — no extra service; Camilo · Data API (queue fields).',
      s03:
        'Mauricio · BFF POST /demo/plant/ingest/* → Camilo · Data API POST /schedule/replan → David · Agent API POST /explain-replan.',
      s03b:
        'Mauricio · BFF POST /demo/plant/ingest/pass-fail-log → Camilo · replan + hold rules → David · explain-replan.',
      s04: 'David · Agent API (explain-replan). Mauricio · BFF merges explanation into event response.',
      s05: 'Camilo · Data API (queue[] in replan response). Mauricio · BFF — no separate timeline endpoint.',
      s06: 'Mauricio · BFF POST /demo/plant/schedule/accept (demo audit; optional Camilo persist).',
      s07:
        'Mauricio · BFF POST /demo/plant/batches/explain → David · Agent API (batch Q&A) · tools on Camilo · Data API.',
    },
    triggers: {
      s01: 'User opens /demo/plant — useEffect calls plantDemoApi.getQueue().',
      s02: 'Same GET response — UI reads finish, atRisk, reasonShort (no second request).',
      s03: 'Operator posts SAP priority change — POST /demo/plant/ingest/sap-priority-change.',
      s03b: 'Operator posts pass/fail Fail row — POST /demo/plant/ingest/pass-fail-log.',
      s04: 'Copilot fills from POST response explanation (BFF calls Agent explain-replan).',
      s05: 'Timeline derives from event response queue[] — no GET /timeline.',
      s06: 'User clicks Accept schedule — POST /demo/plant/schedule/accept.',
      s07: 'User asks in sales panel — POST /demo/plant/batches/explain.',
    },
    slideTitles: {
      s01: 'Queue table — page load',
      s02: 'Scheduled finish & at-risk rows',
      s03: 'SAP priority ingest',
      s03b: 'Pass/fail log ingest',
      s04: 'AI Copilot — what changed',
      s05: 'Schedule timeline / Gantt',
      s06: 'Accept schedule',
      s07: 'Explain my batch (sales)',
    },
  },
  plantMvp: {
    eyebrow: 'Syngenta UC1 · Hackathon demo target',
    title: 'Pasco conditioning — Line 1',
    subtitle:
      'Scheduler workspace: ranked queue updates when upstream data lands (SAP priority / pass-fail log). Review Scheduling, accept — no ERP write.',
    demoTargetBadge: 'Demo target B+ · Aligns with Syngenta brief + GreenByte wow mockups.',
    links: {
      tour: 'Guided story (5 steps)',
      tourCta: 'Start with the 5-step story',
      architecture: 'Integration architecture',
      flowSlides: 'UI ↔ API flow (live map)',
      backMvp: 'Back to Line 1 demo',
    },
    lineTitle: 'Line 1 queue',
    lineSubtitle: 'Calm baseline — replans appear when Data API or BFF ingest receives new source rows (poll every ~5s).',
    loading: 'Loading queue…',
    status: { calm: 'Calm & stable', eventActive: 'Event active — review proposed plan' },
    statusLabels: { planned: 'PLANNED', atRisk: 'AT RISK', complete: 'COMPLETE', hold: 'QA HOLD' },
    queueTitle: 'Conditioning run order',
    table: {
      position: '#',
      po: 'PO',
      species: 'Species',
      kg: 'Kg',
      finish: 'Scheduled finish',
      status: 'Status',
      reason: 'Reason (position)',
    },
    scheduleShell: {
      brandLine: 'GreenByte',
      facilityLine: 'Pasco Conditioning — Line 1',
      dateRange: 'Jun 29 – Jul 6, 2026',
      clockLabel: '10:42 AM PDT',
      notificationsAria: 'Notifications',
      ganttTitle: 'Program timeline',
      ganttHint: 'Simplified Gantt for hackathon demo — full schedule from Pasco Data API.',
      batchCol: 'Batch / operation',
      species: 'Species',
      client: 'Customer',
      priority: 'Priority',
      urgent: 'URGENT',
      zoom1h: '1H',
      dayHeaders: ['Mon 29', 'Tue 30', 'Wed 1', 'Thu 2', 'Fri 3', 'Sat 4', 'Sun 5'],
      hourTicks: ['00:00', '06:00', '12:00', '18:00', '00:00', '06:00', '00:00'],
      footerTotal: '{count} batches · Total runtime: {runtime}',
      demoRuntime: '5d 2h 45m',
      adjustManually: 'Adjust manually',
    },
    baselineDashboard: {
      tagline: 'SEED. PLAN. GROW.',
      nav: {
        panel: 'Dashboard',
        queue: 'Queue',
        scheduling: 'Scheduling',
        copilot: 'AI Copilot',
      },
      systemsOk: 'All systems normal',
      lastUpdated: 'Last updated: Just now',
      pageTitle: 'Pasco Conditioning — Line 1',
      moodLine: 'Calm · Stable · Ready',
      systemStable: 'System status Stable',
      headerDate: 'May 21, 2025 · 09:42 AM',
      queueTitle: 'Line 1 queue',
      orderCount: '{n} orders',
      queueSubtitle: 'Stable state · BEFORE any event · No active alerts',
      queueSubtitleEvent: 'Queue replanned — review program timeline and copilot below',
      moodLineEvent: 'Event active · Proposed schedule on timeline',
      summaryHeadlineEvent: 'Replanned',
      summaryBulletsEvent: 'Review moves on the timeline · Accept to log (no ERP write)',
      sortFilter: 'Sort / Filter',
      colPo: 'PO no.',
      colSpecies: 'Species',
      actionsAria: 'Row actions',
      finishFormat: '{date} at {time}',
      summaryTitle: 'Line overview',
      summaryHeadline: 'Calm & stable',
      summaryBullets: 'No events · No delays · All systems normal',
      metricLoad: 'Queue load',
      metricNextFinish: 'Next finish',
      metricUtilization: 'Line utilization',
      copilotReady: 'AI Copilot ready',
      sectionDashboard: 'Line overview',
      sectionQueue: 'Line 1 queue',
      sectionScheduling: 'Program timeline',
      sectionCopilot: 'AI Copilot — What changed',
      eventBannerHint: 'Open Scheduling from the menu to review the replan and accept.',
      navBadgeScheduling: 'Pending event — review and accept',
      navBadgeQueue: 'Queue updated after accept',
      notificationsBellAria: 'Notifications, {n} unread',
      notificationsEmpty: 'No new notifications',
      notificationSchedulingTitle: 'Scheduling needs review',
      notificationSchedulingBody: 'Rush or QA replan waiting for accept',
      notificationQueueTitle: 'Queue updated',
      notificationQueueBody: 'Accepted plan — check new order and dates',
    },
    dataFeed: {
      title: 'Events come from data — not from this screen',
      body: 'Syngenta UC1: rush and QA replans trigger when SAP schedule data or LSV pass/fail rows update. Operators or Data API POST to BFF ingest; this UI polls the queue and shows notifications when a replan is pending.',
      sapPath: 'POST /demo/plant/ingest/sap-priority-change',
      passFailPath: 'POST /demo/plant/ingest/pass-fail-log',
      operatorDoc: 'Operator curl examples: docs/hackathon/uc1-demo-operator-ingest.md',
    },
    actions: {
      accept: 'Accept schedule',
      accepted: 'Accepted',
    },
    copilotTitle: 'AI Copilot — What changed',
    copilotIdle: 'When a replan lands from upstream data, open Scheduling to review the proposed order and explanation.',
    footerStats: '{count} active batches in queue (Pasco-style POs).',
    acceptedNote: 'Human acceptance logged (demo). No live ERP update.',
    apiNoteMsw:
      'Dev mocks: HTTP → MSW → same BFF paths as production. Set VITE_USE_MSW=false and VITE_API_BASE_APP when Mauricio’s core-api is live.',
    apiNoteLocal:
      'Static demo: in-process plantDemoServer (no HTTP). For local dev with mocks use .env.development (MSW).',
    apiNoteBff:
      'Live BFF (VITE_API_BASE_APP). Camilo Data + David Agent sit behind core-api — no frontend change when they ship.',
    salesChat: {
      eyebrow: 'Syngenta nice-to-have',
      title: 'Explain my batch (sales / customer service)',
      subtitle:
        'Ask why a PO is waiting, when it ships, or what would move it up — answers grounded in the current Line 1 queue (Agent API when live).',
      poLabel: 'Production order (PO)',
      quickPrompts: ['Why is it waiting?', 'When does it ship?', 'What would move it up?'],
      inputPlaceholder: 'Ask about this batch…',
      askButton: 'Ask',
      citationsLabel: 'Sources',
      agentNote:
        'Demo uses rule-based answers from queue facts. David: replace with Agent tool calls to Data API batch + queue context.',
    },
  },
  demoArchitecture: {
    eyebrow: 'Syngenta hackathon · Technical baseline',
    title: 'Demo architecture',
    subtitle:
      'One shared platform (React + BFF + Data + Agent), with two Syngenta briefs mapped below: UC1 Plant Capacity and UC4 R&D Unification.',
    scopeNote:
      'Document v1.3 · UC1 BFF contract matches /demo/plant/flow · Demo data only · Architecture PNGs are English in all locales.',
    docNote: 'Document version 1.3 · No live Syngenta production connections.',
    links: {
      plant: 'UC1 MVP (Line 1)',
      tour: 'UC1 guided tour',
      flow: 'UC1 UI ↔ API map',
      breeding: 'UC4 walkthrough',
    },
    useCasesTitle: 'Syngenta use cases this architecture supports',
    genAiRoleLabel: 'GenAI role',
    useCaseCards: [
      {
        id: 'UC1',
        name: 'Plant Capacity Utilization (Pasco)',
        problem:
          'Conditioning lines juggle many batches; rush orders and QA failures force manual replanning without clear explanations.',
        genAiRole:
          'After rush or QA replan: explain diff in plain language. Optional: “Explain my batch” Q&A (no queue change). Human accepts — no ERP write.',
      },
      {
        id: 'UC4',
        name: 'R&D Data Source Unification',
        problem:
          'Syngenta’s four mock source families (trials, operations, lab, germplasm/pedigree) sit in disconnected files; breeders need one answer with evidence.',
        genAiRole: 'NL chat + R/A/G triage grounded in Data API tool results; breeder override with audit trail.',
      },
    ],
    fieldLabels: {
      syngentaGoal: 'Syngenta success criteria (demo)',
      data: 'Hackathon data (repo)',
      demoRoute: 'GreenByte walkthrough',
    },
    groups: {
      shared: {
        title: 'Shared platform (both use cases)',
        intro:
          'Every flow starts the same: React calls only the BFF; ETL loads Excel or CSV into PostgreSQL; Agent never reads raw files at runtime — only Data API SQL.',
      },
      uc1: {
        title: 'UC1 — Plant capacity architecture',
        intro:
          'Operator ingest (SAP / pass-fail) → BFF replan → UI polls queue → Agent explains diff → scheduler accept.',
        syngentaGoal: 'Recommendations with explanations; human validates; no live SAP connection.',
        dataSource:
          'Pasco LSV/SSV conditioning Excel (schedules, SAP orders, conditioning logs, pass/fail logs).',
      },
      uc4: {
        title: 'UC4 — R&D unification architecture',
        intro:
          'Breeder asks in natural language → BFF forwards to Agent → read-only tools on Data API → triage + citations → optional override logged by BFF.',
        syngentaGoal: 'Unified view across sources; GenAI central; human in the loop with override audit.',
        dataSource:
          'Four Syngenta source families (trials incl. field obs, operations, lab, germplasm/pedigree) — five UC4 CSV files in the hackathon pack, keyed by TRIAL_GUID / MATERIAL_GUID.',
      },
    },
    teamTitle: 'Team responsibilities',
    teamIntro:
      'Ownership is split by layer; UC1 vs UC4 mainly changes which BFF routes and Agent endpoints you implement — not the container shape.',
    teamTable: {
      role: 'Role',
      owner: 'Owner',
      responsibility: 'Responsibility',
      useCases: 'UC1 / UC4 focus',
    },
    teamRows: [
      {
        role: 'Product UI + BFF',
        owner: 'Mauricio / GreenByte',
        responsibility: 'Single API contract to React; CORS; MSW mocks; override persistence',
        useCases:
          'UC1: /demo/plant/* queue, events, accept, reset, batches/explain · UC4: /demo/breeding/* ask, dossier, override',
      },
      {
        role: 'Data API',
        owner: 'Camilo',
        responsibility: 'ETL, schema, read-only tools, data quality',
        useCases: 'UC1: queue, replan, GET /batches/{po} (Agent tools) · UC4: trial, material, obs, lab, ops tools',
      },
      {
        role: 'Agent API',
        owner: 'David',
        responsibility: 'Chat, triage, explain; tool calls to Data API',
        useCases: 'UC1: explain-replan + batch explain (tools) · UC4: /chat, /triage with tool orchestration',
      },
    ],
    endpointsTitle: 'Illustrative endpoints (align BFF contract to chosen UC)',
    endpointTable: {
      layer: 'Layer',
      examples: 'Examples',
      purpose: 'Purpose in this use case',
    },
    uc1Endpoints: [
      {
        layer: 'BFF',
        examples:
          'GET .../queue · POST .../ingest/* · POST .../schedule/accept · POST .../batches/explain · POST .../reset',
        purpose: 'Syngenta triggers via ingest + explain batch + accept + demo reset',
      },
      {
        layer: 'Data API',
        examples: 'GET /lines/{id}/queue · POST /schedule/replan · GET /batches/{po}',
        purpose: 'Pasco seed data, heuristic reorder, batch context',
      },
      {
        layer: 'Agent API',
        examples: 'POST /explain-replan · POST /suggest-rank (optional)',
        purpose: 'NL explanation of schedule diff; optional rank suggestion validated by BFF',
      },
    ],
    uc4Endpoints: [
      {
        layer: 'BFF',
        examples: 'POST /demo/breeding/ask · GET /demo/breeding/materials/{guid}/dossier · POST .../override',
        purpose: 'NL ask, aggregated dossier panel, breeder override audit',
      },
      {
        layer: 'Data API',
        examples: 'GET /trials/{guid} · GET /materials/{guid}/pedigree · GET .../observations · GET .../operations',
        purpose: 'Read-only tools Agent calls (MCP-style over HTTP)',
      },
      {
        layer: 'Agent API',
        examples: 'POST /chat · POST /triage',
        purpose: 'Tool orchestration, R/A/G with reason lines grounded in retrieved JSON',
      },
    ],
    rulesTitle: 'Integration rules (day 1)',
    rules: [
      'Contract first: OpenAPI or shared JSON for BFF ↔ frontend and BFF ↔ Data/Agent.',
      'Parallel mocks: MSW mirrors BFF responses for offline demo.',
      'Read-only tools on Data API with limits and allowed filters.',
      'Agent grounding: LLM context from Data API JSON only; cite stable IDs.',
      'BFF timeouts and fallback if Agent is unavailable.',
    ],
    sections: {
      container: {
        title: 'Common container diagram',
        description: 'Frontend talks only to the BFF; Agent calls Data API for tools (MCP-style over HTTP).',
      },
      teamStack: {
        title: 'Team stack (who owns what)',
        description: 'Frontend and BFF in GreenByte; Data and Agent APIs as sibling services behind the BFF.',
      },
      uc1Flow: {
        title: 'UC1 — Plant capacity flow',
        description: 'Pasco conditioning: queue, events, replan, explain, human accept.',
      },
      uc1Sequence: {
        title: 'UC1 — Sequence (event + replan + explain)',
        description: 'Order of calls when upstream data triggers a rush or QA replan.',
      },
      uc4Flow: {
        title: 'UC4 — R&D unification flow',
        description: 'Unified CSVs, NL question, tools, triage, breeder override audit.',
      },
      uc4Sequence: {
        title: 'UC4 — Sequence (ask + tools)',
        description: 'BFF forwards chat; Agent retrieves facts before answering.',
      },
    },
    monolithTitle: 'Monolith vs distributed',
    monolithBody:
      'Judges may see a single “copilot” story. The team implements three services + BFF. Legacy single-box diagrams (everything in core-api) are logical only; physical deployment follows the container diagram above.',
  },
  demoBreeding: {
    eyebrow: 'Syngenta UC4 · R&D unification',
    title: 'Breeding intelligence — guided demo',
    subtitle:
      'Walk through how a breeder asks one question across Syngenta’s four unified mock sources (trials incl. field obs, operations, lab, germplasm/pedigree) — then keeps the final say. Demo CSVs only.',
    plainLanguage: {
      sectionTitle: 'The idea, in plain language',
      problemHeading: 'What problem are we solving?',
      problem:
        'Before a new variety reaches farmers, breeders test many candidates for years. Notes live in different spreadsheets, lab exports, and emails. Pulling one picture together can take weeks — and slows the whole pipeline.',
      analogyHeading: 'Think of it like…',
      analogy:
        'A doctor whose patient history is split across four folders (visits, labs, family history, care notes). You ask “Is this treatment working?” and want one answer backed by facts — not a guess.',
      walkthroughHeading: 'What you will see in the five steps below',
      walkthroughSteps: [
        'One workspace wired to all four Syngenta source families (five CSV files in the hackathon pack).',
        'You ask a normal question in the chat box.',
        'The assistant looks up facts from each source (it does not make up numbers).',
        'You see a traffic-light style recommendation with a short reason and evidence.',
        'You agree or push back — your choice is recorded.',
      ],
      tagline: 'In one line: “Should this candidate move forward — with all the papers in one place?”',
    },
    steps: [
      {
        title: '1. One place to start',
        plainLine:
          'Instead of chasing four disconnected source types, imagine one desk with everything linked.',
        body:
          'Trials (including field observations), field operations, lab results, and germplasm/pedigree — the same four families named in the Syngenta brief, loaded from the UC4 mock CSV set.',
        imageSrc: '/demo/uc4-breeding-baseline.png',
        imageAlt: 'Unified breeding workspace before a question',
      },
      {
        title: '2. Ask like a person, not like SQL',
        plainLine: 'You type a question the way you would ask a colleague across the table.',
        body: 'No need to remember internal codes in this story — the assistant’s job is to translate your question into lookups.',
        highlight: 'Example: “Which lines yielded well, stayed healthy, and share the same parents?”',
      },
      {
        title: '3. Look it up, then answer',
        plainLine: 'The AI pulls rows from the demo database and only then writes an answer.',
        body: 'That is how we avoid “hallucinations”: if a number is not in the retrieved data, it should not appear in the reply.',
        highlight: 'You should see references to where each fact came from.',
      },
      {
        title: '4. Recommendation you can challenge',
        plainLine: 'Green, amber, or red — plus one sentence why — and the evidence on the side.',
        body: 'Field notes, lab values, and pedigree sit together so you can spot-check the story before you trust it.',
        imageSrc: '/demo/uc4-rd-unification-wow.png',
        imageAlt: 'Candidate dossier with triage and chat citations',
      },
      {
        title: '5. You keep the final call',
        plainLine: 'Accept, tweak, or override. The system logs what you decided.',
        body: 'Breeding choices stay human. AI is a fast research assistant, not the boss.',
        highlight: 'Coming next in the build: live AI and data services (see Architecture page).',
      },
    ],
  },
  lang: {
    switchLabel: 'Language',
    en: 'EN',
    es: 'ES',
  },
  hero: {
    eyebrow: 'AgTech · Generative AI',
    title: 'The technologies tackling heat and drought',
    subtitle:
      'How can farmers protect their crops during soaring temperatures? GreenByte explores data-driven and AI-assisted answers — in partnership with Syngenta for the hackathon.',
    ctaDiscover: 'Discover GreenByte',
    ctaPrecision: 'Precision agriculture',
    ctaDemoPlant: 'UC1 Pasco demo',
    ctaDemoBreeding: 'UC4 breeding demo',
    ctaArchitecture: 'Architecture',
  },
  intro: {
    title: 'GreenByte',
    body: 'We deliver breakthroughs for farmers, in every field so they can meet the demands of modern agriculture. Through cutting-edge innovation — including generative AI — we help farmers grow resilient, healthy crops that can feed an increasing global population, while producing food in a way that helps improve our planet.',
  },
  discover: {
    title: 'Discover GreenByte',
    readMore: 'Read more',
    cards: [
      {
        title: 'How AI helps predict hybrid performance before planting',
        tag: 'Innovation',
      },
      {
        title: 'Predicting solutions for herbicide resistance',
        tag: 'Research',
      },
      {
        title: 'Top weeds impacting global food security',
        tag: 'Insights',
      },
      {
        title: 'Can biologicals reduce fertilizer dependency?',
        tag: 'Sustainability',
      },
      {
        title: 'Trialing the traits of tomorrow',
        tag: 'Seeds & traits',
      },
      {
        title: 'Inside the lab solving agriculture’s next problem',
        tag: 'Science',
      },
    ],
  },
  precision: {
    title: 'What is precision agriculture?',
    body1:
      'It is a farming approach that uses technology to monitor and manage field variability in crops.',
    body2:
      'Learn how it helps make agriculture more efficient, productive and sustainable — with GreenByte as the platform we are building during the hackathon.',
    learnMore: 'Learn more →',
    mapLabel: 'Field variability map',
  },
  news: {
    title: 'Media releases',
    items: [
      {
        date: 'Sep 2026',
        title: 'GreenByte launches AgTech hackathon collaboration with Syngenta',
      },
      {
        date: 'Sep 2026',
        title: 'Precision agriculture platform preview at greenbyte-ag.com',
      },
      {
        date: 'Coming soon',
        title: 'Generative AI assistant for field-level recommendations',
      },
    ],
  },
  sustainability: {
    title: 'Our sustainability priorities',
    body: 'Working with farmers, we believe agriculture can become a climate solution, regenerating soil and nature, while feeding the world. Our priorities set clear targets to reduce our environmental footprint.',
    cta: 'Explore priorities',
  },
  footer: {
    blurb:
      'Breakthroughs for farmers, in every field — powered by data and generative AI. Hackathon project in collaboration with Syngenta.',
    explore: 'Explore',
    about: 'About GreenByte',
    sustainability: 'Sustainability',
    contact: 'Contact',
    prioritiesTitle: 'Our priorities',
    prioritiesBody:
      'Regenerative agriculture, soil health, and resilient crops that feed a growing world — with a reduced environmental footprint.',
    copyright: 'GreenByte. Independent hackathon project.',
    disclaimer: 'Not affiliated with or endorsed by Syngenta. Industry partner for the hackathon.',
  },
};

export type Messages = typeof en;
