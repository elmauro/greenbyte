import { useLocale, type Locale } from '../../i18n';

export function LanguageSwitcher() {
  const { locale, messages, setLocale } = useLocale();

  const options: { code: Locale; label: string }[] = [
    { code: 'en', label: messages.lang.en },
    { code: 'es', label: messages.lang.es },
  ];

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-0.5 shadow-sm"
      role="group"
      aria-label={messages.lang.switchLabel}
    >
      {options.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          data-testid={`lang-${code}`}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={`min-w-[2.25rem] rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
            locale === code
              ? 'bg-emerald-700 text-white'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
