# UC1 plant UI — BFF, Data API, and Agent

The React app talks **only** to **core-api** (`plantDemoApi` → `/demo/plant/*`). Camilo (Data API) and David (Agent API) sit behind the BFF; the UI must not hardcode their URLs or assume fixed demo POs when live responses are available.

**MSW and in-process `plantDemoServer` simulate the BFF contract.** The deployed BFF simulates Camilo/David internally (`dataApiClient`, `agentApiClient`) using the same routes documented for the real services — see [uc1-bff-data-agent-route-map.md](../../../docs/hackathon/uc1-bff-data-agent-route-map.md).

## Pending replan contract (`GET /demo/plant/lines/{lineId}/queue`)

When `lastEvent` is set and the planner has not accepted the current `planVersion`, the BFF may include:

| Field | Source (target) | UI use |
| --- | --- | --- |
| `queue` | Data API / persisted state | Tables, Gantt, KPIs |
| `lastEvent` | `rush` \| `qa_fail` | Badges, accept flow |
| `pendingExplanation` | Agent API | Copilot panel, alert banner — **preferred over local copy** |
| `pendingDiff` | Data API + plan diff | Highlight PO on schedule (`moves[0].po`, HOLD row) |

`usePlantDemoQueue` applies this snapshot on load and on poll (MSW + live BFF). If `pendingExplanation` is missing, it falls back to `getPlantEventExplanation` (in-process demo only).

## Ingest (operators / Data API simulation)

| Route | Body | UI client |
| --- | --- | --- |
| `POST .../ingest/sap-priority-change` | `{ po?, priority?, scheduledFinish?, locale?, lineId? }` | `plantDemoApi.postIngestSapPriorityChange(locale, lineId, overrides)` |
| `POST .../ingest/pass-fail-log` | `{ po?, passFail: 'Fail', failedFor?, equipmentId?, locale?, lineId? }` | `plantDemoApi.postIngestPassFailLog(locale, lineId, overrides)` |

Defaults use Pasco anchor POs (`DEFAULT_DEMO_RUSH_PO`, `DEFAULT_DEMO_QA_FAIL_PO` in `plantEventUtils.ts`). BFF validates that `po` exists in the active queue; any queue row may be used for expanded demos.

## Highlight PO helper

`primaryPoFromPending(eventType, pendingDiff, queue)` in `src/demo/plant/plantEventUtils.ts` drives `eventHighlightPo` on `PlantBaselineDashboard` / Gantt. Do not hardcode rush POs in components.

## Wiring Agent explanations (BFF follow-up)

When the BFF calls the Agent on ingest, persist `explanation` and `diff` on demo state and return them on GET queue as `pendingExplanation` / `pendingDiff`. The frontend is already wired to consume those fields.

## Related docs

- [api-mocks-and-bff.md](./api-mocks-and-bff.md) — MSW vs live BFF env
- [UC1-SYNGENTA-DEMO-CONTEXT.md](../../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md) — full route list
- [uc1-demo-operator-ingest.md](../../../docs/hackathon/uc1-demo-operator-ingest.md) — operator curl examples
