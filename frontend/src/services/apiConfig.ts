/** Trim env string; empty → fallback (may be ''). */
function env(key: string, fallback = ''): string {
  const v = import.meta.env[key] as string | undefined;
  return v?.trim() ? v.trim() : fallback;
}

/**
 * MSW dev / E2E: requests must be same-origin so the service worker can intercept them
 * (same pattern as loyalty-app-vite).
 */
export const useMsw = import.meta.env.VITE_USE_MSW === 'true';

/** Live BFF (Mauricio core-api). Ignored while MSW is on. */
export const apiBaseApp = useMsw ? '' : env('VITE_API_BASE_APP', '');

export const apiConfig = {
  appName: env('VITE_APP_NAME', 'greenbyte-frontend'),
  apiBaseAuth: useMsw ? '' : env('VITE_API_BASE_AUTH', ''),
  apiBaseApp,
  programId: env('VITE_PROGRAM_ID', ''),
  useMsw,
};

/** How UC1 plant demo data reaches the UI. */
export type ApiConnectionMode = 'msw' | 'in-process' | 'bff';

export function getApiConnectionMode(): ApiConnectionMode {
  if (useMsw) return 'msw';
  if (apiBaseApp) return 'bff';
  return 'in-process';
}
