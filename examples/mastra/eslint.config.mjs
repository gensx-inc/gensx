import rootConfig from "../../eslint.config.mjs";
import examplesConfig from "../eslint.config.mjs";

export default [
  ...rootConfig,
  ...examplesConfig,
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
