import { type ModelConfig } from "@/gensx/workflows";
import { Info } from "lucide-react";

interface ModelInfoProps {
  model: ModelConfig;
  className?: string;
  showIcon?: boolean;
}

export function ModelInfo({
  model,
  className = "",
  showIcon = true,
}: ModelInfoProps) {
  if (!model.cost && !model.limit) {
    return null;
  }

  const formatCost = (cost: number) => {
    return cost < 1 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  return (
    <div className={`text-[10px] text-[#333333]/60 space-y-1 ${className}`}>
      {showIcon && <Info className="w-3 h-3 inline mr-1" />}

      {model.cost && (
        <div className="flex items-center gap-3">
          <span>Input: {formatCost(model.cost.input)}/M</span>
          <span>Output: {formatCost(model.cost.output)}/M</span>
        </div>
      )}

      {model.limit && (
        <div className="flex items-center gap-3">
          <span>Context: {formatTokens(model.limit.context)}</span>
          <span>Max Output: {formatTokens(model.limit.output)}</span>
        </div>
      )}
    </div>
  );
}
