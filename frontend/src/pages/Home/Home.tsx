import { SiteLayout } from '../../components/layout/SiteLayout';

const discoverCards = [
  {
    title: 'How AI helps predict hybrid performance before planting',
    tag: 'Innovation',
    image: 'from-brand-green/80 to-brand-green-dark',
  },
  {
    title: 'Predicting solutions for herbicide resistance',
    tag: 'Research',
    image: 'from-brand-blue/80 to-brand-blue-dark',
  },
  {
    title: 'Top weeds impacting global food security',
    tag: 'Insights',
    image: 'from-emerald-600/80 to-teal-800',
  },
  {
    title: 'Can biologicals reduce fertilizer dependency?',
    tag: 'Sustainability',
    image: 'from-lime-600/80 to-brand-green-dark',
  },
  {
    title: 'Trialing the traits of tomorrow',
    tag: 'Seeds & traits',
    image: 'from-brand-blue/70 to-indigo-900',
  },
  {
    title: 'Inside the lab solving agriculture’s next problem',
    tag: 'Science',
    image: 'from-green-700/80 to-brand-green',
  },
];

const newsItems = [
  {
    date: 'Sep 2026',
    title: 'GreenByte launches AgTech hackathon collaboration with Syngenta',
  },
  {
    date: 'Sep 2026',
    title: 'Precision agriculture platform preview at greenbyte-ag.com',
  },
  {
    date: 'Coming soon',
    title: 'Generative AI assistant for field-level recommendations',
  },
];

export function Home() {
  return (
    <SiteLayout>
      {/* Hero — estilo Syngenta: titular grande + intro corporativa */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-green via-brand-green to-brand-green-dark text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-brand-blue/40 blur-3xl" />
        </div>
        <div className="site-container relative py-16 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-white/80">
            AgTech · Generative AI
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            The technologies tackling heat and drought
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90">
            How can farmers protect their crops during soaring temperatures? GreenByte explores
            data-driven and AI-assisted answers — in partnership with Syngenta for the hackathon.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#discover"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-green shadow-sm transition hover:bg-gray-100"
            >
              Discover GreenByte
            </a>
            <a
              href="#precision"
              className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Precision agriculture
            </a>
          </div>
        </div>
      </section>

      {/* Intro corporativa */}
      <section className="border-b border-gray-100 bg-white py-14">
        <div className="site-container max-w-4xl">
          <h2 className="text-3xl font-semibold text-brand-blue">GreenByte</h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            We deliver breakthroughs for farmers, in every field so they can meet the demands of
            modern agriculture. Through cutting-edge innovation — including generative AI — we help
            farmers grow resilient, healthy crops that can feed an increasing global population,
            while producing food in a way that helps improve our planet.
          </p>
        </div>
      </section>

      {/* Discover grid */}
      <section id="discover" className="bg-gray-50 py-16">
        <div className="site-container">
          <h2 className="section-title">Discover GreenByte</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {discoverCards.map((card) => (
              <article
                key={card.title}
                className="card-hover group overflow-hidden rounded-lg bg-white shadow-sm"
              >
                <div className={`h-40 bg-gradient-to-br ${card.image}`} />
                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-green">
                    {card.tag}
                  </span>
                  <h3 className="mt-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-brand-blue">
                    {card.title}
                  </h3>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-brand-green">
                    Read more
                    <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Precision agriculture */}
      <section id="precision" className="py-16">
        <div className="site-container grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="section-title">What is precision agriculture?</h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-700">
              It is a farming approach that uses technology to monitor and manage field variability
              in crops.
            </p>
            <p className="mt-4 leading-relaxed text-gray-600">
              Learn how it helps make agriculture more efficient, productive and sustainable —
              with GreenByte as the platform we are building during the hackathon.
            </p>
            <a
              href="#"
              className="mt-6 inline-flex items-center text-sm font-semibold text-brand-green hover:text-brand-green-dark"
            >
              Learn more →
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
                <p className="mt-6 text-sm font-medium text-brand-blue">Field variability map</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Media releases */}
      <section id="news" className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="site-container">
          <h2 className="section-title">Media releases</h2>
          <ul className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {newsItems.map((item) => (
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

      {/* Sustainability */}
      <section id="sustainability" className="py-16">
        <div className="site-container">
          <div className="overflow-hidden rounded-2xl bg-brand-blue text-white">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-12">
                <h2 className="text-2xl font-semibold sm:text-3xl">Our sustainability priorities</h2>
                <p className="mt-4 leading-relaxed text-white/90">
                  Working with farmers, we believe agriculture can become a climate solution,
                  regenerating soil and nature, while feeding the world. Our priorities set clear
                  targets to reduce our environmental footprint.
                </p>
                <a
                  href="#"
                  className="mt-8 inline-block rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-dark"
                >
                  Explore priorities
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
