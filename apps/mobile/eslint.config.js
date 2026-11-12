// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', '.expo/**'],
  },
  expoConfig,
  {
    rules: {
      // SDK 57 enables React Compiler diagnostics. Keep them visible during the
      // migration without making long-standing Animated/effect patterns fail CI.
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
