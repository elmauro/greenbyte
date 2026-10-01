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
    const body = (await request.json()) as {
      lineId?: string;
      locale?: Locale;
      passFail?: string;
      po?: string;
      failedFor?: string;
    };
    const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
    const locale = parseLocale(body);
    if (body.passFail !== 'Fail') {
      return HttpResponse.json({ message: 'Only passFail Fail triggers replan' }, { status: 400 });
    }
    try {
      const po = typeof body.po === 'string' && body.po.length > 0 ? body.po : undefined;
      const failedFor = typeof body.failedFor === 'string' ? body.failedFor : undefined;
      return HttpResponse.json({
        ...plantDemoServer.applyEvent(lineId, 'qa_fail', locale, { focusPo: po, failedFor }),
        source: 'pass_fail_log',
      });
    } catch {
      return HttpResponse.json({ message: 'Unknown line' }, { status: 404 });
    }
  }),

  http.post('*/demo/plant/ingest/sap-priority-change', async ({ request }) => {
    const body = (await request.json()) as {
      lineId?: string;
      locale?: Locale;
      po?: string;
      priority?: number;
      scheduledFinish?: string;
    };
    const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
    const locale = parseLocale(body);
    const po = typeof body.po === 'string' && body.po.length > 0 ? body.po : undefined;
    try {
      return HttpResponse.json({
        ...plantDemoServer.applyEvent(lineId, 'rush', locale, {
          focusPo: po,
          priority: body.priority,
          scheduledFinish: body.scheduledFinish,
        }),
        source: 'sap_priority_change',
      });
    } catch {
      return HttpResponse.json({ message: 'Unknown line' }, { status: 404 });
    }
  }),

  http.post('*/demo/plant/ingest/sap-queue-refresh', async ({ request }) => {
    const body = (await request.json()) as {
      lineId?: string;
      locale?: Locale;
      po?: string;
      species?: string;
      kg?: number;
      finish?: string;
      scheduledFinish?: string;
      priority?: number;
      customerOrderId?: string;
    };
    const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
    const locale = parseLocale(body);
    if (!body.po) {
      return HttpResponse.json({ message: 'po required' }, { status: 400 });
    }
    try {
      return HttpResponse.json({
        ...plantDemoServer.applySapQueueRefresh(lineId, locale, {
          po: body.po,
          focusPo: body.po,
          species: body.species,
          kg: body.kg,
          finish: body.finish,
          scheduledFinish: body.scheduledFinish ?? body.finish,
          priority: body.priority,
          customerOrderId: body.customerOrderId,
        }),
        source: 'sap_queue_refresh',
      });
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
