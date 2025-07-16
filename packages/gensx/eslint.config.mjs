import rootConfig from "../../eslint.config.mjs";

export default [
  {
    ignores: ["**/coverage/**", "**/templates/**"],
  },
  ...rootConfig,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "n/prefer-node-protocol": "error",
    },
  },
];
