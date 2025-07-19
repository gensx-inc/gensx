# GenSX Chat Template

[![Use this template](https://img.shields.io/badge/use%20this%20template-black?style=for-the-badge&logo=github)](https://github.com/gensx-inc/chat-ux-template/generate)

This is a [Next.js](https://nextjs.org) chat template for [GenSX](https://gensx.com) with streaming chat, thinking, and tools built in. It also includes chat history stored using `@gensx/storage`.

![Chat UX Screenshot](./public/chat-ux.png)

## Getting started

To get started, first install the dependencies:

```bash
pnpm install
```

Then export the environment variables. For this template, you'll need both the [OpenAI API key](https://platform.openai.com) and the [Firecrawl API key](https://www.firecrawl.dev/):

```bash
export OPENAI_API_KEY=...
export FIRECRAWL_API_KEY=...
```

```bash
pnpm run dev
```

This will start both the Next.js app as well as the local GenSX dev server. The app will be available at [http://localhost:3000](http://localhost:3000) and the GenSX dev server will be available at [http://localhost:1337](http://localhost:1337/swagger-ui).

## Deploying the app

### Deploying the GenSX workflows

To deploy the GenSX workflows, run:

```bash
pnpm run deploy
```

### Deploying the Next.js app

The easiest way to deploy your Next.js app is to use [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Once you deploy, make sure to set the following environment variables so the app can access the GenSX workflows:

```bash
export GENSX_API_KEY=...
export GENSX_ORG=...
export GENSX_PROJECT=chat-tools
export GENSX_ENV=default
```
