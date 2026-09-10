import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { I18n } from 'i18n';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Desanida un objeto cuyas claves puedan contener notación de puntos
 * (ej. {"sections.feat": "..."} -> {sections: {feat: "..."}}).
 *
 * @param {object} obj
 * @returns {object}
 */
export function unflatten(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const parts = key.split('.');
    let cur = result;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    const last = parts[parts.length - 1];
    cur[last] = (val && typeof val === 'object' && !Array.isArray(val)) ? unflatten(val) : val;
  }
  return result;
}

/**
 * Fusión profunda recursiva de dos objetos (preserva diccionarios existentes).
 *
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
export function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = deepMerge(result[key], source[key]);
        } else {
          result[key] = { ...source[key] };
        }
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}

/**
 * Carga los catálogos base integrados (es, en) desde los archivos JSON locales.
 *
 * @returns {Record<string, object>}
 */
export function loadBaseCatalogs() {
  const esContent = readFileSync(resolve(__dirname, 'locales', 'es.json'), 'utf-8');
  const enContent = readFileSync(resolve(__dirname, 'locales', 'en.json'), 'utf-8');
  return {
    es: JSON.parse(esContent),
    en: JSON.parse(enContent),
  };
}

/**
 * Resuelve el idioma activo siguiendo la precedencia estricta:
 * 1. CLI flag (--lang)
 * 2. .gitdocrc.json ("locale")
 * 3. Entorno explícito si cuenta con catálogo disponible
 * 4. Por defecto: inglés ("en")
 *
 * @param {object} [options]
 * @param {string} [options.lang]
 * @param {string} [options.configLocale]
 * @param {string} [options.envLocale]
 * @param {string[]} [options.availableLocales]
 * @returns {string} Código de idioma resuelto
 */
export function resolveLocale({ lang, configLocale, envLocale, availableLocales = ['en', 'es'] } = {}) {
  // 1. Bandera CLI (--lang)
  if (lang && typeof lang === 'string' && lang.trim()) {
    return lang.trim().toLowerCase();
  }

  // 2. Configuración local .gitdocrc.json
  if (configLocale && typeof configLocale === 'string' && configLocale.trim()) {
    return configLocale.trim().toLowerCase();
  }

  // 3. Entorno explícito si se pasa envLocale
  if (envLocale && typeof envLocale === 'string' && envLocale.trim()) {
    const cleaned = envLocale.split('.')[0].replace('_', '-');
    const baseCode = cleaned.split('-')[0].toLowerCase();
    if (availableLocales.includes(baseCode)) {
      return baseCode;
    }
  }

  // 4. Idioma por defecto: inglés ("en")
  return 'en';
}

/**
 * Crea una nueva instancia configurada de i18n con soporte para
 * catálogos personalizados y fusión profunda.
 *
 * @param {object} [options]
 * @param {string} [options.lang]
 * @param {string} [options.configLocale]
 * @param {string} [options.locale]
 * @param {object} [options.customCatalogs] Diccionarios personalizados desde .gitdocrc.json (i18n)
 * @returns {{ locale: string, t: (key: string, params?: object|string[]) => string, i18n: I18n }}
 */
export function createI18n(options = {}) {
  const baseCatalogs = loadBaseCatalogs();
  const staticCatalog = { ...baseCatalogs };

  if (options.customCatalogs && typeof options.customCatalogs === 'object') {
    for (const [loc, cat] of Object.entries(options.customCatalogs)) {
      const normalizedCat = unflatten(cat);
      if (staticCatalog[loc]) {
        staticCatalog[loc] = deepMerge(staticCatalog[loc], normalizedCat);
      } else {
        staticCatalog[loc] = normalizedCat;
      }
    }
  }

  const availableLocales = Object.keys(staticCatalog);
  const activeLocale = options.locale
    || resolveLocale({
      lang: options.lang,
      configLocale: options.configLocale,
      availableLocales,
    });

  const i18nInstance = new I18n({
    locales: availableLocales,
    defaultLocale: 'en',
    retryInDefaultLocale: true,
    objectNotation: true,
    updateFiles: false,
    syncFiles: false,
    staticCatalog,
    missingKeyFn: (_loc, value) => value,
  });

  i18nInstance.setLocale(activeLocale);

  const t = (key, params) => {
    let result = i18nInstance.__(key, params);
    // Soporte para interpolación con llaves simples {param} si no fue reemplazado por mustache {{param}}
    if (params && typeof params === 'object' && typeof result === 'string') {
      result = result.replace(/\{(\w+)\}/g, (match, paramName) => {
        return Object.prototype.hasOwnProperty.call(params, paramName) ? params[paramName] : match;
      });
    }
    return result;
  };

  return {
    locale: activeLocale,
    t,
    i18n: i18nInstance,
    staticCatalog,
  };
}

// ---------------------------------------------------------------------------
// Singleton global para CLI y módulos compartidos
// ---------------------------------------------------------------------------

let activeI18nInstance = null;

/**
 * Inicializa o reconfigura el singleton global de i18n.
 *
 * @param {object} [options]
 * @returns {{ locale: string, t: Function, i18n: I18n }}
 */
export function initI18n(options = {}) {
  activeI18nInstance = createI18n(options);
  return activeI18nInstance;
}

/**
 * Obtiene la instancia activa de i18n. Si no ha sido inicializada,
 * se inicializa con la configuración por defecto.
 *
 * @returns {{ locale: string, t: Function, i18n: I18n }}
 */
export function getI18n() {
  if (!activeI18nInstance) {
    activeI18nInstance = createI18n();
  }
  return activeI18nInstance;
}

/**
 * Función global de traducción que delega a la instancia activa de i18n.
 *
 * @param {string} key
 * @param {object|string[]} [params]
 * @returns {string}
 */
export function t(key, params) {
  return getI18n().t(key, params);
}
