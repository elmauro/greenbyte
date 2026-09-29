import { SiteLayout } from '../../components/layout/SiteLayout';
import { GuidedDemo } from '../../components/demo/GuidedDemo';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';

export function BreedingDemo() {
  const { messages: m } = useLocale();
  const d = m.demoBreeding;

  return (
    <SiteLayout>
      <GuidedDemo
        eyebrow={d.eyebrow}
        title={d.title}
        subtitle={d.subtitle}
        steps={d.steps}
        labels={m.demoCommon.labels}
        otherDemo={{ label: m.demoCommon.viewPlant, href: paths.demoPlant }}
      />
    </SiteLayout>
  );
}
