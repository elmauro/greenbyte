import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { GuidedDemo } from '../../components/demo/GuidedDemo';
import { PlantTourStepPreview } from '../../components/plant/PlantTourStepPreview';
import { buildPlantFlowSnapshots } from '../../demo/plant/plantFlowSnapshots';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';

export function PlantCapacityTour() {
  const { locale, messages: m } = useLocale();
  const d = m.demoPlant;
  const snapshots = useMemo(() => buildPlantFlowSnapshots(locale), [locale]);

  return (
    <SiteLayout>
      <div className="site-container border-b border-gray-100 py-3 text-sm">
        <Link to={paths.demoPlant} className="font-semibold text-brand-green hover:text-brand-green-dark">
          ← {m.plantMvp.links.backMvp}
        </Link>
      </div>
      <GuidedDemo
        eyebrow={d.eyebrow}
        title={d.title}
        subtitle={d.subtitle}
        plainLanguage={d.plainLanguage}
        steps={d.steps}
        labels={m.demoCommon.labels}
        architectureLink={{ label: m.demoCommon.viewArchitecture, href: paths.demoArchitecture }}
        renderStepPreview={(stepIndex) => (
          <PlantTourStepPreview stepIndex={stepIndex} snapshots={snapshots} />
        )}
      />
    </SiteLayout>
  );
}
