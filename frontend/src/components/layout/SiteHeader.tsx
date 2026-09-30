import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';
import { LanguageSwitcher } from './LanguageSwitcher';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { messages: m } = useLocale();
  const location = useLocation();
  const onHome = location.pathname === paths.home;

  const navItems = onHome
    ? [
        { label: m.nav.innovation, href: '#discover', router: false },
        { label: m.nav.precision, href: '#precision', router: false },
        { label: m.nav.sustainability, href: '#sustainability', router: false },
        { label: m.nav.news, href: '#news', router: false },
      ]
    : [];

  const demoItems = [
    { label: m.nav.demoPlant, to: paths.demoPlant },
    { label: m.nav.demoPlantUx, to: paths.demoPlantUx },
    { label: m.nav.demoPlantFlow, to: paths.demoPlantFlow },
    { label: m.nav.demoArchitecture, to: paths.demoArchitecture },
  ];

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
          </ul>
        </nav>
      )}
    </header>
  );
}
