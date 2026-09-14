import { useState } from 'react';

const navItems = [
  { label: 'Innovation', href: '#discover' },
  { label: 'Precision agriculture', href: '#precision' },
  { label: 'Sustainability', href: '#sustainability' },
  { label: 'News', href: '#news' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="border-b border-brand-green/20 bg-brand-green/5">
        <div className="site-container flex h-9 items-center justify-between text-xs text-gray-600">
          <span>AgTech innovation · Partnering with Syngenta</span>
          <span className="hidden sm:inline">greenbyte-ag.com</span>
        </div>
      </div>

      <div className="site-container flex h-16 items-center justify-between gap-4">
        <a href="#" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green text-lg font-bold text-white">
            G
          </span>
          <div className="leading-tight">
            <span className="block text-lg font-semibold text-brand-blue">GreenByte</span>
            <span className="hidden text-xs text-gray-500 sm:block">Intelligent agriculture</span>
          </div>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="nav-link">
              {item.label}
            </a>
          ))}
        </nav>

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
          </ul>
        </nav>
      )}
    </header>
  );
}
