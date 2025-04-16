import MarkdownRenderer from "../../../components/MarkdownRenderer";

export default function TermsOfUsePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <MarkdownRenderer relativePath="legal/terms-of-use/terms-of-use.md" />
    </div>
  );
}
