import test from 'node:test';
import assert from 'node:assert';
import {
  resolveLocale,
  createI18n,
  initI18n,
  getI18n,
  t,
  unflatten,
  deepMerge,
} from '../../src/i18n/index.js';

// ---------------------------------------------------------------------------
// 1. Resolución Jerárquica de Locale (resolveLocale)
// ---------------------------------------------------------------------------

test('resolveLocale - precedencia de bandera CLI sobre .gitdocrc.json y OS', () => {
  const result = resolveLocale({
    lang: 'en',
    configLocale: 'es',
    envLocale: 'es-ES',
  });
  assert.strictEqual(result, 'en', 'La bandera CLI --lang debe tener la máxima precedencia');
});

test('resolveLocale - precedencia de .gitdocrc.json sobre locale del sistema', () => {
  const result = resolveLocale({
    configLocale: 'es',
    envLocale: 'en-US',
  });
  assert.strictEqual(result, 'es', 'La configuración local debe tener precedencia sobre el sistema');
});

test('resolveLocale - adopta idioma del sistema si está disponible en catálogos', () => {
  const esResult = resolveLocale({ envLocale: 'es-ES' });
  assert.strictEqual(esResult, 'es', 'es-ES debe normalizarse a es y ser adoptado');

  const enResult = resolveLocale({ envLocale: 'en-US' });
  assert.strictEqual(enResult, 'en', 'en-US debe normalizarse a en y ser adoptado');
});

test('resolveLocale - fallback a inglés ante idioma de sistema no soportado', () => {
  const result = resolveLocale({ envLocale: 'ja-JP' });
  assert.strictEqual(result, 'en', 'Debe recurrir a inglés ante idioma no disponible');
});

test('resolveLocale - fallback a inglés en ausencia total de configuración y entorno', () => {
  const result = resolveLocale({
    lang: undefined,
    configLocale: undefined,
    envLocale: '',
    availableLocales: ['es', 'en'],
  });
  assert.strictEqual(result, 'en', 'Sin parámetros debe retornar el fallback por defecto en');
});

test('resolveLocale - soporta idiomas no nativos declarados en availableLocales', () => {
  const result = resolveLocale({
    configLocale: 'fr',
    availableLocales: ['es', 'en', 'fr'],
  });
  assert.strictEqual(result, 'fr', 'Debe respetar idiomas adicionales configurados');
});

// ---------------------------------------------------------------------------
// 2. Traducción, Notación de Puntos e Interpolación
// ---------------------------------------------------------------------------

test('createI18n - traduce claves anidadas en español', () => {
  const i18n = createI18n({ locale: 'es' });
  assert.strictEqual(i18n.t('sections.feat'), 'Nuevas Características');
  assert.strictEqual(i18n.t('sections.fix'), 'Correcciones de Bugs');
  assert.strictEqual(i18n.t('pap.directives.run'), 'Ejecución:');
  assert.strictEqual(i18n.t('pap.directives.rollback'), 'Marcha Atrás:');
  assert.strictEqual(i18n.t('pap.directives.verify'), 'Pruebas de Humo:');
});

test('createI18n - traduce claves anidadas en inglés', () => {
  const i18n = createI18n({ locale: 'en' });
  assert.strictEqual(i18n.t('sections.feat'), 'Features');
  assert.strictEqual(i18n.t('sections.fix'), 'Bug Fixes');
  assert.strictEqual(i18n.t('sections.perf'), 'Performance Improvements');
  assert.strictEqual(i18n.t('pap.directives.run'), 'Execution:');
  assert.strictEqual(i18n.t('pap.directives.rollback'), 'Rollback:');
  assert.strictEqual(i18n.t('pap.directives.verify'), 'Smoke Tests / Verification:');
});

