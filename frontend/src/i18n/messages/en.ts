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
      'Walk through what happens when an urgent seed batch shows up at the plant. Concept screens and demo data — a person always approves the plan.',
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
        'An urgent batch arrives — time to propose a new order.',
        'The list updates on screen and the assistant explains why in everyday words.',
        'The planner says yes (or tweaks it) — AI suggests, humans decide.',
      ],
      tagline: 'In one line: “Which batch runs next when something urgent lands?”',
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
        title: '3. Something urgent lands',
        plainLine: 'Operations calls: “We need this batch moved up.” The system drafts a new order — respecting rules like cleanup time between crop types.',
        body: 'This step is the trigger. Real plants use history (how long prep and run take) so suggestions are grounded in past runs, not guesswork.',
        highlight: 'Important: the tool recommends; the planner stays in charge.',
      },
      {
        title: '4. New order + plain explanation',
        plainLine: 'This is the “aha” moment: the queue changes and you read why in normal language.',
        body: 'For example: “Moved batch A ahead of batch B because its due date is sooner and both are the same crop on the same line — so we avoided extra machine cleanup.”',
        imageSrc: '/demo/uc1-plant-capacity-wow.png',
        imageAlt: 'After rush event — replanned queue and AI copilot panel',
      },
      {
        title: '5. You sign off',
        plainLine: 'You accept the plan or adjust it yourself. Nothing is sent to live factory systems in this hackathon demo.',
        body: 'That keeps trust: software helps you decide faster, it does not auto-run the plant.',
        highlight: 'Coming next in the build: live hooks to our data and AI services (see Architecture page).',
      },
    ],
  },
  demoArchitecture: {
    eyebrow: 'Syngenta hackathon · Technical baseline',
    title: 'Demo architecture',
    subtitle:
      'Integration view for GreenByte: React and BFF in this repo; Data API and Agent API as separate HTTP services. Same diagrams as docs/hackathon/syngenta-demo-architecture.md.',
    docNote: 'Document version 1.2 · No live Syngenta production connections.',
    links: {
      plant: 'UC1 walkthrough',
      breeding: 'UC4 walkthrough',
    },
    teamTitle: 'Team responsibilities',
    teamTable: {
      role: 'Role',
      owner: 'Owner',
      responsibility: 'Responsibility',
    },
    teamRows: [
      {
        role: 'Product UI + BFF',
        owner: 'Mauricio / GreenByte',
        responsibility: 'Single API contract to React; CORS; MSW mocks; override persistence',
      },
      {
        role: 'Data API',
        owner: 'Camilo',
        responsibility: 'ETL, schema, read-only tools, data quality',
      },
      {
        role: 'Agent API',
        owner: 'David',
        responsibility: 'Chat, triage, explain; tool calls to Data API',
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
      generic: {
        title: 'Generic template (UC1 or UC4)',
        description: 'Replace sources (Excel vs CSV) and route (/demo/plant vs /demo/breeding).',
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
      'Walk through how a plant breeder asks one question and gets an answer pulled from field, lab, and family-tree data — then keeps the final say. Demo CSVs only.',
    plainLanguage: {
      sectionTitle: 'The idea, in plain language',
      problemHeading: 'What problem are we solving?',
      problem:
        'Before a new variety reaches farmers, breeders test many candidates for years. Notes live in different spreadsheets, lab exports, and emails. Pulling one picture together can take weeks — and slows the whole pipeline.',
      analogyHeading: 'Think of it like…',
      analogy:
        'A doctor whose patient history is split across five folders. You ask “Is this treatment working?” and want one answer backed by labs, visits, and family history — not a guess.',
      walkthroughHeading: 'What you will see in the five steps below',
      walkthroughSteps: [
        'A single workspace that can reach all the demo data sources.',
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
        plainLine: 'Instead of five disconnected files, imagine one desk with everything linked.',
        body: 'Trials, field measurements, lab results, plant family tree, and field activities — all reachable from the same demo hub.',
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
