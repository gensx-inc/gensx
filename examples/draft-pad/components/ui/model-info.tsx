import { type ModelConfig } from "@/gensx/workflows";

interface ModelInfoProps {
  model: ModelConfig;
  className?: string;
}

export function ModelInfo({ model, className = "" }: ModelInfoProps) {
  if (!model.cost && !model.limit) {
    return null;
  }

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return (cost * 1000).toFixed(2);
    } else if (cost < 1) {
      return cost.toFixed(3);
    }
    return cost.toFixed(2);
  };

  const formatCostPrefix = (cost: number) => {
    if (cost < 0.01) {
      return ""; // No prefix for cents
    }
    return "$";
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return (tokens / 1000000).toFixed(1);
    } else if (tokens >= 1000) {
      return (tokens / 1000).toFixed(0);
    }
    return tokens.toString();
  };

  const formatTokenUnit = (tokens: number) => {
    if (tokens >= 1000000) {
      return "M";
    } else if (tokens >= 1000) {
      return "K";
    }
    return "";
  };

  return (
    <div className={`grid grid-cols-4 gap-2 px-1 py-2 ${className}`}>
      {/* Input Cost */}
      <div className="text-center">
        <div className="text-sm font-semibold text-[#333333]">
          {model.cost ? (
            <>
              {formatCostPrefix(model.cost.input)}
              {formatCost(model.cost.input)}
            </>
          ) : (
            "—"
          )}
        </div>
        <div className="text-[9px] text-[#333333]/50">1M Input</div>
      </div>

      {/* Output Cost */}
      <div className="text-center">
        <div className="text-sm font-semibold text-[#333333]">
          {model.cost ? (
            <>
              {formatCostPrefix(model.cost.output)}
              {formatCost(model.cost.output)}
            </>
          ) : (
            "—"
          )}
        </div>
        <div className="text-[9px] text-[#333333]/50">1M Output</div>
      </div>

      {/* Context Limit */}
      <div className="text-center">
        <div className="text-sm font-semibold text-[#333333]">
          {model.limit ? (
            <>
              {formatTokens(model.limit.context)}
              {formatTokenUnit(model.limit.context)}
            </>
          ) : (
            "—"
          )}
        </div>
        <div className="text-[9px] text-[#333333]/50">Context</div>
      </div>

      {/* Max Output */}
      <div className="text-center">
        <div className="text-sm font-semibold text-[#333333]">
          {model.limit ? (
            <>
              {formatTokens(model.limit.output)}
              {formatTokenUnit(model.limit.output)}
            </>
          ) : (
            "—"
          )}
        </div>
        <div className="text-[9px] text-[#333333]/50">Max Output</div>
      </div>
    </div>
  );
}