test('createI18n - interpola parámetros simples y múltiples', () => {
  const i18n = createI18n({ locale: 'es' });
  const rendered = i18n.t('pipeline.errors.invalidType', { tipo: 'custom-doc' });
  assert.ok(rendered.includes('"custom-doc"'), 'Debe interpolar el parámetro {tipo}');

  const linterMsg = i18n.t('linter.errors.forbiddenTerm', {
    term: 'hack',
    suggestion: 'workaround',
  });
  assert.ok(linterMsg.includes('"hack"'));
  assert.ok(linterMsg.includes('"workaround"'));
});

test('createI18n - fallback automático a inglés cuando una clave falta en el idioma activo', () => {
  const i18n = createI18n({
    locale: 'es',
    customCatalogs: {
      es: {
        customOnlyInEs: 'Solo en español',
      },
      en: {
        customOnlyInEn: 'Only in English',
      },
    },
  });

  // Clave que existe en es
  assert.strictEqual(i18n.t('customOnlyInEs'), 'Solo en español');
  // Clave que solo existe en el fallback en
  assert.strictEqual(i18n.t('customOnlyInEn'), 'Only in English');
});

test('createI18n - retorna el nombre de clave literal ante clave inexistente total', () => {
  const i18n = createI18n({ locale: 'es' });
  const missing = i18n.t('non.existent.deep.key');
  assert.strictEqual(missing, 'non.existent.deep.key', 'Debe retornar la clave literal sin lanzar error');
});

// ---------------------------------------------------------------------------
// 3. Extensibilidad y Sobrescritura de Diccionarios (.gitdocrc.json)
// ---------------------------------------------------------------------------

test('createI18n - sobrescribe claves con notación de punto (unflatten)', () => {
  const i18n = createI18n({
    locale: 'es',
    customCatalogs: {
      es: {
        'sections.feat': 'Entregas de Producto',
      },
    },
  });

  // La clave sobrescrita debe cambiar
  assert.strictEqual(i18n.t('sections.feat'), 'Entregas de Producto');
  // Las demás claves del catálogo deben mantenerse intactas
  assert.strictEqual(i18n.t('sections.fix'), 'Correcciones de Bugs');
});

test('createI18n - sobrescribe claves con objetos anidados estándar', () => {
  const i18n = createI18n({
    locale: 'es',
    customCatalogs: {
      es: {
        sections: {
          feat: 'Entregas de Producto',
        },
      },
    },
  });

  assert.strictEqual(i18n.t('sections.feat'), 'Entregas de Producto');
  assert.strictEqual(i18n.t('sections.fix'), 'Correcciones de Bugs');
});

test('createI18n - soporta nuevo idioma no nativo (fr) con fallback a inglés', () => {
  const i18n = createI18n({
    locale: 'fr',
    customCatalogs: {
      fr: {
        sections: {
          feat: 'Fonctionnalités',
        },
      },
    },
  });

  // Clave provista en francés
  assert.strictEqual(i18n.t('sections.feat'), 'Fonctionnalités');
  // Clave ausente en francés -> fallback a inglés
  assert.strictEqual(i18n.t('sections.fix'), 'Bug Fixes');
});

// ---------------------------------------------------------------------------
// 4. Helpers auxiliares unflatten y deepMerge
// ---------------------------------------------------------------------------

test('unflatten - convierte claves con puntos en estructura anidada', () => {
  const flat = {
    'a.b.c': 'valor1',
    'a.b.d': 'valor2',
    'x': 'valor3',
  };
  const nested = unflatten(flat);
  assert.deepStrictEqual(nested, {
    a: {
      b: {
        c: 'valor1',
        d: 'valor2',
      },
    },
    x: 'valor3',
  });
});

test('deepMerge - fusiona recursivamente preservando nodos existentes', () => {
  const base = {
    sections: { feat: 'A', fix: 'B' },
    pap: { title: 'T1' },
  };
  const override = {
    sections: { feat: 'A_MOD' },
  };
  const merged = deepMerge(base, override);
  assert.strictEqual(merged.sections.feat, 'A_MOD');
  assert.strictEqual(merged.sections.fix, 'B');
  assert.strictEqual(merged.pap.title, 'T1');
});
