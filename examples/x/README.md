# X Example

This example shows how to create a provider and a related component. In particular, it creates a provider for the [X API](https://docs.x.com/x-api/introduction) and uses it to scrape a page and return the markdown.

For more details on providers, see the [Providers](https://gensx.com/concepts/providers) page.

## Usage

```bash
# Install dependencies
pnpm install

# Set your X API key
export X_API_KEY=<your_api_key>

# Run the example
pnpm run start
```

When you run the example, it will scrape the page at `https://gensx.com/overview/` and return the markdown.
