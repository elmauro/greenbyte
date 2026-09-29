import { SiteLayout } from '../../components/layout/SiteLayout';
import { GuidedDemo } from '../../components/demo/GuidedDemo';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';

export function PlantCapacityDemo() {
  const { messages: m } = useLocale();
  const d = m.demoPlant;

  return (
    <SiteLayout>
      <GuidedDemo
        eyebrow={d.eyebrow}
        title={d.title}
        subtitle={d.subtitle}
        plainLanguage={d.plainLanguage}
        steps={d.steps}
        labels={m.demoCommon.labels}
        otherDemo={{ label: m.demoCommon.viewBreeding, href: paths.demoBreeding }}
        architectureLink={{ label: m.demoCommon.viewArchitecture, href: paths.demoArchitecture }}
      />
    </SiteLayout>
  );
}
