import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const same = (a, b) => a && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
function harness() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  return {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
        return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useRef(initial) { const index = cursor++; return slots[index] ?? (slots[index] = { current: initial }); },
      useCallback(fn, deps) {
        const index = cursor++;
        if (!same(slots[index]?.deps, deps)) slots[index] = { deps, fn };
        return slots[index].fn;
      },
      useEffect(effect, deps) {
        const index = cursor++;
        if (same(slots[index]?.deps, deps)) return;
        const previous = slots[index];
        effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
      },
    },
    render(Component, props = {}) {
      cursor = 0;
      const tree = Component(props);
      const pending = effects; effects = []; pending.forEach(effect => effect());
      return tree;
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function load(path, dependencies) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  runInNewContext(`(function(require, exports) { ${compiled}\n})`, { console: { error() {} } })(name =>
    name in dependencies ? dependencies[name] : require(name), exports);
  return exports;
}
const all = tree => !tree || typeof tree !== 'object' ? []
  : [tree, ...[tree.props?.children].flat(Infinity).flatMap(all)];
const find = (tree, type) => all(tree).find(element => element.type === type);
const native = {
  View: 'View', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: value => value }, Appearance: { getColorScheme: () => 'light' }, Alert: { alert() {} },
};
const shared = {
  'react-native': native,
  '@/constants/Colors': { Colors: { light: {}, dark: {} } },
  '@/components/ThemedText': { ThemedText: 'ThemedText' },
  '@lazone/ui': { Button: 'Button' },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  'react-i18next': { useTranslation: () => ({ t: key => key }) },
};

let ids = 0;
const stepHarness = harness();
const { default: Step } = load('../components/provider/ServiceDetailsStep.tsx', {
  ...shared, react: stepHarness.react,
  '@/components/ui/TextBox': { TextBox: 'TextBox' },
  '@/components/ui/ImagePicker': { PortfolioImagePicker: 'PortfolioImagePicker' },
  './CertificationUploader': { CertificationUploader: 'CertificationUploader' },
  '@/utils/generateId': { generateServiceId: () => `service-${++ids}` },
  '@/utils/validation': { validateService: () => ({ isValid: true, errors: {} }), validateCertification: () => ({ isValid: true, errors: {} }) },
  '@/constants/Marketplace': { MARKETPLACE_LIMITS: { maxProviderServices: 20 } },
});
let draft;
const stepProps = { initialData: {}, onSubmit() {}, onBack() {}, onDraftChange: value => { draft = value; } };
let tree = stepHarness.render(Step, stepProps);
find(tree, 'TextBox').props.onChangeText('A durable draft service');
tree = stepHarness.render(Step, stepProps);
assert.equal(draft.services[0].name, 'A durable draft service');
assert.equal(ids, 1, 'rerenders must not reserve new service IDs');
stepHarness.unmount();
const restoredHarness = harness();
const { default: RestoredStep } = load('../components/provider/ServiceDetailsStep.tsx', {
  ...shared, react: restoredHarness.react,
  '@/components/ui/TextBox': { TextBox: 'TextBox' },
  '@/components/ui/ImagePicker': { PortfolioImagePicker: 'PortfolioImagePicker' },
  './CertificationUploader': { CertificationUploader: 'CertificationUploader' },
  '@/utils/generateId': { generateServiceId: () => `service-${++ids}` },
  '@/utils/validation': {}, '@/constants/Marketplace': { MARKETPLACE_LIMITS: { maxProviderServices: 20 } },
});
tree = restoredHarness.render(RestoredStep, { ...stepProps, initialData: draft });
assert.equal(find(tree, 'TextBox').props.value, 'A durable draft service');
assert.equal(ids, 1);

const routeHarness = harness();
let auth = { user: { uid: 'owner' }, userProfile: { _id: 'owner' }, refreshUserProfile: async () => {} };
let params = {};
let saves = 0;
let rejectSave;
let resolveSave;
let retries = 0;
let alerts = 0;
let providerState = {
  provider: null, isLoading: false, refetch: async () => { retries++; },
  saveProviderProfile: () => { saves++; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); },
};
native.Alert.alert = () => { alerts++; };
const { default: Route } = load('../app/provider/registration.tsx', {
  ...shared, react: routeHarness.react,
  '@/components/provider/BusinessInfoStep': { default: 'BusinessInfoStep' },
  '@/components/provider/ServiceDetailsStep': { default: 'ServiceDetailsStep' },
  'expo-router': { Stack: { Screen: 'StackScreen' }, useRouter: () => ({ push() {}, back() {} }), useLocalSearchParams: () => params },
  '@/hooks/useProvider': { useProvider: () => providerState },
  '@/contexts/auth': { useAuth: () => auth },
  '@/components/auth/LoginPrompt': { LoginPrompt: 'LoginPrompt' },
});
const Form = Route().type;
tree = routeHarness.render(Form);
find(tree, 'BusinessInfoStep').props.onNext({ businessName: 'Draft business' });
tree = routeHarness.render(Form);
find(tree, 'ServiceDetailsStep').props.onDraftChange(draft);
tree = routeHarness.render(Form);
const back = find(tree, 'StackScreen').props.options.headerLeft();
back.props.onPress();
tree = routeHarness.render(Form);
assert.equal(find(tree, 'BusinessInfoStep').props.initialData.services[0].name, 'A durable draft service');
find(tree, 'BusinessInfoStep').props.onNext({ businessName: 'Draft business' });
tree = routeHarness.render(Form);
const submit = find(tree, 'ServiceDetailsStep').props.onSubmit;
const firstSave = submit(draft);
const duplicateSave = submit(draft);
assert.equal(saves, 1);
rejectSave(new Error('offline'));
await Promise.all([firstSave, duplicateSave]);
tree = routeHarness.render(Form);
assert.equal(find(tree, 'ServiceDetailsStep').props.initialData.services[0].name, 'A durable draft service');
assert.equal(alerts, 1);
// A completed old-account request must not navigate or report success after unmount.
const oldSave = find(tree, 'ServiceDetailsStep').props.onSubmit(draft);
routeHarness.unmount();
resolveSave('owner');
await oldSave;
assert.equal(alerts, 1);
auth = { ...auth, user: { uid: 'new-owner' } };
assert.equal(Route().key, 'new-owner', 'changing account remounts the session form');
auth = { ...auth, user: null };
assert.equal(find(routeHarness.render(Form), 'LoginPrompt').type, 'LoginPrompt');
auth = { user: { uid: 'owner' }, userProfile: { _id: 'owner' } };
params = { editMode: 'true', providerId: 'someone-else' };
tree = routeHarness.render(Form);
assert.equal(find(tree, 'BusinessInfoStep'), undefined);
params = { editMode: 'true', providerId: 'owner' };
providerState = { ...providerState, provider: null, isLoading: false };
tree = routeHarness.render(Form);
assert.equal(find(tree, 'BusinessInfoStep'), undefined, 'failed edit load must not expose an empty new form');
find(tree, 'Button').props.onPress();
assert.equal(retries, 1);
console.log('Provider form recovery tests passed: draft publication/restoration, stable IDs, Back/forward, failed save, duplicate submit, stale session, owner guard, signed-out access, and failed-load Retry.');
