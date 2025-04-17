import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <MarkdownRenderer relativePath="legal/terms-of-service/terms-of-service.md" />
    </div>
  );
}
