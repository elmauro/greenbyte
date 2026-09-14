# Prompt: Story Intake

Punto de entrada **conversacional** para crear features con el minimo de friccion. El agente **pregunta lo justo**, crea el paquete bajo `cursor/analysis/features/` y encadena el lifecycle.

## Cuando usarlo

- **Modo A — Story nueva:** "quiero un story para …" → paquete + lifecycle.
- **Modo B — Desde estudio:** "evalua gaps de X" (crear estudio) o "lee este estudio y saca stories".

**Automatiza (agente, sin script obligatorio):** carpetas, `user-story.md`, `feature-manifest.md`, filas en `STORY-REGISTRY` si existe backlog, encadenado a lifecycle.

**Recomendado (scripts):** `new-feature.mjs` registra ticket + STORY-LOG y imprime el bloque del orquestador. Luego `start-feature.mjs` y `sync-github-feature.mjs` — ver `cursor/scripts/README.md`.

---

## Prompt to paste in Cursor

```text
@cursor/prompts/feature/prompt-story-intake.md
@cursor/docs/AI-Project-Playbook.md
@cursor/docs/documentation-governance.md
@cursor/templates/user-story-template.md
@cursor/templates/feature-manifest-template.md
@cursor/templates/analysis-study-template.md
@cursor/analysis/studies/README.md

Task type: story intake
Mode: A (story nueva) | B (stories desde analisis)
Analysis ref (Modo B): <ruta estudio> | "crear"
Topic (Modo B crear): <que evaluar>

Reglas de interaccion:
- Pregunta SOLO lo que falte; usa defaults razonables y dilos.
- Feature name obligatorio; Feature slug kebab-case.
- Contexto minimo: ver Playbook "Context routing"; no leer repo entero.
- Tras intake Modo A, encadena prompt-feature-lifecycle.md salvo que el usuario solo quiera registrar.

── MODO A — STORY NUEVA
1) Reune (uno o dos campos a la vez):
   - Feature name (obligatorio)
   - Feature slug (obligatorio; kebab-case)
   - Area (opcional): backend | frontend | infrastructure | _core | product
   - Ticket/story: <id> | n/a
   - Backlog ID: FW-* | n/a — NO usar como Ticket/story
   - Stack scope: backend | frontend | infrastructure | full-stack
   - Implementar ahora? [default: crear paquete y preguntar]
2) Ruta:
   - Con area: cursor/analysis/features/<area>/<slug>/
   - Sin area: cursor/analysis/features/<slug>/
3) Crear user-story.md + feature-manifest.md (titulo = Feature name)
4) Si existe cursor/company/future-work/STORY-REGISTRY.md: anotar fila; no shipped
   Preferir: node cursor/scripts/new-feature.mjs --name "<Feature name>" --area <area> [--fw FW-*]
   Eso escribe STORY-LOG.md del area y el bloque copy-paste del orquestador.
5) Si Backlog ID = "crear": anadir FW-* en future-work/ con ITEM-TEMPLATE.md
6) Opcional: node cursor/scripts/start-feature.mjs --slug <slug>
7) Encadenar prompt-feature-lifecycle.md (o analysis-package si solo planificar)
8) Validation plan en manifest: Run tests yes/no segun stack (ver story-validation.md)

── MODO B — STORIES DESDE ESTUDIO
1) B1 (existe): leer Analysis ref (study.md)
   B2 (crear): producir cursor/analysis/studies/<study-slug>/study.md con analysis-study-template.md desde Topic; enlazar docs canonicos, no duplicar tablas largas
2) Tabla Candidate stories completa (Decision: implement | defer | confirm)
3) Mostrar preview al usuario: filas implement con slug, ticket, area propuestos
4) Tras OK: por cada fila implement repetir pasos Modo A (una a una salvo lote explicito)
5) Preguntar lifecycle de la mayor prioridad

Stop conditions:
- Falta Feature name o slug (Modo A)
- Modo B: sin Topic ni Analysis ref valido
- Usuario no aprobo preview de filas implement (Modo B)
- Origen comparison sin gap claro

Constraints:
- No implementar codigo en intake salvo peticion explicita
- No marcar shipped (fase close)
- Mantener diffs enfocados
```

---

## Ejemplos

**Modo A:**

```text
@cursor/prompts/feature/prompt-story-intake.md
Mode: A

Quiero un story: onboarding de clientes con invitacion por email.
```

**Modo B:**

```text
@cursor/prompts/feature/prompt-story-intake.md
Mode: B
Analysis ref: crear
Topic: Authentication gaps (MFA, session timeout, password policy)
```

---

## Related

- Context routing: `cursor/docs/AI-Project-Playbook.md`
- Context trace (optional): `cursor/docs/context-trace-matrix.md`
- Lifecycle: `prompt-feature-lifecycle.md`
- Study template: `cursor/templates/analysis-study-template.md`
- Backlog (optional): `cursor/company/future-work/STORY-REGISTRY.md`
