import { http, HttpResponse } from 'msw';
import { plantDemoHandlers } from './plantDemoHandlers';

export const handlers = [
  http.get('/health', () => HttpResponse.json({ status: 'ok' })),
  ...plantDemoHandlers,
];
