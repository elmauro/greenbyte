/** Mermaid sources — aligned with docs/hackathon distributed architecture diagrams */

export const hackathonArchitectureMermaid = {
  container: `flowchart TB
  subgraph gb["GreenByte (Mauricio + frontend React)"]
    react["React /demo"]
    bff["core-api = BFF (orchestration)<br/>• one contract for the frontend<br/>• override / audit optional<br/>• MSW same contract"]
    react --> bff
  end
  bff -->|"HTTP/JSON"| data["API Datos (Camilo)<br/>ETL · SQL · read-only tools"]
  bff -->|"HTTP/JSON"| agent["API Agente (David)<br/>chat · triage · explain"]
  data --> pg[("PostgreSQL demo")]
  agent -->|"tool HTTP"| data
  agent -.-> pg`,

  teamStack: `flowchart TB
  react["React (GreenByte frontend)"]
  bff["Mauricio → greenbyte core-api<br/>(BFF · orchestration · auth · single contract)"]
  data["API Datos (Camilo)<br/>ingest · queries · views · quality"]
  agent["API Agente (David)<br/>chat · tools · triage · explain"]
  react --> bff
  bff --> data
  bff --> agent`,

  uc1Flow: `flowchart LR
  excel["Excel Pasco"] --> etl["ETL seed"]
  etl --> pg[("PostgreSQL demo")]
  ui["React Plant Demo"] --> bff["core-api BFF GreenByte"]
  ui -->|"inject event"| bff
  bff --> data["API Datos Camilo"]
  bff --> agent["API Agente David<br/>GenAI explain"]
  agent --> data
  data --> pg
  data --> replan["Replan heuristics"]
  replan --> pg`,

  uc4Flow: `flowchart LR
  csvs["5 CSVs UC4"] --> etl["ETL seed"]
  etl --> pg[("PostgreSQL demo")]
  ui["React Breeding Demo"] --> bff["core-api BFF GreenByte"]
  ui -->|"NL question"| bff
  ui -->|"override"| bff
  bff --> data["API Datos Camilo<br/>read-only tools"]
  bff --> agent["API Agente David"]
  agent -->|"triage · RAG rules"| bff
  agent --> data
  data --> pg
  bff -->|"audit log"| pg`,

  sequenceUc1: `sequenceDiagram
  participant UI as React Plant Demo
  participant BFF as core-api BFF
  participant Data as API Datos Camilo
  participant Agent as API Agente David
  participant PG as PostgreSQL
  UI->>BFF: GET queue line-1
  BFF->>Data: GET /lines/1/queue
  Data->>PG: query
  Data-->>BFF: queue JSON
  BFF-->>UI: queue
  UI->>BFF: POST event rush-batch
  BFF->>Data: replan heuristics or GET context
  BFF->>Agent: POST /explain diff + rules
  Agent->>Data: optional metrics
  Agent-->>BFF: plain-language explanation
  BFF-->>UI: new queue + reasons`,

  sequenceUc4: `sequenceDiagram
  participant UI as React GreenByte
  participant BFF as core-api BFF Mauricio
  participant Agent as API Agente David
  participant Data as API Datos Camilo
  participant PG as PostgreSQL demo
  UI->>BFF: POST /demo/breeding/ask
  BFF->>Agent: forward question + session
  Agent->>Data: GET material / trial / obs
  Data->>PG: SQL read-only
  PG-->>Data: rows
  Data-->>Agent: JSON facts
  Agent-->>BFF: answer + RAG + citations
  BFF-->>UI: unified response
  UI->>BFF: POST override
  BFF->>PG: audit log optional`,
} as const;

export type HackathonMermaidKey = keyof typeof hackathonArchitectureMermaid;
