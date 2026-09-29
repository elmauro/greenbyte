import { Link } from 'react-router-dom';
import { ArchitectureDiagram } from '../../components/demo/ArchitectureDiagram';
import { SiteLayout } from '../../components/layout/SiteLayout';
import {
  hackathonArchitectureDiagrams,
  type HackathonDiagramKey,
} from '../../content/hackathonArchitectureDiagrams';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';

type DiagramSection = {
  diagramKey: HackathonDiagramKey;
  title: string;
  description?: string;
};

export function HackathonArchitecturePage() {
  const { messages: m } = useLocale();
  const a = m.demoArchitecture;

  const sections: DiagramSection[] = [
    { diagramKey: 'container', title: a.sections.container.title, description: a.sections.container.description },
    { diagramKey: 'genericTemplate', title: a.sections.generic.title, description: a.sections.generic.description },
    { diagramKey: 'uc1Flow', title: a.sections.uc1Flow.title, description: a.sections.uc1Flow.description },
    { diagramKey: 'sequenceUc1', title: a.sections.uc1Sequence.title, description: a.sections.uc1Sequence.description },
    { diagramKey: 'uc4Flow', title: a.sections.uc4Flow.title, description: a.sections.uc4Flow.description },
    { diagramKey: 'sequenceUc4', title: a.sections.uc4Sequence.title, description: a.sections.uc4Sequence.description },
  ];

  return (
    <SiteLayout>
      <div className="pb-20">
        <section className="border-b border-gray-100 bg-gradient-to-br from-brand-blue/10 via-white to-brand-green/5 py-12">
          <div className="site-container max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{a.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold text-brand-blue sm:text-4xl">{a.title}</h1>
            <p className="mt-4 text-lg text-gray-600">{a.subtitle}</p>
            <p className="mt-3 text-sm text-gray-500">{a.docNote}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={paths.demoPlant}
                className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark"
              >
                {a.links.plant}
              </Link>
              <Link
                to={paths.demoBreeding}
                className="rounded-full border border-brand-blue/30 px-5 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5"
              >
                {a.links.breeding}
              </Link>
            </div>
          </div>
        </section>

        <div className="site-container mt-12 max-w-5xl space-y-14">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">{a.teamTitle}</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">{a.teamTable.role}</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">{a.teamTable.owner}</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">{a.teamTable.responsibility}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {a.teamRows.map((row) => (
                    <tr key={row.role}>
                      <td className="px-4 py-3 font-medium text-brand-blue">{row.role}</td>
                      <td className="px-4 py-3 text-gray-700">{row.owner}</td>
                      <td className="px-4 py-3 text-gray-600">{row.responsibility}</td>
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

          {sections.map((section) => (
            <ArchitectureDiagram
              key={section.diagramKey}
              title={section.title}
              description={section.description}
              diagram={hackathonArchitectureDiagrams[section.diagramKey]}
            />
          ))}

          <section className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-6 text-sm text-gray-700">
            <p className="font-semibold text-brand-blue">{a.monolithTitle}</p>
            <p className="mt-2 leading-relaxed">{a.monolithBody}</p>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}
