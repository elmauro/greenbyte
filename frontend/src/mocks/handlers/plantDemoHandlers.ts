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
];
