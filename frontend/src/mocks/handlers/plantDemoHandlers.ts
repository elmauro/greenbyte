import { http, HttpResponse } from 'msw';
import { PLANT_DEMO_LINE_ID, plantDemoServer } from '../../demo/plant/plantDemoServer';
import type { Locale } from '../../i18n';

function parseLocale(body: unknown): Locale {
  if (body && typeof body === 'object' && 'locale' in body) {
    const loc = (body as { locale: string }).locale;
    if (loc === 'es' || loc === 'en') return loc;
  }
  return 'en';
}

export const plantDemoHandlers = [
  http.get('*/demo/plant/lines/:lineId/queue', ({ params }) => {
    const lineId = String(params.lineId);
    try {
      return HttpResponse.json(plantDemoServer.getQueue(lineId));
    } catch {
      return HttpResponse.json({ message: 'Unknown line' }, { status: 404 });
    }
  }),

  http.post('*/demo/plant/ingest/pass-fail-log', async ({ request }) => {
    const body = (await request.json()) as { lineId?: string; locale?: Locale; passFail?: string };
    const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
    const locale = parseLocale(body);
    if (body.passFail !== 'Fail') {
      return HttpResponse.json({ message: 'Only passFail Fail triggers replan' }, { status: 400 });
    }
    try {
      return HttpResponse.json({
        ...plantDemoServer.applyEvent(lineId, 'qa_fail', locale),
        source: 'pass_fail_log',
      });
    } catch {
      return HttpResponse.json({ message: 'Unknown line' }, { status: 404 });
    }
  }),

  http.post('*/demo/plant/ingest/sap-priority-change', async ({ request }) => {
    const body = (await request.json()) as { lineId?: string; locale?: Locale };
    const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
    const locale = parseLocale(body);
    try {
      return HttpResponse.json({
        ...plantDemoServer.applyEvent(lineId, 'rush', locale),
        source: 'sap_priority_change',
      });
    } catch {
      return HttpResponse.json({ message: 'Unknown line' }, { status: 404 });
    }
  }),

  http.post('*/demo/plant/events', async ({ request }) => {
    const body = (await request.json()) as { type?: string; lineId?: string; locale?: Locale };
    const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
    const locale = parseLocale(body);
    if (body.type !== 'rush' && body.type !== 'qa_fail') {
      return HttpResponse.json({ message: 'Invalid event type' }, { status: 400 });
    }
    try {
      return HttpResponse.json(plantDemoServer.applyEvent(lineId, body.type, locale));
    } catch {
      return HttpResponse.json({ message: 'Unknown line' }, { status: 404 });
    }
  }),

  http.post('*/demo/plant/schedule/accept', async ({ request }) => {
    const body = (await request.json()) as { lineId?: string };
    const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
    try {
      return HttpResponse.json(plantDemoServer.accept(lineId));
    } catch {
      return HttpResponse.json({ message: 'Unknown line' }, { status: 404 });
    }
  }),

  http.post('*/demo/plant/reset', async ({ request }) => {
    const body = (await request.json()) as { lineId?: string };
    const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
    plantDemoServer.reset();
    try {
      return HttpResponse.json(plantDemoServer.getQueue(lineId));
    } catch {
      return HttpResponse.json({ message: 'Unknown line' }, { status: 404 });
    }
  }),

  http.post('*/demo/plant/batches/explain', async ({ request }) => {
    const body = (await request.json()) as { po?: string; question?: string; locale?: Locale };
    const locale = parseLocale(body);
    if (!body.po || !body.question) {
      return HttpResponse.json({ message: 'po and question required' }, { status: 400 });
    }
    try {
      return HttpResponse.json(plantDemoServer.explainBatch(body.po, body.question, locale));
    } catch {
      return HttpResponse.json({ message: 'Unknown batch' }, { status: 404 });
    }
  }),
];
