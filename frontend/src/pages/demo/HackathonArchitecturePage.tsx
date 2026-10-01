import { Link } from 'react-router-dom';
import { ArchitectureSectionGroup } from '../../components/demo/ArchitectureSectionGroup';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';

function TextDiagram({
  title,
  description,
  body,
}: {
  title: string;
  description?: string;
  body: string;
}) {
  return (
    <section>
      <h3 className="text-xl font-semibold text-brand-blue">{title}</h3>
      {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">{description}</p>}
      <pre className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-100 sm:text-xs">
        {body}
      </pre>
    </section>
  );
}

export function HackathonArchitecturePage() {
  const { messages: m } = useLocale();
  const a = m.demoArchitecture;
  const g = a.groups;

  return (
    <SiteLayout>
      <div className="pb-20">
        <section className="border-b border-gray-100 bg-gradient-to-br from-brand-blue/10 via-white to-brand-green/5 py-12">
          <div className="site-container max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{a.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold text-brand-blue sm:text-4xl">{a.title}</h1>
            <p className="mt-4 text-lg text-gray-600">{a.subtitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">{a.scopeNote}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={paths.demoPlant}
                className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark"
              >
                {a.links.plant}
              </Link>
              <Link
                to={paths.demoPlantTour}
                className="rounded-full border border-brand-blue/30 px-5 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5"
              >
                {a.links.tour}
              </Link>
              <Link
                to={paths.demoPlantFlow}
                className="rounded-full border border-brand-blue/30 px-5 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5"
              >
                {a.links.flow}
              </Link>
            </div>
          </div>
        </section>

        <div className="site-container mt-12 max-w-[90rem] space-y-12">
          <section className="rounded-2xl border border-brand-blue/15 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900">{a.useCasesTitle}</h2>
            <div className="mt-6 grid max-w-3xl gap-6">
              {a.useCaseCards.map((card) => (
                <article key={card.id} className="rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">{card.id}</p>
                  <h3 className="mt-2 font-semibold text-brand-blue">{card.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.problem}</p>
                  <p className="mt-3 text-sm text-gray-700">
                    <span className="font-medium">{a.genAiRoleLabel}:</span> {card.genAiRole}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{a.teamTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">{a.teamIntro}</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">{a.teamTable.role}</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">{a.teamTable.owner}</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">{a.teamTable.responsibility}</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">{a.teamTable.useCases}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {a.teamRows.map((row) => (
                    <tr key={row.role}>
                      <td className="px-4 py-3 font-medium text-brand-blue">{row.role}</td>
                      <td className="px-4 py-3 text-gray-700">{row.owner}</td>
                      <td className="px-4 py-3 text-gray-600">{row.responsibility}</td>
                      <td className="px-4 py-3 text-gray-600">{row.useCases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{a.rulesTitle}</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
              {a.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </section>

          <ArchitectureSectionGroup title={g.shared.title} intro={g.shared.intro}>
            <TextDiagram
              title={a.sections.container.title}
              description={a.sections.container.description}
              body={a.diagrams.shared}
            />
          </ArchitectureSectionGroup>

          <ArchitectureSectionGroup
            title={g.uc1.title}
            intro={g.uc1.intro}
            syngentaLabel={a.fieldLabels.syngentaGoal}
            syngentaGoal={g.uc1.syngentaGoal}
            dataLabel={a.fieldLabels.data}
            dataSource={g.uc1.dataSource}
            demoRouteLabel={a.fieldLabels.demoRoute}
            demoRoute={paths.demoPlant}
          >
            <TextDiagram
              title={a.sections.uc1Flow.title}
              description={a.sections.uc1Flow.description}
              body={a.diagrams.uc1Flow}
            />
            <TextDiagram
              title={a.sections.uc1Sequence.title}
              description={a.sections.uc1Sequence.description}
              body={a.diagrams.uc1Sequence}
            />
            <EndpointTable title={a.endpointsTitle} headers={a.endpointTable} rows={a.uc1Endpoints} />
          </ArchitectureSectionGroup>

          <section className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-6 text-sm text-gray-700">
            <p className="font-semibold text-brand-blue">{a.monolithTitle}</p>
            <p className="mt-2 leading-relaxed">{a.monolithBody}</p>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}

function EndpointTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: { layer: string; examples: string; purpose: string };
  rows: { layer: string; examples: string; purpose: string }[];
}) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">{headers.layer}</th>
              <th className="px-4 py-3 font-semibold text-gray-700">{headers.examples}</th>
              <th className="px-4 py-3 font-semibold text-gray-700">{headers.purpose}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.layer + row.examples}>
                <td className="px-4 py-3 font-medium text-brand-blue">{row.layer}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-800">{row.examples}</td>
                <td className="px-4 py-3 text-gray-600">{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
