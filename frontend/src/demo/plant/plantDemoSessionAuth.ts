/** Hackathon demo session — not production Cognito. Gates UC1 demo routes + header nav. */

export const DEMO_SESSION_EVENT = 'greenbyte-demo-session';

const SESSION_KEY = 'greenbyte-plant-ux-session-v1';

function notifySessionChange() {
  window.dispatchEvent(new Event(DEMO_SESSION_EVENT));
}

export type PlantUxSession = {
  username: string;
  signedInAt: string;
};

function expectedCredentials(): { username: string; password: string } {
  return {
    username: import.meta.env.VITE_DEMO_PLANT_USERNAME?.trim() || 'greenbyte_user',
    password: import.meta.env.VITE_DEMO_PLANT_PASSWORD?.trim() || 'gr33nb4t3',
  };
}

export function readPlantUxSession(): PlantUxSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlantUxSession;
    if (!parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function signInPlantUx(username: string, password: string): boolean {
  const expected = expectedCredentials();
  const ok =
    username.trim() === expected.username && password === expected.password;
  if (!ok) return false;
  const session: PlantUxSession = {
    username: expected.username,
    signedInAt: new Date().toISOString(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifySessionChange();
  return true;
}

export function signOutPlantUx(): void {
  sessionStorage.removeItem(SESSION_KEY);
  notifySessionChange();
}
