module.exports =  {
  parser:  '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'lit',
  ],
  extends:  [
    'eslint-config-airbnb-base',
    'eslint-config-airbnb-base/rules/strict',
    'plugin:@typescript-eslint/recommended',
    'plugin:lit/recommended',
  ],
  parserOptions:  {
    ecmaVersion:  2018,
    sourceType:  'module',
    project: 'tsconfig.json',
  },
  rules: {
    'import/prefer-default-export': 'off',
    'semi': [2, 'never'],
    'no-undef': 'off',
    'consistent-return': 'off',
    'class-methods-use-this': 'off',
    'no-restricted-syntax': 'off',
    'no-restricted-globals': 'off',
    '@typescript-eslint/member-delimiter-style': 0,
    'indent': ['error', 2, { 'ignoredNodes': ['TemplateLiteral *'] }],
    '@typescript-eslint/indent': ['off', 2],
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/explicit-function-return-type': [
      'off',
      {
        allowExpressions: false,
        allowTypedFunctionExpressions: false,
      },
    ],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  env: {
    browser: true,
  }
}