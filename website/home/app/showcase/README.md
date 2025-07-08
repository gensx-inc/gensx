# Showcase Page

This directory contains the showcase page that displays demo applications built with GenSX.

## How to Add a New Showcase Item

1. **Add your showcase data** to the `showcaseItems` array in `showcase-client.tsx`:

```typescript
{
  id: "unique-id",
  title: "Your App Title",
  description: "A brief description of what your app does (1-2 sentences).",
  image: "/assets/showcase/your-app-screenshot.png", // Optional
  demo: "https://your-app.vercel.app", // Optional - Link to live demo
  github: "https://github.com/your-repo", // Optional - Link to GitHub repo
  tags: ["Tag1", "Tag2", "Tag3"], // 2-4 relevant tags
}
```

Note: You can include either `demo`, `github`, or both links. At least one link is recommended.

2. **Add a screenshot** (optional but recommended):

   - Place your screenshot in `/website/home/public/assets/showcase/`
   - Use a 16:9 aspect ratio (e.g., 1920x1080 or 1280x720)
   - Name it to match the image path in your showcase item

3. **Keep it concise**:
   - Title: Short and descriptive
   - Description: 1-2 sentences explaining the main functionality
   - Tags: 2-4 relevant technology or feature tags

## Example

```typescript
{
  id: "ai-chatbot",
  title: "AI Customer Support Bot",
  description: "An intelligent chatbot that handles customer inquiries using natural language processing and GenSX workflows.",
  image: "/assets/showcase/ai-chatbot.png",
  demo: "https://ai-chatbot-demo.vercel.app",
  github: "https://github.com/example/ai-chatbot",
  tags: ["AI", "Chat", "Customer Support"],
}
```

## Notes

- The showcase items are displayed in a responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile)
- Each card has hover effects with decorative corner elements matching the site's design
- Cards link to external demos or GitHub repositories
- If no image is provided, a placeholder will be shown
