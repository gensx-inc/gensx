import baseConfig from "../../eslint.config.mjs";

export default [
  ...baseConfig,
  {
    files: ["**/*.{js,ts,mjs,cjs,jsx,tsx}"],
    rules: {
      "no-console": ["error", { allow: ["info", "error", "warn", "log"] }],
      "n/no-process-exit": "off",
      "n/shebang": "off",
    },
  },
];
