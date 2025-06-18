import { type ModelConfig, type ModelStreamState } from "@/gensx/workflows";
import { DollarSign } from "lucide-react";

interface LiveCostDisplayProps {
  modelStream: ModelStreamState;
  modelConfig?: ModelConfig;
  className?: string;
  showIcon?: boolean;
}

export function LiveCostDisplay({
  modelStream,
  modelConfig,
  className = "",
  showIcon = true,
}: LiveCostDisplayProps) {
  if (!modelConfig?.cost) {
    return null;
  }

  // Use exact token counts when available, otherwise estimate
  const inputTokens = modelStream.inputTokens ?? Math.ceil(500); // Default estimate for typical prompt
  const outputTokens =
    modelStream.outputTokens ?? Math.ceil(modelStream.charCount / 4);

  // Calculate costs (prices are per million tokens)
  const inputCost = (inputTokens / 1_000_000) * modelConfig.cost.input;
  const outputCost = (outputTokens / 1_000_000) * modelConfig.cost.output;
  const totalCost = inputCost + outputCost;

  // Convert to cost per 1000 requests
  const costPer1000 = totalCost * 1000;

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `${showIcon ? "$" : ""}${cost.toFixed(4)}`;
    } else if (cost < 1) {
      return `${showIcon ? "$" : ""}${cost.toFixed(3)}`;
    } else if (cost < 10) {
      return `${showIcon ? "$" : ""}${cost.toFixed(2)}`;
    } else {
      return `${showIcon ? "$" : ""}${cost.toFixed(1)}`;
    }
  };

  const isExact = modelStream.outputTokens !== undefined;

  return (
    <div
      className={`flex items-center gap-1 text-[#000000] ${className}`}
      title={
        isExact
          ? `Exact: ${inputTokens} input + ${outputTokens} output tokens = ${formatCost(totalCost)} per request`
          : `Estimated: ~${inputTokens} input + ~${outputTokens} output tokens = ~${formatCost(totalCost)} per request`
      }
    >
      {showIcon && <DollarSign className="w-3 h-3" />}
      <span>{formatCost(costPer1000)}/1k</span>
      {modelStream.status === "generating" && !isExact && (
        <span className="animate-pulse">~</span>
      )}
    </div>
  );
}
