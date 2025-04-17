import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <MarkdownRenderer relativePath="legal/privacy-policy/privacy-policy.md" />
    </div>
  );
}
