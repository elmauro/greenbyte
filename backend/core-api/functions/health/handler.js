export async function handler() {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ service: 'greenbyte-core-api', status: 'ok' }),
  };
}
