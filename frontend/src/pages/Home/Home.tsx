import { Link } from 'react-router-dom';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';

const discoverCardImages = [
  'from-brand-green/80 to-brand-green-dark',
  'from-brand-blue/80 to-brand-blue-dark',
  'from-emerald-600/80 to-teal-800',
  'from-lime-600/80 to-brand-green-dark',
  'from-brand-blue/70 to-indigo-900',
  'from-green-700/80 to-brand-green',
];

export function Home() {
  const { messages: m } = useLocale();

  return (
    <SiteLayout>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-green via-brand-green to-brand-green-dark text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-brand-blue/40 blur-3xl" />
        </div>
        <div className="site-container relative py-16 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-white/80">{m.hero.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {m.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90">{m.hero.subtitle}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#discover"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-green shadow-sm transition hover:bg-gray-100"
            >
              {m.hero.ctaDiscover}
            </a>
            <Link
              to={paths.demoPlantUx}
              className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {m.hero.ctaDemoPlant}
            </Link>
            <Link
              to={paths.demoArchitecture}
              className="rounded-full border border-white/80 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {m.hero.ctaArchitecture}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 bg-white py-14">
        <div className="site-container max-w-4xl">
          <h2 className="text-3xl font-semibold text-brand-blue">{m.intro.title}</h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">{m.intro.body}</p>
        </div>
      </section>

      <section id="discover" className="bg-gray-50 py-16">
        <div className="site-container">
          <h2 className="section-title">{m.discover.title}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {m.discover.cards.map((card, index) => (
              <article
                key={card.title}
                className="card-hover group overflow-hidden rounded-lg bg-white shadow-sm"
              >
                <div className={`h-40 bg-gradient-to-br ${discoverCardImages[index]}`} />
                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-green">
                    {card.tag}
                  </span>
                  <h3 className="mt-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-brand-blue">
                    {card.title}
                  </h3>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-brand-green">
                    {m.discover.readMore}
                    <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="precision" className="py-16">
        <div className="site-container grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="section-title">{m.precision.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-700">{m.precision.body1}</p>
            <p className="mt-4 leading-relaxed text-gray-600">{m.precision.body2}</p>
            <a
              href="#"
              className="mt-6 inline-flex items-center text-sm font-semibold text-brand-green hover:text-brand-green-dark"
            >
              {m.precision.learnMore}
            </a>
          </div>
          <div className="order-1 lg:order-2">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue/20 via-brand-green/30 to-brand-green/10">
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="grid grid-cols-3 gap-2 opacity-80">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 w-16 rounded-lg bg-brand-green/30 ring-1 ring-brand-green/20"
                      style={{ opacity: 0.4 + (i % 3) * 0.2 }}
                    />
                  ))}
                </div>
                <p className="mt-6 text-sm font-medium text-brand-blue">{m.precision.mapLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="news" className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="site-container">
          <h2 className="section-title">{m.news.title}</h2>
          <ul className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {m.news.items.map((item) => (
              <li key={item.title}>
                <a
                  href="#"
                  className="flex flex-col gap-1 px-6 py-5 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-gray-900 hover:text-brand-green">{item.title}</span>
                  <span className="text-sm text-gray-500">{item.date}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="sustainability" className="py-16">
        <div className="site-container">
          <div className="overflow-hidden rounded-2xl bg-brand-blue text-white">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-12">
                <h2 className="text-2xl font-semibold sm:text-3xl">{m.sustainability.title}</h2>
                <p className="mt-4 leading-relaxed text-white/90">{m.sustainability.body}</p>
                <a
                  href="#"
                  className="mt-8 inline-block rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-dark"
                >
                  {m.sustainability.cta}
                </a>
              </div>
              <div className="min-h-[240px] bg-gradient-to-br from-brand-green/40 to-brand-green-dark/60 lg:min-h-0" />
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
