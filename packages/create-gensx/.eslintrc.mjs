export default {
  extends: ["../../.eslintrc.json"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: import.meta.dirname,
  },
};
