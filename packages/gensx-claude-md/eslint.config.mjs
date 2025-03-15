import baseConfig from "../../eslint.config.mjs";

export default [
  ...baseConfig,
  {
    files: ["**/*.{js,ts,mjs,cjs,jsx,tsx}"],
    rules: {},
  },
];