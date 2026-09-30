# Test Checklist — UC1 BFF demo plant Dynamo stub

## Feature

- Name: UC1 BFF demo plant Dynamo stub
- Slug: uc1-bff-demo-plant-dynamo-stub
- Ticket/story: GREENBYTE-003
- Tester: agent
- Date: 2026-09-29
- Environment: local

---

## Automated Checks

- Backend:
  - [x] `cd backend && npm test` — pass (2026-09-29)
- Infrastructure:
  - [x] `terraform validate` in `infrastructure/dynamodb` — pass (2026-09-29)
- Frontend:
  - [x] `cd frontend && npm run lint` — pass (2026-09-29)
  - [x] `cd frontend && npm run build` — pass (2026-09-29)

---

## Manual (after AWS apply + deploy)

- [ ] `GET {base}/demo/plant/lines/line-1/queue` → 200 baseline
- [ ] `POST {base}/demo/plant/events` rush → 200, planVersion increments
- [ ] `GET queue` → matches rush response
- [ ] `POST reset` → baseline restored
- [ ] Browser `/demo/plant` with live BFF shows Postman inject within poll interval

---

## Review

Review: **pass**

- Stub logic aligned with `plantDemoServer`; Dynamo state repository; CORS/IAM in Serverless.
- Manual AWS smoke left to team after `terraform apply` + `deploy-backend.sh dev`.

---
