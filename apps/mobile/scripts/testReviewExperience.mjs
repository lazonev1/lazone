import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, mocks = {}) => {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(`(function(require, exports) { ${outputText}\n})`)(name => mocks[name] ?? require(name), exports);
  return exports;
};
const sorting = load('utils/reviewPresentation.ts');
const reviews = [
  { id: 'old-high', date: '2025-01-01', rating: 5, clientName: 'Old high', userId: 'author', providerId: 'provider', comment: 'Original' },
  { id: 'new-low', date: '2025-10-01', rating: 2, clientName: 'New low', userId: 'someone', providerId: 'provider', response: { text: 'Existing reply', date: '' } },
  { id: 'new-high', date: '2025-09-01', rating: 5, clientName: 'New high', userId: 'someone', providerId: 'provider' },
  { id: 'legacy', date: '', rating: NaN, clientName: 'Legacy', userId: 'someone', providerId: 'provider' },
];
const ids = values => Array.from(values, value => value.id).join(',');
assert.equal(ids(sorting.sortReviews(reviews, 'recent')), 'new-low,new-high,old-high,legacy');
assert.equal(ids(sorting.sortReviews(reviews, 'highest')), 'new-high,old-high,new-low,legacy');
assert.equal(ids(sorting.sortReviews(reviews, 'lowest')), 'new-low,new-high,old-high,legacy');
assert.equal(ids(reviews), 'old-high,new-low,new-high,legacy');

// Run the actual component handlers against lightweight native element stubs.
let slots = [];
let index = 0;
let alerts = 0;
const react = {
  useState(initial) {
    const i = index++;
    if (!(i in slots)) slots[i] = initial;
    return [slots[i], value => { slots[i] = value; }];
  },
  useRef(initial) {
    const i = index++;
    slots[i] ??= { current: initial };
    return slots[i];
  },
  useMemo: factory => factory(),
};
const { default: Reviews } = load('components/reviews/ReviewsComponent.tsx', {
  react,
  'react-native': {
    ...Object.fromEntries(['View', 'ScrollView', 'TouchableOpacity', 'ActivityIndicator', 'TextInput', 'Image'].map(key => [key, key])),
    StyleSheet: { create: styles => styles }, Appearance: { getColorScheme: () => 'light' },
    Alert: { alert: () => alerts++ },
  },
  '@/components/ThemedText': { ThemedText: 'ThemedText' },
  '@/components/ThemedView': { ThemedView: 'ThemedView' },
  '@lazone/ui': { Button: 'Button' },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  '@/constants/Colors': { Colors: { light: {} } },
  '@/utils/auth': { requireAuth: () => true },
  'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'en' } }) },
  '@/utils/reviewPresentation': sorting,
});
const props = { reviews, stats: { averageRating: 4, totalReviews: 4, ratingCounts: [0, 1, 0, 0, 2] }, expandedByDefault: true };
const all = tree => tree && typeof tree === 'object'
  ? [tree, ...[tree.props?.children].flat(Infinity).flatMap(all)] : [];
const render = extra => { index = 0; return all(Reviews({ ...props, ...extra })); };
const control = (tree, text) => tree.find(node => node.props?.onPress &&
  (node.props.label === text || node.props.accessibilityLabel === text || all(node).some(child => child.props?.children === text)));
const displayed = tree => tree.map(node => node.props?.children)
  .filter(value => reviews.some(review => review.clientName === value)).join(',');

let tree = render();
assert.equal(displayed(tree), 'New low,New high,Old high,Legacy');
control(tree, 'reviews.filters.highest').props.onPress();
tree = render();
assert.equal(displayed(tree), 'New high,Old high,New low,Legacy');
assert.equal(control(tree, 'reviews.filters.highest').props.accessibilityState.selected, true);
control(tree, 'reviews.filters.lowest').props.onPress();
assert.equal(displayed(render()), 'New low,New high,Old high,Legacy');

let retried = 0;
tree = render({ reviews: [], hasLoadError: true, onRetry: () => retried++ });
assert.ok(tree.some(node => node.props?.children === 'reviews.loadFailed'));
assert.ok(!tree.some(node => node.props?.children === 'reviews.emptyTitle'));
control(tree, 'reviews.retry').props.onPress();
assert.equal(retried, 1);
assert.equal(displayed(render({ hasLoadError: true, isLoading: true })), 'New low,New high,Old high,Legacy');
assert.ok(!control(render({ onRespondToReview: async () => {} }), 'reviews.editResponse'));

slots = [];
let writes = 0;
let fail = true;
const owner = {
  currentUserId: 'provider',
  allowResponding: true,
  onRespondToReview: async (id, text) => {
    writes++;
    assert.equal(id, 'new-low');
    assert.equal(text, 'Updated reply');
    if (fail) throw new Error('offline');
  },
};
control(render(owner), 'reviews.editResponse').props.onPress();
let input = render(owner).find(node => node.type === 'TextInput');
assert.equal(input.props.value, 'Existing reply');
input.props.onChangeText('  Updated reply  ');
const submit = control(render(owner), 'reviews.submit').props.onPress;
await Promise.all([submit(), submit()]);
assert.equal(writes, 1);
assert.equal(alerts, 1);
assert.equal(render(owner).find(node => node.type === 'TextInput').props.value, '  Updated reply  ');
fail = false;
await control(render(owner), 'reviews.submit').props.onPress();
assert.ok(!render(owner).some(node => node.type === 'TextInput'));

// Write acknowledgement must not require a second network read.
const service = {
  createReview: async data => { assert.equal(data.images.length, 0); return 'review-id'; },
  updateReview: async () => {},
  addProviderResponse: async () => {},
  getReviewById: () => { throw new Error('read after write'); },
};
const repo = load('repositories/reviewRepository.ts', {
  '@/backend/main/src/services/reviewService': service,
  '@/backend/main/src/services/publicProfileService': {},
});
assert.equal(await repo.addReview('provider', { requesterId: 'author', rating: 5, comment: '', bookingId: 'booking', serviceId: 'service' }), 'review-id');
await repo.updateReview('review-id', { rating: 4 });
await repo.respondToReview('review-id', 'Thank you');
assert.equal(repo.calculateReviewStats(reviews).averageRating, 4);

for (const ns of ['provider', 'booking']) {
  const section = ns === 'provider' ? 'reviews' : 'review';
  const keys = lang => Object.keys(JSON.parse(readFileSync(new URL(`../localization/locales/${lang}/${ns}.json`, import.meta.url), 'utf8'))[section]).sort();
  assert.deepEqual(keys('en'), keys('fr'));
}
console.log('Review regression checks passed: sorting, retry vs empty, reply authorization/draft, duplicate taps, write acknowledgement, statistics and EN/FR keys.');
