# Feature Manifest — UC1 BFF demo plant Dynamo stub

## Feature

- Name: UC1 BFF demo plant Dynamo stub
- Slug: uc1-bff-demo-plant-dynamo-stub
- Ticket/story: GREENBYTE-003
- Backlog ID: n/a
- Change type: feat
- Owner: greenbyte-hackathon
- Last updated: 2026-09-30
- Stack scope: full-stack

## Goal

- Deploy UC1 BFF stub on AWS with DynamoDB-backed demo state so MSW is optional for integration testing.

---

## Status

- User Story: done
- Analysis: done
- Implementation: done
- Testing: done
- Review: done
- Current stage: done

---

## SOURCE SCOPE

- Problem / opportunity status: clear
- Current behavior: UC1 only via MSW or in-process — evidence: `plantDemoApi.ts`
- Out of scope: Camilo replan HTTP, David Agent, Cognito on demo routes, WebSocket

---

## TARGET SCOPE

- Infrastructure: `infrastructure/dynamodb/demo-plant-state.tf`, `outputs.tf`, README
- Backend: `core-api` handlers, services, `serverless.common.yml`, tests
- Frontend: `PlantLineMvp.tsx` polling, `api-mocks-and-bff.md`
- Docs: `infrastructure/dynamodb/README.md`, UC1 checklist tick where applicable

---

## Validation plan

- Run tests: yes
- Backend tests: `cd backend && npm test`
- Infrastructure validate: `terraform validate` in `infrastructure/dynamodb`
- Manual checks:
  - After apply + deploy: Postman events then GET queue
  - Front with `VITE_USE_MSW=false` + API URL
- Extra commands:
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`

---

## Decisions

- Dynamo partition key `pk` = `LINE#line-1`
- Env `DEMO_PLANT_TABLE_NAME` = `greenbyte-${stage}-demo-plant-state`
