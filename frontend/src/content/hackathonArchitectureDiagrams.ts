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

  uc1Flow: `Excel Pasco ──► ETL seed ──► PostgreSQL
                              gold.replan / gold.accept_plan

React Plant Demo ──► BFF (core-api) ──► PostgreSQL
                         └──► Agent POST /explain-replan
                               diff + queueSnapshot (no rank, no DB read)

Operator ── ingest ──► BFF ──► gold.replan ──► explain ──► UI polls queue`,

  sequenceUc1: `Operator       React         BFF            PostgreSQL      Agent
  |              |              |                |              |
  |-- ingest ------------------>|                |              |
  |              |              |-- gold.replan >|              |
  |              |              |<- queue + diff |              |
  |              |              |-- explain-replan ----------->|
  |              |              |<- summary ------------------|
  |              |-- GET queue >|                |              |
  |              |<- plan + why |                |              |
  |              |-- accept --->|-- accept_plan >|              |`,
} as const;

export type HackathonDiagramKey = keyof typeof hackathonArchitectureDiagrams;
