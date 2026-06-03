// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    // Jest config/setup files run in the Node + Jest environment.
    files: ['jest.setup.js', '*.config.js'],
    languageOptions: {
      globals: { jest: 'readonly', require: 'readonly', module: 'writable' },
    },
  },
]);
