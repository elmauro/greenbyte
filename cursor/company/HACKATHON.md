# GreenByte — HatchWorks AI Hackathon (AgTech Edition)

Contexto del evento para orientar decisiones técnicas y de producto durante el hack week.

## Evento

| Campo | Valor |
| --- | --- |
| **Nombre** | HatchWorks AI Hackathon — AgTech Edition |
| **Hack week** | 28 sep – 1 oct 2026 |
| **Demo day** | 2 oct 2026 |
| **Equipo** | GreenByte (hasta 6 personas; solo permitido) |

## Requisitos del hackathon

1. **GenAI obligatorio** — el proyecto debe usar herramientas de IA generativa de forma central (no decorativa).
2. **Casos de uso reales** — orientados a AgTech; casos compartidos por Syngenta (Vegetable BU).
3. **Stack libre** — salvo GenAI, el resto es elección del equipo (este repo usa el preset enterprise del foundation template).
4. **Entorno propio** — cada equipo configura dev, APIs y datasets.

## Criterios de evaluación

1. Innovación y uso de GenAI (peso alto)
2. Calidad técnica
3. Viabilidad de negocio / producto
4. Demo y presentación

## IP y entrega

- HatchWorks retiene la IP del hackathon.
- El código se entrega a Syngenta al cierre del evento.
- Documentar decisiones en `cursor/analysis/` facilita el handoff.

## Partner: Syngenta

- Empresa con la que trabajamos en el hackathon (Vegetable BU / casos AgTech).
- **Aún no hay objetivo de producto definido** — la landing refleja tono AgTech corporativo.
- GreenByte **no es** Syngenta: sitio propio en **https://greenbyte-ag.com**, disclaimer en footer.

## Enfoque sugerido para GreenByte

- **Dominio:** `greenbyte-ag.com` (AWS: `infrastructure/web` + `docs/infrastructure/greenbyte-ag-domain.md`).
- **Web:** landing estilo portal AgTech (verde #009F3C, azul #36398E) desplegable en S3/CloudFront.
- **MVP demo:** landing en AWS primero; APIs y GenAI cuando se defina el reto del hackathon.

## Repositorio

- GitHub: [github.com/elmauro/greenbyte](https://github.com/elmauro/greenbyte)
- Rama principal: `master`

## Próximos pasos en el repo

1. Abrir `C:\Projects\greenbyte` como workspace en Cursor.
2. Leer `cursor/context-map.md` y `cursor/docs/AI-Project-Playbook.md`.
3. Registrar la primera story en `cursor/company/future-work/` (prefijo `GREENBYTE`).
4. `cd frontend && npm install && npm run dev` para la UI.
5. `cd backend && npm install` cuando toque integrar APIs.
