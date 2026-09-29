# GreenByte — Syngenta Hackathon Demo Architecture

**Document version:** 1.3  
**Date:** 2026-09-29  
**Team:** GreenByte (HatchWorks AI Hackathon — AgTech Edition)  
**Status:** Proposed baseline for UC1 (Plant Capacity) and UC4 (R&D Data Unification)

---

## 0. Use-case alignment (Syngenta briefs)

GreenByte prepares **two** hackathon candidates with **one** physical architecture. The same container (React → BFF → Data API + Agent API → PostgreSQL) applies to both; only **sources**, **BFF routes**, and **Agent responsibilities** change.

| Use case | Persona | Demo route | Primary data | GenAI moment | Human in the loop |
| --- | --- | --- | --- | --- | --- |
| **UC1** Plant Capacity (Pasco) | Scheduler / plant ops | `/demo/plant` | Pasco conditioning Excel | Explain replan after rush or QA event | Accept schedule (no ERP write) |
| **UC4** R&D Unification | Plant breeder | `/demo/breeding` | Five UC4 CSVs | NL ask + R/A/G triage via tools | Override recommendation + audit |

**Web page:** Sections mirror this table — shared platform, then UC1 block (flow + sequence + endpoints), then UC4 block. Live: [demo/architecture](https://greenbyte-ag.com/demo/architecture).

---

## 1. Purpose

This document describes the **integration architecture** for the Syngenta use-case demo:

- **Frontend** and **BFF** live in the GreenByte repository (`React` + `core-api` Serverless).
- **Data API** and **Agent API** may run on **separate platforms** (team specialization), exposed to the BFF via **HTTP/JSON**.
- **No live connections** to Syngenta production systems; all data comes from official hackathon extracts or synthetic files in the repo.

---

## 2. Acronyms and definitions

### 2.1 General and technical

| Acronym | Definition |
| --- | --- |
| **AgTech** | Agricultural technology; digital tools and data applied to farming and the seed supply chain. |
| **API** | Application Programming Interface; HTTP endpoints that exchange JSON (or agreed formats) between services. |
| **AWS** | Amazon Web Services; cloud platform used by the GreenByte preset (e.g. Lambda, API Gateway, S3). |
| **BFF** | Backend for Frontend; a dedicated API (`core-api`) that orchestrates calls to Data and Agent services and exposes one contract to React. |
| **CORS** | Cross-Origin Resource Sharing; browser rules for which APIs the frontend may call; avoided by routing through the BFF. |
| **CSV** | Comma-Separated Values; UC4 hackathon datasets (`trial_synthetic.csv`, etc.). |
| **ETL** | Extract, Transform, Load; one-time or batch jobs that load Excel/CSV into the demo database. |
| **GenAI** | Generative AI; LLM-based generation and reasoning (central hackathon requirement). |
| **GUID** | Globally Unique Identifier; stable keys in UC4 data (`TRIAL_GUID`, `MATERIAL_GUID`, `LOCATION_GUID`). |
| **HTTP/JSON** | Hypertext Transfer Protocol with JavaScript Object Notation payloads between services. |
| **LLM** | Large Language Model; model used by the Agent API for NL answers and explanations. |
| **MCP** | Model Context Protocol; pattern of giving an agent structured **tools** (here implemented as Data API HTTP calls). |
| **MSW** | Mock Service Worker; frontend mocks that mirror BFF responses for offline or fallback demo. |
| **NL** | Natural language; breeder or scheduler questions phrased in plain text. |
| **OpenAPI** | Machine-readable API specification (Swagger); shared contract for BFF and integrations. |
| **PG** | PostgreSQL; recommended demo relational database (diagram shorthand). |
| **RAG** | Retrieval-Augmented Generation; LLM answers grounded in retrieved facts from the Data API (not free-form guessing). |
| **RDS** | Amazon Relational Database Service; managed PostgreSQL in AWS (optional; often skipped during hackathon week). |
| **SQL** | Structured Query Language; queries executed by the Data API against PostgreSQL. |
| **SSM** | AWS Systems Manager Parameter Store; store for non-secret and secret config (preferred over committing keys). |
| **UC1** | Use Case 1 — Plant Capacity Utilization (Pasco conditioning plant scheduling). |
| **UC4** | Use Case 4 — R&D Data Source Unification (trials, pedigree, field/lab observations). |
| **UI** | User interface; React pages under `/demo/plant`, `/demo/breeding`, and `/demo/architecture`. |

### 2.2 Syngenta and business context

| Acronym | Definition |
| --- | --- |
| **BU** | Business Unit; Syngenta Vegetable Seeds BU for this hackathon. |
| **CRM** | Customer Relationship Management; commercial systems (out of scope for live connection). |
| **ERP** | Enterprise Resource Planning; e.g. SAP production orders in UC1 extracts (demo data only). |
| **PO** | Production Order; plant batch identifier (e.g. in Pasco schedules and logs). |
| **QA** | Quality Assurance; seed conditioning test outcomes (pass/fail logs in UC1). |
| **R&D** | Research and Development; breeding, trials, and advancement decisions (UC4). |
| **R / A / G** | Red, Amber, Green; triage recommendation levels for candidate lines (UC4 brief). |
| **SAP** | ERP system referenced in UC1 scheduling extracts (`Excel SAP data` sheet). |
| **SME** | Subject Matter Expert; Syngenta contacts listed per use case in the briefs. |

### 2.3 Pasco plant data (UC1)

| Acronym | Definition |
| --- | --- |
| **LSV** | Large Seed Vegetables; Pasco conditioning scope (e.g. sweet corn lines). |
| **SSV** | Small Seed Vegetables; Pasco conditioning scope (e.g. smaller-seed crops). |
| **Conditioning** | First processing stage after harvest: cleaning, sizing, and grading raw seed before treatment and packing. |

### 2.4 UC4 data concepts

| Term | Definition |
| --- | --- |
| **Trial** | A structured field or lab experiment (`trial_synthetic.csv`) with type such as yield, quality, or disease. |
| **Material** | A germplasm line or variety candidate (`germplasm_pedigree_synthetic.csv`). |
| **Pedigree** | Parental lineage and advancement history for a material. |
| **Observation** | Measured trait values from field (`observation_synthetic.csv`) or lab (`lab_observations_synthetic.csv`). |
| **Operation** | Field activity such as planting, harvest, or irrigation (`operations_synthetic.csv`). |
| **Dossier** | Aggregated UI view of one material’s trial, obs, lab, and pedigree facts. |

---

## 3. Hackathon constraints (from briefs)

| Constraint | Implication |
| --- | --- |
| GenAI is central | Agent API owns LLM orchestration; not decorative copy on static rules |
| Human in the loop | UI validates or overrides; audit trail where applicable |
| No production SAP/CRM/R&D systems | ETL from local Excel/CSV into demo database |
| Recommendations with explanations | BFF returns structured reasons, not opaque scores |

---

## 4. Team responsibilities (integration view)

| Role | Owner | Responsibility | UC1 / UC4 focus |
| --- | --- | --- | --- |
| **Product UI + BFF** | Mauricio / GreenByte frontend | Single API contract to React; CORS; MSW mocks; optional override persistence | UC1: `/demo/plant/*` · UC4: `/demo/breeding/*` |
| **Data API** | Camilo | ETL, schema, read-only query/tools endpoints, data quality | UC1: queue, replan, batch · UC4: trial, material, obs, lab, ops |
| **Agent API** | David | Chat, triage, explain, tool-use calling Data API URLs | UC1: explain-replan · UC4: chat + triage |

The **React app must not call Data or Agent APIs directly** in the demo environment (only the BFF), to simplify CORS, secrets, and fallback to MSW.

---

## 5. Common container diagram

```text
┌──────────────────────────────────────────────────────────────┐
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
                    └──────────────────────┘
```

### 5.1 GreenByte stack (existing preset)

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind, MSW, axios |
| BFF | AWS Lambda, API Gateway, Node.js 20 (`core-api`) |
| Shared | `layer-transversal` (consistent JSON responses) |
| Secrets | SSM / Secrets Manager (no keys in repo) |
| Region | `us-east-1` |

### 5.2 Recommended demo data store

- **PostgreSQL** (local Docker under `local-dev/` or team-hosted) with seed scripts under `backend/database/`.
- RDS is optional for hackathon week; cost and setup time may be prohibitive.
- Agent **must not** read raw CSV/Excel at runtime in production demo path; only **Data API** reads the database.

---

## 6. Integration rules (day 1)

1. **Contract first:** OpenAPI or shared JSON examples for BFF ↔ frontend and BFF ↔ Data/Agent.
2. **Parallel mocks:** MSW handlers mirror BFF responses for offline demo.
3. **Read-only tools:** Data API exposes parameterized queries (limits, allowed filters).
4. **Agent grounding:** LLM context built from Data API JSON only; citations reference stable IDs (`PO Number`, `MATERIAL_GUID`, etc.).
5. **Timeouts and fallback:** BFF degrades gracefully (cached queue or scripted answer) if Agent is unavailable.

---

## 7. Use Case 1 — Plant Capacity Utilization (Pasco)

### 7.1 Business flow

1. Scheduler views **line queue** (batches, priority, due dates).
2. **Event** injected: rush batch or failed QA.
3. **Replan** updates order (heuristics in Data API or BFF).
4. **Agent** explains what changed in plain language.
5. Human **accepts** the recommendation (no auto-write to ERP).

### 7.2 Architecture flow

```text
Excel Pasco ──► ETL seed ──► PostgreSQL demo

React Plant Demo ──► BFF (core-api)
                         ├──► Data API ──► PG (queue, logs, SAP orders, pass/fail)
                         └──► Agent API ──► Data API (context)
                                              └──► explain / optional suggest (validated)

UI ── inject event ──► BFF ──► Data API (replan) ──► Agent (explain) ──► UI
```

### 7.3 Suggested endpoints (illustrative)

**BFF (frontend contract)**

| Method | Path | Description |
| --- | --- | --- |
| GET | `/demo/plant/lines/{lineId}/queue` | Current ranked queue |
| POST | `/demo/plant/events` | Rush batch or QA failure |
| POST | `/demo/plant/schedule/accept` | Human accepts plan |
| GET | `/demo/plant/batches/{po}/summary` | Batch context for panel |

**Data API (Camilo)**

| Method | Path | Description |
| --- | --- | --- |
| GET | `/lines/{id}/queue` | Queue from seeded Pasco data |
| POST | `/schedule/replan` | Heuristic reorder after event |
| GET | `/batches/{po}` | Species, kg, history, QA flags |

**Agent API (David)**

| Method | Path | Description |
| --- | --- | --- |
| POST | `/explain-replan` | Natural-language diff given structured payload |
| POST | `/suggest-rank` | Optional; BFF validates against rules |

### 7.4 Data sources (repo)

`Hackathon 2026 - Use Cases/.../UC1 - Plant Capacity Utilization/Pasco LSV and SSV Conditioning sheets and data.xlsx`

Key sheets: line schedules, SAP orders, conditioning logs, pass/fail logs.

---

## 8. Use Case 4 — R&D Data Source Unification

### 8.1 Business flow

1. Breeder asks a **natural-language question** across trials, field obs, lab, pedigree, operations.
2. **Agent** calls **read-only tools** on Data API (MCP-style over HTTP).
3. System returns **red / amber / green** triage with **stated reasons**.
4. Breeder **overrides**; override is **logged** (BFF or Data API).

### 8.2 Architecture flow

```text
5 CSVs UC4 ──► ETL seed ──► PostgreSQL demo

React Breeding Demo ──► BFF
                           ├──► Data API (tools: trial, material, obs, lab, ops)
                           └──► Agent API ──► Data API (tool calls)
                                                └──► triage + NL answer ──► BFF ──► UI

UI ── override ──► BFF ──► audit store
```

### 8.3 Suggested endpoints (illustrative)

**BFF**

| Method | Path | Description |
| --- | --- | --- |
| POST | `/demo/breeding/ask` | NL question → answer + citations + RAG |
| GET | `/demo/breeding/materials/{guid}/dossier` | Aggregated view for UI |
| POST | `/demo/breeding/recommendations/{id}/override` | Human override + audit |

**Data API (tools, read-only)**

| Method | Path | Description |
| --- | --- | --- |
| GET | `/trials/{trialGuid}` | Trial metadata |
| GET | `/materials/{materialGuid}/pedigree` | Pedigree and advancement |
| GET | `/materials/{materialGuid}/observations` | Field + lab obs |
| GET | `/trials/{trialGuid}/operations` | Field operations |

**Agent API**

| Method | Path | Description |
| --- | --- | --- |
| POST | `/chat` | Orchestrates tool calls to Data API |
| POST | `/triage` | R/A/G with reason lines |

### 8.4 Data sources (repo)

`Hackathon 2026 - Use Cases/.../UC4 - R&D Data Source Unification/*.csv`

Relational keys: `TRIAL_GUID`, `MATERIAL_GUID`, `LOCATION_GUID`.

---

## 9. Sequence — UC4 (ask + tools)

```text
React          BFF           Agent API      Data API       PostgreSQL
  |              |               |              |              |
  |-- ask ------>|               |              |              |
  |              |-- forward --->|              |              |
  |              |               |-- GET tool ->|              |
  |              |               |              |--- SQL ----->|
  |              |               |              |<-- rows -----|
  |              |               |<-- JSON -----|              |
  |              |<-- answer ----|              |              |
  |<-- dossier --|               |              |              |
```

---

## 10. Sequence — UC1 (event + replan + explain)

```text
React          BFF           Data API       Agent API      PostgreSQL
  |              |               |              |              |
  |-- event ---->|               |              |              |
  |              |-- replan ---->|              |              |
  |              |               |--- update -->|              |
  |              |               |<-- new queue-|              |
  |              |-- explain ------------------->|              |
  |              |               |<-- context --| (via Data)   |
  |              |<-- text ------|              |              |
  |<-- queue + why               |              |              |
```

---

## 11. Monolith vs distributed (documentation levels)

| Audience | Diagram |
| --- | --- |
| Judges / business | Single “copilot over demo data” story is enough |
| Team execution | **Three services + BFF** (this document) |
| Handoff to Syngenta | OpenAPI for BFF + list of Data/Agent base URLs per environment |

Legacy single-box diagrams (everything inside `core-api`) remain valid as **logical** view; **physical** deployment follows Section 5.

---

## 12. Generic template (either use case)

```text
Sources (Excel or CSV) --> ETL --> PostgreSQL demo
React GreenByte --> BFF core-api --> Data API --> PG
                              \--> Agent API --> Data API
                              --> UI
```

Replace **Sources** and **React** route name (`/demo/plant` vs `/demo/breeding`) per selected use case.

---

## 13. Next steps in the repo

1. Choose UC1 or UC4 and register a feature story under `cursor/analysis/features/`.
2. Publish BFF OpenAPI under `backend/docs/api/`.
3. Add MSW handlers matching BFF contracts in `frontend/src/mocks/`.
4. Implement seed scripts from hackathon data paths.
5. Wire environment variables for Data and Agent base URLs in BFF config only.

---

## 14. Web architecture page

Live page structure (aligned with Sections 0, 7, and 8):

1. **Use-case cards** — UC1 vs UC4 problem and GenAI role (Syngenta brief language).
2. **Team table** — same ownership as Section 4, with a UC1/UC4 column.
3. **Shared platform** — container + team stack PNGs (Section 5).
4. **UC1 section** — Pasco goal, data path, flow + sequence PNGs, endpoint table (Section 7.3).
5. **UC4 section** — R&D goal, CSV sources, flow + sequence PNGs, endpoint table (Section 8.3).

URL: [https://greenbyte-ag.com/demo/architecture](https://greenbyte-ag.com/demo/architecture). Assets: `frontend/public/demo/architecture/`. This markdown keeps ASCII copies for PDF and offline reference.

---

## 15. UI mockups (wow moment)

| Use case | Mockup |
| --- | --- |
| UC1 — Plant Capacity | [mockups/uc1-plant-capacity-wow.png](./mockups/uc1-plant-capacity-wow.png) |
| UC4 — R&D Unification | [mockups/uc4-rd-unification-wow.png](./mockups/uc4-rd-unification-wow.png) |

See [mockups/README.md](./mockups/README.md) for scene description and target routes.

---

## References

- `cursor/company/HACKATHON.md` — event rules and evaluation criteria
- `docs/architecture.md` — GreenByte preset overview
- `Hackathon 2026 - Use Cases/.../2026_Use_Case_Briefs.pdf` — Syngenta success criteria
- `project.config.json` — stack and region metadata
