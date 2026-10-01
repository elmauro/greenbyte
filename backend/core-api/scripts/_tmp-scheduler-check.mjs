import fs from 'node:fs';
import { fetchSchedulerQueue } from '../services/plantDemo/sapIngestDb.js';

const tf = fs.readFileSync(
  'c:/Projects/greenbyte/infrastructure/postgresdb/dev.secrets.tfvars',
  'utf8',
);
process.env.PGHOST = 'greenbyte-dev-postgres.cc5vjagstg6n.us-east-1.rds.amazonaws.com';
process.env.PGPORT = '5432';
process.env.PGDATABASE = 'greenbyte';
process.env.PGUSER = 'greenbyte_user';
process.env.PGPASSWORD = tf.match(/master_password\s*=\s*"([^"]*)"/)?.[1];
process.env.PGSSL = 'true';

const res = await fetchSchedulerQueue('line-1', 'en');
console.log(JSON.stringify({
  planVersion: res.planVersion,
  lastEvent: res.lastEvent,
  queueLength: res.queue?.length ?? 0,
  hasExplanation: Boolean(res.pendingExplanation?.summary),
  summary: res.pendingExplanation?.summary ?? null,
  acceptedPlanVersion: res.acceptedPlanVersion,
  reasonSample: res.queue?.[0]?.reasonShort ?? null,
}, null, 2));
