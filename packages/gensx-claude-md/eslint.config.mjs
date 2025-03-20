import baseConfig from "../../eslint.config.mjs";

export default [
  ...baseConfig,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "no-console": ["error", { allow: ["info", "error", "warn", "log"] }],
      "n/no-process-exit": "off",
      "n/shebang": "off",
    },
  },
];
