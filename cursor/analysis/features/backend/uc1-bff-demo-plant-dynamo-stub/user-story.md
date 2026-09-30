# User Story — UC1 BFF demo plant Dynamo stub

- Name: UC1 BFF demo plant Dynamo stub
- Ticket/story: GREENBYTE-003

## As a

Hackathon developer (Mauricio / full-stack)

## I want

UC1 `/demo/plant/*` routes deployed on AWS `core-api` with shared demo state in DynamoDB

## So that

Postman and the web app (`VITE_USE_MSW=false`) use the same BFF contract without MSW, and rush/QA events persist across requests.

## Acceptance criteria

- [x] Terraform creates `greenbyte-dev-demo-plant-state` with documented outputs.
- [x] Serverless `core-api` exposes all five UC1 plant routes matching MSW paths and status codes.
- [x] Lambda IAM can read/write the demo state table; CORS allows `greenbyte-ag.com` and localhost dev.
- [x] `POST /demo/plant/events` updates state; subsequent `GET .../queue` returns the same queue/planVersion (after apply/deploy).
- [x] Frontend polls queue when connected to live BFF so external Postman injects appear on `/demo/plant`.
- [x] Feature package validated (lint/tests/docs) per manifest.
