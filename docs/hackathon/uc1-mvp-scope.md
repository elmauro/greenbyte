# UC1 MVP scope — Syngenta hackathon (GreenByte)

**Status:** Team-selected use case  
**Persona:** Seed conditioning line scheduler (Pasco)  
**Product route:** `/demo/plant` (MVP UI) · `/demo/plant/tour` (guided narrative)  
**Architecture:** [syngenta-demo-architecture.md](./syngenta-demo-architecture.md) §7

---

## 1. Decision summary

GreenByte delivers **Use Case 1 — Plant Capacity Utilization** only for hackathon week.

| Option | Scope | Verdict |
| --- | --- | --- |
| A — Static demo | Fixed copy, no replan | Rejected (fails Syngenta demo-ready criteria) |
| **B — MVP (chosen)** | One line, queue + inject rush/QA + explained replan + human accept | **Build this** |
| C — Full plant | Multi-line Gantt, sales chat, manual drag-drop | Stretch / post-hackathon |

---

## 2. What Syngenta wants (from `2026_Use_Case_Briefs.pdf`)

- **Problem:** Manual run order; no visibility into which batch blocks a customer order; no record of why the plan changed.
- **Success:** Ranked conditioning schedule with a **stated reason per position**; live injection of **rush batch** or **failed QA**; re-sequence + **plain-language explanation**; human validates before the plan is final.
- **Constraints:** No live ERP; frame as **recommendation + explanation**, not an optimal solver bake-off; GenAI is central (explain/triage), not decorative text.
- **Out of scope:** Treatment/packing after conditioning, second facility, plant-floor sensors, harvest arrival prediction.
- **Stretch:** “Explain my batch” chat for sales (not MVP).

---

## 3. Business value (why B wins)

- Directly addresses **on-time customer shipments** and **line utilization** (changeover-aware sequencing).
- Trust: scheduler keeps control; system documents **why** the plan changed (audit + less stress).
- Demo narrative judges understand in one screen: **before → event → after + copilot**.

---

## 4. Explainability (non-negotiable)

| Layer | Responsibility |
| --- | --- |
| **Data API (Camilo)** | Heuristic replan; returns structured `moves[]` and rule-based `reasons[]` (priority, SAP finish, species/changeover, QA flags). |
| **Agent API (David)** | `POST /explain-replan`: NL summary + bullets **only** from structured diff/payload (no invented POs or dates). |
| **BFF (Mauricio)** | Orchestrates event → replan → explain; single JSON contract to React; timeouts/fallback if Agent down. |
| **UI** | Shows queue diff (highlight moved rows) + copilot panel; never a lone score without text. |

---

## 5. UX specification (MVP screen)

### 5.1 Flow

```text
[Calm queue] → [Inject: Rush | QA fail] → [Proposed queue + Copilot “What changed”] → [Accept plan]
```

### 5.2 Layout (matches wow mockup `uc1-plant-capacity-wow.png`)

1. **Header:** Pasco conditioning — Line 1; status badge (Calm / Event active).
2. **Alert bar** (after event): Syngenta-style injected event message.
3. **Queue table:** Position, PO, species, kg, scheduled finish, status; at-risk flag on near-due batches.
4. **Event actions (demo):** “Simulate rush batch” / “Simulate QA failure” (live inject for judges).
5. **Copilot panel:** Title “AI Copilot — What changed”; bullets (moves, changeover impact, customer window).
6. **Footer:** Batch count + **Accept schedule** (logs acceptance; no ERP write).

### 5.3 Guided tour

`/demo/plant/tour` keeps the five-step **story** for stakeholders; `/demo/plant` is the **build target** for the live product demo.

---

## 6. Application responses (BFF contract intent)

### `GET /demo/plant/lines/{lineId}/queue`

- `queue[]`: ranked rows with stable `po`, species, kg, finish, status, optional `reasonShort`, `atRisk`.

### `POST /demo/plant/events`

Body example: `{ "type": "rush" | "qa_fail", "po": "..." }`

Response:

- `queue[]` — new order  
- `diff.moves[]` — `{ po, fromPosition, toPosition }`  
- `diff.reasons[]` — machine-readable rule hits  
- `explanation.summary` — one sentence  
- `explanation.bullets[]` — copilot bullets  
- `impact` — optional (e.g. changeover hours saved, customer window)

### `POST /demo/plant/schedule/accept`

- `{ acceptedAt, lineId, planVersion }` for human-in-the-loop audit.

### `GET /demo/plant/batches/{po}/summary`

- Panel/detail stretch; optional for MVP if table columns suffice.

---

## 7. Data (Camilo)

Source (local, not in git):  
`Hackathon 2026 - Use Cases/.../UC1 - Plant Capacity Utilization/Pasco LSV and SSV Conditioning sheets and data.xlsx`

Seed priority sheets: line schedules, Excel SAP data, conditioning logs, LSV/SSV pass-fail logs.

MVP seeds **Line 1** only; expand lines post-hackathon.

---

## 8. Hackathon in / out

| In | Out |
| --- | --- |
| UC1 MVP UI + BFF routes | UC4 breeding product path (route may remain dormant) |
| ETL Pasco → PostgreSQL | Live SAP/ERP |
| Rush + QA inject | Multi-plant routing |
| Explain-replan Agent | Sales “explain my batch” chat |
| MSW mirrors BFF | Solver quality comparison |

---

## 9. Team checklist (day 1)

1. Agree OpenAPI for BFF paths above + sample JSON post-event.  
2. Camilo: seed + `GET queue`, `POST replan`.  
3. David: `explain-replan` from structured payload only.  
4. Mauricio: wire env URLs; replace frontend mock state with BFF calls.  
5. Demo script: calm queue → rush inject → read copilot → accept.

---

## References

- Syngenta briefs: `Hackathon 2026 - Use Cases/Shared - Hackathon 2026 - Use Cases/2026_Use_Case_Briefs.pdf`
- Integration architecture: [syngenta-demo-architecture.md](./syngenta-demo-architecture.md)
- Mockups: [mockups/README.md](./mockups/README.md)
