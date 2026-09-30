import type { Locale } from '../../i18n/LocaleContext';

const SPECIES: Record<string, Record<Locale, { common: string; scientific: string }>> = {
  SWCO: {
    en: { common: 'Sweet corn', scientific: 'Zea mays saccharata' },
    es: { common: 'Maíz dulce', scientific: 'Zea mays saccharata' },
  },
  CORN: {
    en: { common: 'Field corn', scientific: 'Zea mays' },
    es: { common: 'Maíz de grano', scientific: 'Zea mays' },
  },
  PECO: {
    en: { common: 'Pea', scientific: 'Pisum sativum' },
    es: { common: 'Arveja', scientific: 'Pisum sativum' },
  },
  SWBS: {
    en: { common: 'Sweet corn (breeding)', scientific: 'Zea mays saccharata' },
    es: { common: 'Maíz dulce (mejoramiento)', scientific: 'Zea mays saccharata' },
  },
};

export function speciesDisplay(speciesCode: string, locale: Locale) {
  return SPECIES[speciesCode]?.[locale] ?? {
    common: speciesCode,
    scientific: '—',
  };
}
