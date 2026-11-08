import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = new URL('../../../packages/ui/src/', import.meta.url);
function load(file, dependencies = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(file, root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(`(function(require, exports) { ${compiled}\n})`)(name => {
    if (name in dependencies) return dependencies[name];
    return require(name);
  }, exports);
  return exports;
}
const tokens = load('buttonTokens.ts');
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const ratios = {};
for (const [variant, colors] of Object.entries(tokens.buttonColors)) {
  const ratio = contrast(colors.background, colors.foreground);
  assert.ok(ratio >= 4.5, `${variant}: normal text contrast ${ratio} is below 4.5`);
  ratios[variant] = ratio.toFixed(2);
}
assert.ok(tokens.buttonMinimumTarget >= 48);
const { default: Button } = load('Button.tsx', {
  './buttonTokens': tokens,
  'react-native': {
    Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: value => value },
  },
});
const flatten = styles => Object.assign({}, ...[styles].flat(Infinity).filter(Boolean));
const elements = tree => !tree || typeof tree !== 'object' ? []
  : [tree, ...[tree.props?.children].flat(Infinity).flatMap(elements)];
let presses = 0;
for (const variant of ['primary', 'secondary', 'success']) for (const size of ['small', 'medium', 'large']) {
  const tree = Button({ label: 'A long translated action that may wrap', onPress: () => presses++, variant, size });
  const surface = flatten(tree.props.style);
  const text = elements(tree).find(element => element.type === 'Text');
  assert.ok(surface.minHeight >= 48 && surface.minWidth >= 48);
  assert.equal(surface.height, undefined, 'large text must be able to increase button height');
  assert.equal(text.props.numberOfLines, undefined, 'action labels must not be truncated to one line');
  assert.equal(flatten(text.props.style).fontFamily, undefined, 'do not require an unregistered custom font');
  assert.equal(tree.props.accessibilityRole, 'button');
  assert.equal(tree.props.accessibilityLabel, 'A long translated action that may wrap');
  assert.equal(tree.props.accessibilityState.disabled, false);
  tree.props.onPress();
}
assert.equal(presses, 9);
for (const flags of [{ disabled: true }, { loading: true }, { disabled: true, loading: true }]) {
  const tree = Button({ label: 'Save', onPress: () => presses++, ...flags, style: { backgroundColor: '#000' }, textStyle: { color: '#000' } });
  assert.equal(tree.props.disabled, true);
  assert.equal(tree.props.accessibilityState.disabled, true);
  assert.equal(tree.props.accessibilityState.busy, Boolean(flags.loading));
  tree.props.onPress();
  assert.equal(presses, 9, 'disabled/loading must guard the action handler');
  assert.equal(flatten(tree.props.style).backgroundColor, tokens.buttonColors.disabled.background);
  const text = elements(tree).find(element => element.type === 'Text');
  assert.equal(flatten(text.props.style).color, tokens.buttonColors.disabled.foreground);
  assert.equal(Boolean(elements(tree).find(element => element.type === 'ActivityIndicator')), Boolean(flags.loading));
}
const custom = Button({ label: 'Save', accessibilityLabel: 'Save profile', accessibilityHint: 'Stores your edits', testID: 'save-profile', onPress() {} });
assert.equal(custom.props.accessibilityLabel, 'Save profile');
assert.equal(custom.props.accessibilityHint, 'Stores your edits');
assert.equal(custom.props.testID, 'save-profile');
console.log(`Shared button checks passed: contrast ${JSON.stringify(ratios)}, all variant/size targets, wrapping/system font, accessible names/states, disabled/loading guard, and custom props.`);
