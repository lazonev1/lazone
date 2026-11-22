import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createInstance } from 'i18next';
import ts from 'typescript';

function leaves(resource, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(resource)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      assert.ok(value.trim(), `${path} must not be blank`);
      result[path] = value;
    } else {
      assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${path} must be a string or namespace object`);
      Object.assign(result, leaves(value, path));
    }
  }
  return result;
}
function placeholders(value) {
  const matches = [...value.matchAll(/{{\s*-?\s*([^{}]+?)\s*}}/g)];
  const remaining = value.replace(/{{[^{}]*}}/g, '');
  assert.ok(!remaining.includes('{{') && !remaining.includes('}}'), `Malformed placeholder: ${value}`);
  return [...new Set(matches.map(match => match[1].split(',')[0].trim()))].sort();
}
function validatePair(english, french) {
  const en = leaves(english);
  const fr = leaves(french);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort(), 'EN/FR leaf keys differ');
  for (const key of Object.keys(en)) assert.deepEqual(placeholders(en[key]), placeholders(fr[key]), `${key}: interpolation variables differ`);
  return { en, fr };
}
assert.throws(() => validatePair({ label: 'Hello' }, {}));
assert.throws(() => validatePair({ label: '{{name}}' }, { label: '{{email}}' }));
assert.throws(() => validatePair({ label: '{{broken' }, { label: '{{broken' }));
assert.throws(() => validatePair({ label: 'ok' }, { label: '' }));
assert.throws(() => validatePair({ label: 'ok' }, { label: [] }));

const root = new URL('../localization/locales/', import.meta.url);
const names = language => readdirSync(new URL(`${language}/`, root)).filter(name => name.endsWith('.json')).sort();
assert.deepEqual(names('en'), names('fr'), 'EN/FR namespace files differ');
const resources = { en: {}, fr: {} };
const namespaces = [];
let leafCount = 0;
for (const file of names('en')) {
  const namespace = file.replace(/\.json$/, '');
  const en = JSON.parse(readFileSync(new URL(`en/${file}`, root), 'utf8'));
  const fr = JSON.parse(readFileSync(new URL(`fr/${file}`, root), 'utf8'));
  const flattened = validatePair(en, fr);
  leafCount += Object.keys(flattened.en).length;
  resources.en[namespace] = en;
  resources.fr[namespace] = fr;
  namespaces.push({ namespace, ...flattened });
}
const instance = createInstance();
await instance.init({ resources, lng: 'en', fallbackLng: false, interpolation: { escapeValue: false } });
for (const language of ['en', 'fr']) {
  await instance.changeLanguage(language);
  for (const { namespace, [language]: entries } of namespaces) {
    for (const [key, value] of Object.entries(entries)) {
      const variables = Object.fromEntries(placeholders(value).map(name => [name, name === 'count' ? 2 : 'VALUE']));
      assert.equal(instance.exists(`${namespace}:${key}`), true);
      const rendered = instance.t(`${namespace}:${key}`, variables);
      assert.ok(!rendered.includes('{{'), `${language}/${namespace}/${key} left a placeholder unresolved`);
    }
  }
}
assert.equal(instance.t('messages:list.fromYou', { text: 'Bonjour' }), 'Vous : Bonjour');
assert.equal(instance.t('explore:search.found', { count: 2 }), '2 résultats trouvés');
await instance.changeLanguage('en');
assert.equal(instance.t('messages:list.fromYou', { text: 'Hello' }), 'You: Hello');
assert.equal(instance.t('explore:search.found', { count: 1 }), 'Found 1 result');

// Compile the real pure helper and adapter, without native localization modules.
function load(relativePath, dependencies = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(`(function(require, exports) { ${compiled}\n})`, { Date })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
}
const dates = load('../utils/dateFormatting.ts');
const adapter = load('../backend/main/src/utils/utils.ts', {
  '@/utils/dateFormatting': dates, '@/localization': { default: instance },
});
assert.equal(dates.appDateLocale('fr-CA'), 'fr-FR');
assert.equal(dates.appDateLocale('en-GB'), 'en-US');
const now = new Date(2026, 5, 20, 14, 30);
assert.equal(dates.conversationDateLabel(now.toISOString(), 'en', now).relative, 'today');
assert.equal(dates.conversationDateLabel(new Date(2026, 5, 19, 23).toISOString(), 'en', now).relative, 'yesterday');
assert.equal(dates.conversationDateLabel('invalid', 'fr', now).text, '');
assert.equal(dates.formatConversationTime('invalid', 'en', now), '');
assert.match(dates.formatConversationTime(now.toISOString(), 'en', now), /PM/);
assert.equal(dates.formatConversationTime(now.toISOString(), 'fr', now), '14:30');
assert.match(dates.conversationDateLabel(new Date(2025, 5, 1).toISOString(), 'en', now).text, /2025/);
// Both the spring-forward and fall-back cases run in a real DST timezone.
const previousZone = process.env.TZ;
process.env.TZ = 'America/New_York';
for (const [current, previous] of [
  [new Date(2026, 2, 9, 0, 30), new Date(2026, 2, 8, 0, 30)],
  [new Date(2026, 10, 2, 0, 30), new Date(2026, 10, 1, 0, 30)],
]) {
  assert.equal(dates.calendarDaysAgo(previous, current), 1);
  assert.equal(dates.conversationDateLabel(previous.toISOString(), 'fr', current).relative, 'yesterday');
}
if (previousZone === undefined) delete process.env.TZ;
else process.env.TZ = previousZone;
const today = new Date().toISOString();
assert.equal(adapter.formatDateDivider(today), 'Today');
await instance.changeLanguage('fr');
assert.equal(adapter.formatDateDivider(today), "Aujourd'hui");
assert.ok(adapter.formatMessageTime(today));
console.log(`Localization checks passed: ${leafCount} keys per language, matching namespaces/interpolation, actual EN/FR rendering/plurals, app-selected dates, invalid dates, year labels, and DST boundaries.`);
