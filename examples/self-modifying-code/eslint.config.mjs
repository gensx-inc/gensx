import rootConfig from '../../eslint.config.mjs'
import examplesConfig from '../eslint.config.mjs'

export default [
  ...rootConfig,
  ...examplesConfig,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: './tsconfig.json',
      },
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'double'],
      indent: ['error', 2],
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
]
