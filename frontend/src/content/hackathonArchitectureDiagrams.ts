/** ASCII architecture diagrams — shared with docs/hackathon/syngenta-demo-architecture.md */

export const hackathonArchitectureDiagrams = {
  container: `┌──────────────────────────────────────────────────────────────┐
│  GreenByte (repo)                                             │
│  ┌─────────────┐         ┌─────────────────────────────────┐ │
│  │ React /demo │ ──────► │ core-api = BFF (orchestration)   │ │
│  └─────────────┘         │  • one contract for the frontend │ │
│                          │  • MSW uses same shapes          │ │
│                          └───────────┬───────────┬─────────┘ │
└──────────────────────────────────────┼───────────┼─────────┘
                                       │           │
                              HTTP/JSON│           │HTTP/JSON
                                       ▼           ▼
                    ┌──────────────────────┐  ┌──────────────────────┐
                    │  Data API (Camilo)   │  │ Agent API (David)    │
                    │  ETL, SQL, read-only │  │ NL, triage, explain  │
                    └──────────┬───────────┘  └──────────┬───────────┘
                               │                         │
                               ▼                         │ tool HTTP
                    ┌──────────────────────┐             │
                    │  PostgreSQL (demo)   │◄────────────┘
                    │  or agreed store     │
                    └──────────────────────┘`,

  genericTemplate: `Sources (Excel or CSV) --> ETL --> PostgreSQL demo
React GreenByte --> BFF core-api --> Data API --> PG
                              \\--> Agent API --> Data API
                              --> UI`,

  uc1Flow: `Excel Pasco ──► ETL seed ──► PostgreSQL demo

React Plant Demo ──► BFF (core-api)
                         ├──► Data API ──► PG (queue, logs, SAP orders, pass/fail)
                         └──► Agent API ──► Data API (context)
                                              └──► explain / optional suggest (validated)

UI ── inject event ──► BFF ──► Data API (replan) ──► Agent (explain) ──► UI`,

  uc4Flow: `5 CSVs UC4 ──► ETL seed ──► PostgreSQL demo

React Breeding Demo ──► BFF
                           ├──► Data API (tools: trial, material, obs, lab, ops)
                           └──► Agent API ──► Data API (tool calls)
                                                └──► triage + NL answer ──► BFF ──► UI

UI ── override ──► BFF ──► audit store`,

  sequenceUc4: `React          BFF           Agent API      Data API       PostgreSQL
  |              |               |              |              |
  |-- ask ------>|               |              |              |
  |              |-- forward --->|              |              |
  |              |               |-- GET tool ->|              |
  |              |               |              |--- SQL ----->|
  |              |               |              |<-- rows -----|
  |              |               |<-- JSON -----|              |
  |              |<-- answer ----|              |              |
  |<-- dossier --|               |              |              |`,

  sequenceUc1: `React          BFF           Data API       Agent API      PostgreSQL
  |              |               |              |              |
  |-- event ---->|               |              |              |
  |              |-- replan ---->|              |              |
  |              |               |--- update -->|              |
  |              |               |<-- new queue-|              |
  |              |-- explain ------------------->|              |
  |              |               |<-- context --| (via Data)   |
  |              |<-- text ------|              |              |
  |<-- queue + why               |              |              |`,
} as const;

export type HackathonDiagramKey = keyof typeof hackathonArchitectureDiagrams;
