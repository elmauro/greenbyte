import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOutPlantUx } from '../../demo/plant/plantDemoSessionAuth';
import { useDemoSession } from '../../hooks/useDemoSession';
import { useLocale } from '../../i18n';
import { demoDefaultAfterSignIn, paths } from '../../routes/paths';
import { openPlantHelp } from '../plant/ux/PlantHelpDrawer';
import { LanguageSwitcher } from './LanguageSwitcher';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { messages: m } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useDemoSession();
  const onHome = location.pathname === paths.home;

  /** Landing anchors — public home only; hidden once demo session is active. */
  const navItems =
    onHome && !session
      ? [
          { label: m.nav.innovation, href: '#discover', router: false },
          { label: m.nav.precision, href: '#precision', router: false },
          { label: m.nav.sustainability, href: '#sustainability', router: false },
          { label: m.nav.news, href: '#news', router: false },
        ]
      : [];

  const demoItems = session
    ? [
        { label: m.nav.demoPlant, to: paths.demoPlant },
        { label: m.nav.demoPlantUx, to: paths.demoPlantUx },
        { label: m.nav.demoPlantFlow, to: paths.demoPlantFlow },
        { label: m.nav.demoArchitecture, to: paths.demoArchitecture },
      ]
    : [];

  function handleSignOut() {
    signOutPlantUx();
    setOpen(false);
    if (location.pathname.startsWith('/demo/') && location.pathname !== paths.demoSignIn) {
      navigate(paths.home);
    }
  }

  const signInReturnTo =
    location.pathname === paths.demoSignIn
      ? demoDefaultAfterSignIn
      : location.pathname === paths.home
        ? demoDefaultAfterSignIn
        : location.pathname;
  const signInHref = `${paths.demoSignIn}?returnTo=${encodeURIComponent(signInReturnTo)}`;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="border-b border-brand-green/20 bg-brand-green/5">
        <div className="site-container flex h-9 items-center justify-between text-xs text-gray-600">
          <span>{m.header.tagline}</span>
          <span className="hidden sm:inline">{m.header.domain}</span>
        </div>
      </div>

      <div className="site-container flex h-16 items-center justify-between gap-4">
        <Link to={paths.home} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green text-lg font-bold text-white">
            G
          </span>
          <div className="leading-tight">
            <span className="block text-lg font-semibold text-brand-blue">GreenByte</span>
            <span className="hidden text-xs text-gray-500 sm:block">{m.header.brandSubtitle}</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="nav-link">
              {item.label}
            </a>
          ))}
          {demoItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${location.pathname === item.to ? 'text-brand-green' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <div className="hidden items-center gap-2 text-xs text-gray-600 sm:flex">
              <span title={session.username}>{m.header.demoSignedInAs.replace('{user}', session.username)}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="font-semibold text-brand-blue hover:text-brand-green"
              >
                {m.header.demoSignOut}
              </button>
            </div>
          ) : (
            <Link
              to={signInHref}
              className="hidden rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-dark sm:inline-flex"
            >
              {m.header.demoSignIn}
            </Link>
          )}
          {location.pathname === paths.demoPlantUx && (
            <button
              type="button"
              onClick={openPlantHelp}
              aria-label={m.plantMvp.ux.navHelp}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.8-1.2 1.6V14" />
                <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </button>
          )}
          <LanguageSwitcher />
          <button
            type="button"
            className="inline-flex rounded-md p-2 text-gray-700 md:hidden"
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-gray-100 bg-white px-4 py-4 md:hidden" aria-label="Mobile">
          <ul className="space-y-3">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block text-sm font-medium text-gray-800"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {demoItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="block text-sm font-medium text-gray-800"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              {session ? (
                <button
                  type="button"
                  className="block text-sm font-medium text-brand-blue"
                  onClick={handleSignOut}
                >
                  {m.header.demoSignOut}
                </button>
              ) : (
                <Link
                  to={signInHref}
                  className="block text-sm font-semibold text-brand-green"
                  onClick={() => setOpen(false)}
                >
                  {m.header.demoSignIn}
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
