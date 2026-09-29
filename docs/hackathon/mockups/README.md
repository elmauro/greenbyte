# Hackathon UI mockups (UC1 & UC4)

Conceptual **wow-moment** screens for Syngenta use cases. Colors align with GreenByte (green `#009F3C`, navy `#36398E`). Fictional data only — not production UI.

| Use case | Baseline (EN) | Wow (EN) | Baseline (ES) | Wow (ES) |
| --- | --- | --- | --- | --- |
| **UC1 — Plant Capacity (Pasco)** | [uc1-plant-baseline.png](./uc1-plant-baseline.png) | [uc1-plant-capacity-wow.png](./uc1-plant-capacity-wow.png) | [es/uc1-plant-baseline.png](../frontend/public/demo/es/uc1-plant-baseline.png) | [es/uc1-plant-capacity-wow.png](../frontend/public/demo/es/uc1-plant-capacity-wow.png) |
| **UC4 — R&D Unification** | [uc4-breeding-baseline.png](./uc4-breeding-baseline.png) | [uc4-rd-unification-wow.png](./uc4-rd-unification-wow.png) | [es/uc4-breeding-baseline.png](../frontend/public/demo/es/uc4-breeding-baseline.png) | [es/uc4-rd-unification-wow.png](../frontend/public/demo/es/uc4-rd-unification-wow.png) |

Walkthrough pages pick **EN** or **ES** mockups from the locale switcher (`frontend/src/i18n`). **Architecture** diagram PNGs under `frontend/public/demo/architecture/` stay in English for both locales.

**Live walkthrough:** [https://greenbyte-ag.com/demo/plant](https://greenbyte-ag.com/demo/plant) and [https://greenbyte-ag.com/demo/breeding](https://greenbyte-ag.com/demo/breeding) (after deploy).

**Architecture diagrams:** [https://greenbyte-ag.com/demo/architecture](https://greenbyte-ag.com/demo/architecture)

## Intended routes (GreenByte frontend)

- UC1: `/demo/plant` — line queue, event injection, explain panel.
- UC4: `/demo/breeding` — chat, material dossier, override.

See [../syngenta-demo-architecture.md](../syngenta-demo-architecture.md) for BFF + Data API + Agent API integration.
