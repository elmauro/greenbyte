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
    steps: [
      {
        title: '1. The normal queue',
        plainLine: 'First we look at today’s list on Line 1 — who goes first, second, third.',
        body: 'Each row is a batch: crop type, weight, and when it must be finished. Everything is moving; nothing is flashing red yet.',
        imageSrc: '/demo/uc1-plant-baseline.png',
        imageAlt: 'Baseline Line 1 queue before any event',
      },
      {
        title: '2. A job that cannot wait much longer',
        plainLine: 'One order has a due date soon — if it keeps falling down the list, a grower may not get seed on time.',
        body: 'The app highlights batches tied to near-term commitments. You are not solving math yet; you are spotting who is at risk.',
        highlight: 'Example from demo data: sweet-corn batch, finish date 2026-07-06, high priority.',
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
        imageSrc: '/demo/uc1-plant-capacity-wow.png',
        imageAlt: 'After rush or QA event — replanned queue and AI copilot panel',
      },
      {
        title: '5. You sign off',
        plainLine: 'You accept the plan or adjust it yourself. Nothing is sent to live factory systems in this hackathon demo.',
        body: 'That keeps trust: software helps you decide faster, it does not auto-run the plant.',
        highlight: 'Coming next in the build: live hooks to our data and AI services (see Architecture page).',
      },
    ],
  },
  plantMvp: {
    eyebrow: 'Syngenta UC1 · Hackathon demo target',
    title: 'Pasco conditioning — Line 1',
    subtitle:
      'Interactive scheduling demo: ranked queue, live rush/QA inject, timeline + copilot explanation, human accept — same BFF contract as production (MSW or core-api).',
    demoTargetBadge: 'Demo target B+ · Aligns with Syngenta brief + GreenByte wow mockups.',
    links: {
      tour: 'Guided story (5 steps)',
      tourCta: 'Start with the 5-step story',
      architecture: 'Integration architecture',
      backMvp: 'Back to Line 1 demo',
    },
    lineTitle: 'Line 1 queue',
    lineSubtitle: 'Calm baseline — inject an event to replan (Syngenta demo-ready flow).',
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
    timelineTitle: 'Schedule timeline (simplified)',
    timelineSubtitle: 'Visual week strip after replan — full Gantt comes with Pasco ETL + Data API.',
    wowVisualTitle: 'Target UX reference',
    wowVisualSubtitle: 'Concept screen shown alongside the live queue after an event (mockup parity for judges).',
    wowVisualAlt: 'UC1 plant capacity wow mockup after rush event',
    actions: {
      rush: 'Simulate rush batch',
      qaFail: 'Simulate QA failure',
      reset: 'Reset queue',
      accept: 'Accept schedule',
      accepted: 'Accepted',
    },
    copilotTitle: 'AI Copilot — What changed',
    copilotIdle: 'Inject a rush batch or QA failure to see the proposed order and explanation.',
    footerStats: '{count} active batches in queue (Pasco-style POs).',
    acceptedNote: 'Human acceptance logged (demo). No live ERP update.',
    apiNoteLocal:
      'Using BFF-shaped API locally (plantDemoServer). Set VITE_API_BASE_APP to core-api when live; enable VITE_USE_MSW=true for MSW in dev.',
    apiNoteBff: 'Connected to BFF (VITE_API_BASE_APP). Agent explain-replan should replace templated bullets when David’s service is live.',
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
      'Document v1.2 · Demo data only (Pasco Excel, UC4 CSVs) · Architecture diagram PNGs are English in all locales; UC walkthrough mockups follow EN/ES locale.',
    docNote: 'Document version 1.2 · No live Syngenta production connections.',
    links: {
      plant: 'UC1 MVP (Line 1)',
      tour: 'UC1 guided tour',
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
        genAiRole: 'Explain schedule changes in plain language after Data API replan; human accepts — no auto-write to ERP.',
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
          'Scheduler UI for line queue → inject event (rush or QA fail) → Data API replan → Agent explains diff → human accept.',
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
        useCases: 'UC1: /demo/plant/* queue, events, accept · UC4: /demo/breeding/* ask, dossier, override',
      },
      {
        role: 'Data API',
        owner: 'Camilo',
        responsibility: 'ETL, schema, read-only tools, data quality',
        useCases: 'UC1: queue, replan, batch summary · UC4: trial, material, obs, lab, ops tools',
      },
      {
        role: 'Agent API',
        owner: 'David',
        responsibility: 'Chat, triage, explain; tool calls to Data API',
        useCases: 'UC1: explain-replan, optional suggest-rank · UC4: /chat, /triage with tool orchestration',
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
        examples: 'GET /demo/plant/lines/{lineId}/queue · POST /demo/plant/events · POST /demo/plant/schedule/accept',
        purpose: 'Queue UI, inject rush/QA event, human accept plan',
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
        description: 'Order of calls when a rush batch or QA failure is injected.',
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
