module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react-hooks'],
  globals: { google: 'readonly' },
  ignorePatterns: ['dist/**', 'mockup/**', 'node_modules/**'],
  rules: {
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
}
