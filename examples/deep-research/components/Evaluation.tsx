import { TimelineSection } from "./TimelineSection";
import { MarkdownContent } from "./MarkdownContent";
import { Queries } from "./Queries";

interface EvaluationProps {
  analysis: string;
  followUpQueries: string[];
  isSufficient: boolean;
  expanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
}

export function Evaluation({
  analysis,
  followUpQueries,
  expanded,
  onToggle,
  isActive,
}: EvaluationProps) {
  return (
    <>
      <TimelineSection
        title="Evaluating research"
        expanded={expanded}
        onToggle={onToggle}
        isActive={isActive && followUpQueries.length === 0}
      >
        <div className="space-y-4">
          {/* Analysis Section */}
          <div className="space-y-2">
            <div className="text-zinc-300">
              <MarkdownContent
                content={analysis}
                className="text-sm [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-base [&_h5]:text-sm [&_h6]:text-xs [&_p]:text-sm [&_li]:text-sm"
              />
            </div>
          </div>
        </div>
      </TimelineSection>

      {/* Follow-up Queries Section */}
      {followUpQueries.length > 0 && (
        <Queries
          queries={followUpQueries}
          expanded={true}
          onToggle={() => {}}
          isActive={isActive && followUpQueries.length > 0}
        />
      )}
    </>
  );
}
