/**
 * Local BFF for UI testing: serves the core-api HTTP routes on localhost by calling the Lambda handlers.
 * Usage (from backend/core-api): PG* vars + SEMANTIC_PLANNER_ENABLED=true node scripts/local-bff.mjs
 * Dev only. It writes to whatever database the PG* vars point at.
 */
import http from 'node:http';

const PORT = Number(process.env.LOCAL_BFF_PORT || 3001);

const routes = [
  ['GET', /^\/api\/core\/health$/, 'health'],
  ['GET', /^\/demo\/plant\/lines\/(?<lineId>[^/]+)\/queue$/, 'plant-demo-queue'],
  ['POST', /^\/demo\/plant\/ingest\/pass-fail-log$/, 'plant-demo-ingest-pass-fail'],
  ['POST', /^\/demo\/plant\/ingest\/sap-priority-change$/, 'plant-demo-ingest-sap'],
  ['POST', /^\/demo\/plant\/ingest\/sap-queue-refresh$/, 'plant-demo-ingest-sap-refresh'],
  ['POST', /^\/demo\/plant\/schedule\/accept$/, 'plant-demo-accept'],
  ['POST', /^\/demo\/plant\/batches\/explain$/, 'plant-demo-explain'],
  ['POST', /^\/plan\/compute$/, 'agent-plan-compute'],
  ['POST', /^\/facts\/extract$/, 'agent-facts-extract'],
  ['POST', /^\/explain-replan$/, 'agent-explain-replan'],
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-program-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data || null));
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors).end();
    return;
  }
  const route = routes.find(([method, pattern]) => method === req.method && pattern.test(url.pathname));
  if (!route) {
    res.writeHead(404, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Not found' }));
    return;
  }
  const [, pattern, folder] = route;
  const started = Date.now();
  try {
    const { handler } = await import(`../functions/${folder}/handler.js`);
    const result = await handler({
      rawPath: url.pathname,
      requestContext: { http: { method: req.method, path: url.pathname } },
      headers: req.headers,
      pathParameters: url.pathname.match(pattern).groups ?? {},
      queryStringParameters: Object.fromEntries(url.searchParams),
      body: await readBody(req),
    });
    res.writeHead(result.statusCode ?? 200, { 'Content-Type': 'application/json', ...result.headers, ...cors });
    res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body ?? result));
    console.log(`${req.method} ${url.pathname} -> ${result.statusCode ?? 200} (${Date.now() - started} ms)`);
  } catch (err) {
    console.error(`${req.method} ${url.pathname} failed`, err);
    res.writeHead(500, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify({ message: err.message }));
  }
}).listen(PORT, () => {
  console.log(`Local BFF on http://localhost:${PORT} (planner ${process.env.SEMANTIC_PLANNER_ENABLED === 'true' ? 'ON' : 'OFF'})`);
});
