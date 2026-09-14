const footerLinks = [
  { label: 'About GreenByte', href: '#' },
  { label: 'Sustainability', href: '#sustainability' },
  { label: 'Contact', href: '#' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="site-container grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="text-lg font-semibold text-brand-blue">GreenByte</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-600">
            Breakthroughs for farmers, in every field — powered by data and generative AI.
            Hackathon project in collaboration with Syngenta.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Explore</p>
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
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Our priorities</p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            Regenerative agriculture, soil health, and resilient crops that feed a growing
            world — with a reduced environmental footprint.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white">
        <div className="site-container flex flex-col gap-2 py-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GreenByte. Independent hackathon project.</p>
          <p>Not affiliated with or endorsed by Syngenta. Industry partner for the hackathon.</p>
        </div>
      </div>
    </footer>
  );
}
