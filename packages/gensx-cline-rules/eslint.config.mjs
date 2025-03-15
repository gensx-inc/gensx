import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    rules: {
      "no-console": "off",
      "n/shebang": "off",
      "n/no-process-exit": "off",
    },
  },
];