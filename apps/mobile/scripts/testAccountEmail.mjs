import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL('../components/account/EditInfoPopup.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const resources = Object.fromEntries(['en', 'fr'].map(language => [language,
  JSON.parse(readFileSync(new URL(`../localization/locales/${language}/account.json`, import.meta.url), 'utf8')).info,
]));
let language = 'en';
let states = [];
let cursor = 0;
let effects = [];
let alerts = [];
let saved;
let fail = false;
let closes = 0;
const exports = {};
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in states)) states[index] = initial;
    return [states[index], value => { states[index] = value; }];
  },
  useEffect(effect) { effects.push(effect); },
};
runInNewContext(`(function(require, exports) { ${compiled}\n})`)(name => {
  const dependencies = {
    react,
    'react-native': { View: 'View', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: value => value }, Appearance: { getColorScheme: () => 'light' }, Alert: { alert: (...args) => alerts.push(args) } },
    './BottomPopup': { BottomPopup: 'BottomPopup' },
    './EditableField': { default: 'EditableField' },
    '@lazone/ui': { Button: 'Button' },
    '@/components/ThemedText': { ThemedText: 'ThemedText' },
    '@/constants/Colors': { Colors: { light: { tint: '#0A58A5' } } },
    '@/contexts/auth': { useAuth: () => ({ updateProfile: async data => { if (fail) throw new Error('offline'); saved = data; } }) },
    'react-i18next': { useTranslation: () => ({ t: key => key.startsWith('info.editPopup.')
      ? resources[language].editPopup[key.split('.').at(-1)] : key === 'info.noEmail' ? resources[language].noEmail : key }) },
  };
  return name in dependencies ? dependencies[name] : require(name);
}, exports);
const all = tree => !tree || typeof tree !== 'object' ? []
  : [tree, ...[tree.props?.children].flat(Infinity).flatMap(all)];
const props = { visible: true, onClose: () => { closes++; }, initialData: { firstName: 'Old', lastName: 'Name', email: 'real@example.test', phone: '+22612345' } };
function render(data = props, commit = false) {
  cursor = 0; effects = [];
  const tree = exports.default(data);
  if (commit) effects.forEach(effect => effect());
  return tree;
}
render(props, true);
let tree = render();
let fields = all(tree).filter(element => element.type === 'EditableField');
assert.equal(fields.length, 3, 'only names and contact phone should be editable');
assert.ok(!fields.some(field => field.props.keyboardType === 'email-address'));
const email = all(tree).find(element => element.props.selectable);
assert.equal(email.props.children, props.initialData.email);
assert.equal(email.props.onChangeText, undefined);
assert.ok(all(tree).some(element => element.props.children === resources.en.editPopup.emailReadOnlyHint));
fields[0].props.onChangeText('  New  ');
fields[2].props.onChangeText('  +22698765  ');
tree = render();
all(tree).find(element => element.type === 'Button' && element.props.variant === 'primary').props.onPress();
await alerts.at(-1)[2][1].onPress();
assert.equal(saved.firstName, 'New');
assert.equal(saved.phoneNumber, '+22698765');
assert.equal(Object.keys(saved).sort().join(','), 'firstName,lastName,phoneNumber');
assert.equal(closes, 1);
fail = true;
fields = all(render()).filter(element => element.type === 'EditableField');
fields[0].props.onChangeText('Keep this draft');
all(render()).find(element => element.type === 'Button' && element.props.variant === 'primary').props.onPress();
await alerts.at(-1)[2][1].onPress();
assert.equal(closes, 1, 'failure must not close the popup');
assert.equal(all(render()).find(element => element.type === 'EditableField').props.value, 'Keep this draft');
language = 'fr';
tree = render({ ...props, initialData: { ...props.initialData, email: 'updated@example.test' } });
assert.equal(all(tree).find(element => element.props.selectable).props.children, 'updated@example.test');
assert.ok(all(tree).some(element => element.props.children === resources.fr.editPopup.emailReadOnlyHint));
tree = render({ ...props, initialData: { ...props.initialData, email: '' } });
assert.equal(all(tree).find(element => element.props.selectable).props.children, resources.fr.noEmail);
console.log('Account email tests passed: read-only/copyable Auth email, EN/FR explanation, empty email, unchanged name/phone writes, and failed-save draft preservation.');
