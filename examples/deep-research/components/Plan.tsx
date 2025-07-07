import { MarkdownContent } from "./MarkdownContent";
import { TimelineSection } from "./TimelineSection";

interface PlanProps {
  researchBrief: string;
  expanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
}

export function Plan({
  researchBrief,
  expanded,
  onToggle,
  isActive,
}: PlanProps) {
  return (
    <TimelineSection
      title="Planning"
      expanded={expanded}
      onToggle={onToggle}
      isActive={isActive}
    >
      <div className="text-zinc-300">
        <MarkdownContent
          content={researchBrief}
          className="text-sm [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-base [&_h5]:text-sm [&_h6]:text-xs [&_p]:text-sm [&_li]:text-sm"
        />
      </div>
    </TimelineSection>
  );
}
