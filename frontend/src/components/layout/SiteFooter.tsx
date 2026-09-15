import { useLocale } from '../../i18n';

export function SiteFooter() {
  const { messages: m } = useLocale();

  const footerLinks = [
    { label: m.footer.about, href: '#' },
    { label: m.footer.sustainability, href: '#sustainability' },
    { label: m.footer.contact, href: '#' },
  ];

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="site-container grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="text-lg font-semibold text-brand-blue">GreenByte</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-600">{m.footer.blurb}</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{m.footer.explore}</p>
          <ul className="mt-4 space-y-2">
            {footerLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="text-sm text-gray-700 hover:text-brand-green">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {m.footer.prioritiesTitle}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">{m.footer.prioritiesBody}</p>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white">
        <div className="site-container flex flex-col gap-2 py-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {m.footer.copyright}
          </p>
          <p>{m.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
