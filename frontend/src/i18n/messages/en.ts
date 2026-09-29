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
    demoPlant: 'Demo: Plant',
    demoBreeding: 'Demo: Breeding',
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
  },
  demoPlant: {
    eyebrow: 'Syngenta UC1 · Plant Capacity',
    title: 'Pasco conditioning — guided demo',
    subtitle:
      'Step-through of how a scheduler uses GreenByte to replan Line 1 when a rush batch lands. Mock data and concept UI — human validates every plan.',
    steps: [
      {
        title: '1. Baseline — stable Line 1 queue',
        body: 'The scheduler opens the plant view for Line 1. Batches are ranked with production orders (PO), species, kilograms, and SAP scheduled finish dates. The line is running; no alerts yet.',
        imageSrc: '/demo/uc1-plant-baseline.png',
        imageAlt: 'Baseline Line 1 queue before any event',
      },
      {
        title: '2. Spot the order at risk',
        body: 'The BFF loads open SAP orders from demo extracts. One batch shows a near-term finish date and elevated priority — if it slips in the queue, a customer delivery window may be missed.',
        highlight: 'Example: PO 1002307551 — SWCO, finish 2026-07-06, priority 2.',
      },
      {
        title: '3. Inject a rush batch (event)',
        body: 'Operations marks a new rush batch or a planner adds an urgent PO. The event is sent to the Data API; heuristics prepare a new run order (changeover rules by species and line history from Pasco logs).',
        highlight: 'Human-in-the-loop: the system recommends; the scheduler decides.',
      },
      {
        title: '4. Wow — replan with AI explanation',
        body: 'The queue reorders on screen. The Agent API returns plain-language reasons: which PO moved, why (SAP date, priority, avoided changeover time). This is the core hackathon moment for UC1.',
        imageSrc: '/demo/uc1-plant-capacity-wow.png',
        imageAlt: 'After rush event — replanned queue and AI copilot panel',
      },
      {
        title: '5. Accept the schedule',
        body: 'The scheduler reviews the explanation, accepts or adjusts manually, and the accepted plan is logged. No write-back to live SAP — demo only, aligned with Syngenta brief constraints.',
        highlight: 'Next build: live BFF wiring to Data + Agent APIs (see architecture doc).',
      },
    ],
  },
  demoBreeding: {
    eyebrow: 'Syngenta UC4 · R&D unification',
    title: 'Breeding intelligence — guided demo',
    subtitle:
      'Step-through of how a senior breeder asks one question across trials, field, lab, pedigree, and operations — then overrides the AI triage. Unified mock CSVs only.',
    steps: [
      {
        title: '1. Baseline — unified workspace',
        body: 'Today, trial, lab, and pedigree facts sit in separate spreadsheets. The demo hub shows five sources connected to one read-only Data API — the foundation for MCP-style tools.',
        imageSrc: '/demo/uc4-breeding-baseline.png',
        imageAlt: 'Unified breeding workspace before a question',
      },
      {
        title: '2. Ask in natural language',
        body: 'The breeder types a question in the chat. The BFF forwards it to the Agent API, which plans tool calls — never guessing IDs that were not retrieved from data.',
        highlight:
          'Example: “Which lines exceeded 45 t/ha with low disease score and shared pedigree?”',
      },
      {
        title: '3. Agent calls read-only tools',
        body: 'The agent invokes Data API endpoints: trial metadata, material pedigree, field and lab observations, operations. Facts are merged into a dossier with citations (TRIAL_GUID, MATERIAL_GUID, trait codes).',
        highlight: 'Grounding rule: answers must cite retrieved JSON fields.',
      },
      {
        title: '4. Wow — triage dossier (R / A / G)',
        body: 'The UI shows red, amber, or green advancement guidance with a one-line reason the breeder can challenge. Field, lab, and pedigree panels appear side by side — the “single pane” UC4 promises.',
        imageSrc: '/demo/uc4-rd-unification-wow.png',
        imageAlt: 'Candidate dossier with RAG triage and chat citations',
      },
      {
        title: '5. Breeder override (audit)',
        body: 'The breeder accepts, adjusts, or overrides the recommendation. The override is stored in the audit trail. Mandatory human final call per Syngenta UC4 non-negotiables.',
        highlight: 'Next build: live Agent + Data APIs and override persistence in BFF.',
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
    ctaDemoPlant: 'UC1 plant demo',
    ctaDemoBreeding: 'UC4 breeding demo',
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
