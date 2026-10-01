# Data model

Data model and data integration docs for the GreenByte Data API (UC1 Plant Capacity Utilization, Pasco conditioning).

| Document | What it covers |
| --- | --- |
| [uc1-data-model.md](./uc1-data-model.md) | Model as built: sources, entities, `raw` → `silver` → `gold` medallion, ER diagram, keys, Data API mapping, heuristic, open questions |
| [uc1-open-questions.md](./uc1-open-questions.md) | Consolidated questions for Syngenta (SQ-01…SQ-34) with evidence, current assumption and impact |
| [csv-to-raw-integration.md](./csv-to-raw-integration.md) | What is built: Excel → CSV → `raw` pipeline, verification, naming, data types, null rules, takeaways |
| [observations.md](../../Hackathon%202026%20-%20Use%20Cases/Hackathon%202026-UseCases/UC1%20-%20Plant%20Capacity%20Utilization/data_sources/observations.md) | Source-level detail next to the CSVs: column-by-column source-to-target mapping, key tests, standardization rules, data quality catalog |

Code lives in [`backend/database/`](../database/README.md): `etl/load_raw.py` (raw) and `etl/build_model.py` (silver + gold, reconciliation, demo scenario).
