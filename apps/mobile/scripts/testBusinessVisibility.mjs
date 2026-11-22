import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../app/(tabs)/account.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
let role = 'provider';
let user = { uid: 'demo' };
let destination;
const menus = { general: ['Saved Providers'], settings: ['Settings'], support: ['Support'] };
const mocks = {
  'react-native': {
    ...Object.fromEntries(['View', 'SafeAreaView', 'Image', 'ScrollView', 'TouchableOpacity', 'ActivityIndicator', 'Switch'].map(name => [name, name])),
    Appearance: { getColorScheme: () => 'light' }, StyleSheet: { create: styles => styles },
  },
  'expo-router': { useRouter: () => ({ push: value => { destination = value; } }) },
  '@/components/ThemedText': { ThemedText: 'ThemedText' },
  '@/components/ThemedView': { ThemedView: 'ThemedView' },
  '@/constants/Colors': { Colors: { light: {} } },
  '@/constants/account': { getProfileMenuItems: () => menus },
  'react-i18next': { useTranslation: () => ({ t: key => key }) },
  '@/components/ui/MenuSection': { MenuSection: 'MenuSection' },
  '@/contexts/auth': { useAuth: () => ({ user, userProfile: user ? { role, firstName: 'Test' } : null }) },
  '@lazone/ui': { Button: 'Button' },
  '@/components/auth/LoginPrompt': { LoginPrompt: 'LoginPrompt' },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  '../../assets/images/icon.png': 1,
};
const exports = {};
runInNewContext(`(function(require, exports) { ${outputText}\n})`)(name => mocks[name] ?? require(name), exports);
const all = tree => tree && typeof tree === 'object'
  ? [tree, ...[tree.props?.children].flat(Infinity).flatMap(all)] : [];
for (role of ['provider', 'both', 'requester']) {
  const tree = all(exports.default());
  assert.ok(!tree.some(element => element.type === 'Switch'));
  assert.deepEqual(tree.filter(node => node.type === 'MenuSection').map(node => node.props.items), Object.values(menus));
  const enroll = tree.find(node => node.type === 'TouchableOpacity' &&
    all(node).some(child => child.props?.children === 'provider:registration.title'));
  assert.equal(Boolean(enroll), role === 'requester');
  if (enroll) {
    enroll.props.onPress();
    assert.equal(destination, '/provider/registration');
  }
}
user = null;
assert.equal(exports.default().type, 'LoginPrompt');
for (const lang of ['en', 'fr']) {
  const { tab } = JSON.parse(readFileSync(new URL(`../localization/locales/${lang}/account.json`, import.meta.url), 'utf8'));
  assert.ok(!Object.keys(tab).some(key => /^business(Visibility|Visible|Hidden)$/.test(key)));
}
console.log('Account visibility checks passed: no nonfunctional switch or promises, and provider, requester and guest account paths remain intact.');
