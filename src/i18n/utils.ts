import { ui, defaultLang } from './ui';
import { seoUi } from './seo';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: string) {
    const combined = { ...ui[lang], ...seoUi[lang] };
    const combinedDefault = { ...ui[defaultLang], ...seoUi[defaultLang] };
    return combined[key] || combinedDefault[key];
  }
}

export function useTranslatedPath(lang: keyof typeof ui) {
  return function translatePath(path: string, l: string = lang) {
    return !l || l === defaultLang ? path : `/${l}${path}`
  }
}
