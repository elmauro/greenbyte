import { useState, type FormEvent } from 'react';
import { useLocale } from '../../i18n';
import { signInPlantUx } from '../../demo/plant/plantDemoSessionAuth';

type PlantDemoLoginGateProps = {
  onSignedIn: () => void;
};

export function PlantDemoLoginGate({ onSignedIn }: PlantDemoLoginGateProps) {
  const { messages: m } = useLocale();
  const copy = m.plantMvp.uxLogin;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (signInPlantUx(username, password)) {
      setError(false);
      onSignedIn();
    } else {
      setError(true);
    }
  }

  return (
    <div className="site-container flex min-h-[60vh] max-w-lg flex-col justify-center py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{copy.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold text-brand-blue">{copy.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{copy.subtitle}</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="plant-ux-user" className="block text-sm font-medium text-gray-700">
              {copy.usernameLabel}
            </label>
            <input
              id="plant-ux-user"
              name="username"
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="plant-ux-pass" className="block text-sm font-medium text-gray-700">
              {copy.passwordLabel}
            </label>
            <input
              id="plant-ux-pass"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-brand-red">{copy.error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark"
          >
            {copy.submit}
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500">{copy.hint}</p>
      </div>
    </div>
  );
}
