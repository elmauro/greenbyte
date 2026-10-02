/**
 * Safe Cypress run for the UC1 scheduler UX spec.
 *
 * Starts Vite with the in-process plant mock (MSW off, empty API base) on a
 * free port, then runs:
 * cypress run --spec cypress/e2e/uc1-scheduler-ux.cy.ts
 *
 * A free port keeps this run off a dev server that may already be using 51730
 * and pointing at the live BFF. The spec does not click Accept and does not
 * post ingest or explain.
 */
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeProcess = globalThis.process;

function freePort(start) {
  return new Promise((resolve, reject) => {
    if (start > 51820) {
      reject(new Error('No free port for the scheduler Cypress run'));
      return;
    }
    const server = net.createServer();
    server.unref();
    server.once('error', () => {
      resolve(freePort(start + 1));
    });
    server.listen(start, '127.0.0.1', () => {
      server.close(() => resolve(start));
    });
  });
}

function cypressBinary(folder, version) {
  return path.join(folder, version, 'Cypress', 'Cypress.exe');
}

function cypressCacheFolder() {
  const version = JSON.parse(
    fs.readFileSync(path.join(frontendDir, 'node_modules', 'cypress', 'package.json'), 'utf8'),
  ).version;
  const userCache = path.join(os.homedir(), 'AppData', 'Local', 'Cypress', 'Cache');
  const current = nodeProcess.env.CYPRESS_CACHE_FOLDER;
  if (current && fs.existsSync(cypressBinary(current, version))) return current;
  if (fs.existsSync(cypressBinary(userCache, version))) return userCache;
  return current;
}

const cypressCache = cypressCacheFolder();
const port = await freePort(51740);
const command = [
  'npx start-server-and-test',
  `"npx vite --port ${port} --strictPort --host 127.0.0.1"`,
  `http://127.0.0.1:${port}`,
  `"npx cypress run --config baseUrl=http://127.0.0.1:${port} --spec cypress/e2e/uc1-scheduler-ux.cy.ts"`,
].join(' ');

nodeProcess.stdout.write(`Scheduler UX Cypress on http://127.0.0.1:${port}\n`);

const child = spawn(command, {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
  env: {
    ...nodeProcess.env,
    VITE_USE_MSW: 'false',
    VITE_API_BASE_APP: '',
    ...(cypressCache ? { CYPRESS_CACHE_FOLDER: cypressCache } : {}),
  },
});

child.on('exit', (code, signal) => {
  if (signal) nodeProcess.exit(1);
  nodeProcess.exit(code ?? 1);
});
