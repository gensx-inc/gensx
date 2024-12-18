const config = {
  "**/*.{ts?(x),mts}": () => "tsc -p tsconfig.prod.json --noEmit",
  "*.{js,jsx,mjs,cjs,ts,mts}": ["pnpm lint:file"],
  "*.{md,json}": "prettier --write",
};

export default config;
