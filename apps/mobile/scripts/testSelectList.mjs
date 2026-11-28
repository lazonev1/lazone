import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../components/ui/SelectList.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const resources = Object.fromEntries(['en', 'fr'].map(language => [language,
  JSON.parse(readFileSync(new URL(`../localization/locales/${language}/common.json`, import.meta.url), 'utf8')).select,
]));
let state = false;
let language = 'en';
let height = 600;
const focused = [];
const exports = {};
const native = {
  View: 'View', TouchableOpacity: 'TouchableOpacity', Modal: 'Modal', FlatList: 'FlatList',
  StyleSheet: { create: value => value },
  useColorScheme: () => 'light',
  useWindowDimensions: () => ({ height }),
  findNodeHandle: target => target,
  AccessibilityInfo: { setAccessibilityFocus: target => focused.push(target) },
};
runInNewContext(`(function(require, exports) { ${compiled}\n})`)(name => {
  if (name === 'react-native') return native;
  if (name === 'react') return { useState: () => [state, value => { state = value; }], useRef: () => ({ current: null }) };
  if (name === '@/components/ThemedText') return { ThemedText: 'ThemedText' };
  if (name === '@/components/ThemedView') return { ThemedView: 'ThemedView' };
  if (name === '@/constants/Colors') return { Colors: { light: { text: '#000', background: '#fff' } } };
  if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
  if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) };
  if (name === 'react-i18next') return { useTranslation: () => ({ t: key => resources[language][key.split('.')[1]] }) };
  return require(name);
}, exports);

function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(elements)];
}
const find = (tree, predicate) => elements(tree).find(predicate);
const options = Array.from({ length: 200 }, (_, index) => ({ value: `option-${index}`, label: `Option ${index}` }));
let selected;
const props = { label: 'Service category', options, onChange: value => { selected = value; } };
let tree = exports.SelectList(props);
let trigger = find(tree, element => element.props.accessibilityState?.expanded !== undefined);
assert.equal(trigger.props.accessibilityRole, 'button');
assert.equal(trigger.props.accessibilityLabel, props.label);
assert.equal(trigger.props.accessibilityValue.text, resources.en.placeholder);
trigger.props.onPress();
tree = exports.SelectList(props);
const modal = find(tree, element => element.type === 'Modal');
assert.equal(modal.props.visible, true);
const list = find(tree, element => element.type === 'FlatList');
assert.equal(list.props.data.length, 200);
assert.ok(list.props.style[1].maxHeight < height, 'list must have a viewport smaller than the screen');
assert.equal(list.props.keyExtractor(options[199]), 'option-199');
const last = list.props.renderItem({ item: options[199] });
assert.equal(last.props.accessibilityRole, 'radio');
assert.equal(last.props.accessibilityState.checked, false);
last.props.onPress();
assert.equal(selected, 'option-199');
assert.equal(state, false, 'selection closes the modal');
tree = exports.SelectList({ ...props, value: selected });
assert.equal(find(tree, element => element.props.accessibilityValue).props.accessibilityValue.text, 'Option 199');
const selectedRow = find(tree, element => element.type === 'FlatList').props.renderItem({ item: options[199] });
assert.equal(selectedRow.props.accessibilityState.checked, true);
const header = find(tree, element => element.props.accessibilityRole === 'header');
trigger = find(tree, element => element.props.accessibilityState?.expanded !== undefined);
header.props.ref.current = 22;
trigger.props.ref.current = 11;
const finalModal = find(tree, element => element.type === 'Modal');
finalModal.props.onShow();
finalModal.props.onDismiss();
assert.deepEqual(focused, [22, 11], 'focus enters the modal and returns to its trigger');
state = true;
finalModal.props.onRequestClose();
assert.equal(state, false, 'Android back closes the modal');
state = true;
find(tree, element => element.props.accessibilityViewIsModal).props.onAccessibilityEscape();
assert.equal(state, false);
language = 'fr';
height = 320;
tree = exports.SelectList({ ...props, options: [], disabled: true, error: 'Required' });
trigger = find(tree, element => element.props.accessibilityState?.expanded !== undefined);
assert.equal(trigger.props.disabled, true);
assert.equal(trigger.props.accessibilityValue.text, resources.fr.placeholder);
assert.ok(find(tree, element => element.props.accessibilityRole === 'alert'));
assert.equal(find(tree, element => element.type === 'FlatList').props.ListEmptyComponent.props.children, resources.fr.empty);
assert.deepEqual(Object.keys(resources.en).sort(), Object.keys(resources.fr).sort());
console.log('SelectList checks passed: 200 options, last-item selection, bounded viewport, selected/disabled/error states, close/back/escape, focus callbacks, and EN/FR copy.');
