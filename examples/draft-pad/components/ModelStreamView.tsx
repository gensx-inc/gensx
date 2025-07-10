"use client";

import { ModelStreamCard } from "@/components/ui/model-stream-card";
import { type DraftProgress, type ModelConfig } from "@/gensx/workflows";
import { type ContentVersion } from "@/lib/types";
import { AnimatePresence, motion } from "motion/react";

interface ModelStreamViewProps {
  selectedModelId: string | null;
  sortedModelStreams: DraftProgress["modelStreams"];
  modelConfigMap: Map<string, ModelConfig>;
  versionHistory: Record<string, ContentVersion[]>;
  isDiffVisible: boolean;
  showDiff?: boolean;
  autoShowDiff?: boolean;
  isManuallyHiding?: boolean;
  metricRanges: {
    minWordCount: number;
    maxWordCount: number;
    minTime: number;
    maxTime: number;
    minCost: number;
    maxCost: number;
    minTokensPerSecond: number;
    maxTokensPerSecond: number;
  } | null;
  onModelSelect: (modelId: string) => void;
}

export function ModelStreamView({
  selectedModelId,
  sortedModelStreams,
  modelConfigMap,
  versionHistory,
  isDiffVisible,
  metricRanges,
  onModelSelect,
}: ModelStreamViewProps) {
  // Helper functions for grid layout
  const getGridClassName = (modelCount: number) => {
    if (modelCount >= 7) {
      return "grid grid-cols-3 gap-4";
    } else if (modelCount === 6) {
      return "grid grid-cols-2 lg:grid-cols-3 gap-4";
    } else if (modelCount === 5) {
      return "grid grid-cols-2 lg:grid-cols-3 gap-4";
    } else if (modelCount === 4) {
      return "grid grid-cols-2 gap-4";
    } else if (modelCount === 3) {
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
    } else if (modelCount === 2) {
      return "grid grid-cols-2 gap-4";
    } else {
      return "grid grid-cols-1 gap-4";
    }
  };

  const getGridRowsClass = (modelCount: number) => {
    if (modelCount === 1) return "grid-rows-1";
    if (modelCount === 2) return "grid-rows-1";
    if (modelCount === 3) return "grid-rows-1";
    if (modelCount === 4) return "grid-rows-2";
    if (modelCount === 5) return "grid-rows-2";
    if (modelCount === 6) return "grid-rows-2";
    return "grid-rows-3";
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {selectedModelId ? (
          /* Single selected model view */
          <motion.div
            key="single-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <motion.div
              layout
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 25,
                duration: 0.6,
              }}
              className="flex-1 flex justify-center min-h-0"
            >
              <div className="w-full max-w-3xl min-h-0 flex">
                {(() => {
                  const selectedStream = sortedModelStreams.find(
                    (s) => s.modelId === selectedModelId,
                  );
                  return selectedStream ? (
                    <ModelStreamCard
                      modelStream={selectedStream}
                      modelConfig={modelConfigMap.get(selectedStream.modelId)}
                      isSelected={true}
                      onSelect={undefined}
                      metricRanges={metricRanges}
                      showDiff={isDiffVisible}
                      autoShowDiff={false}
                      previousVersion={(() => {
                        const history = versionHistory[selectedStream.modelId];
                        return history?.[history.length - 2];
                      })()}
                    />
                  ) : null;
                })()}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* Grid view of all models */
          <motion.div
            key="grid-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            {sortedModelStreams.length === 1 ? (
              /* Single model - full height with overflow */
              <motion.div layout className="flex-1 flex justify-center min-h-0">
                <div className="w-full max-w-3xl min-h-0 flex">
                  <ModelStreamCard
                    modelStream={sortedModelStreams[0]}
                    modelConfig={modelConfigMap.get(
                      sortedModelStreams[0].modelId,
                    )}
                    isSelected={false}
                    onSelect={() => {
                      onModelSelect(sortedModelStreams[0].modelId);
                    }}
                    metricRanges={metricRanges}
                    showDiff={isDiffVisible}
                    autoShowDiff={false}
                    previousVersion={(() => {
                      const history =
                        versionHistory[sortedModelStreams[0].modelId];
                      return history?.[history.length - 2];
                    })()}
                  />
                </div>
              </motion.div>
            ) : (
              /* Multiple models - grid layout */
              <motion.div
                layout
                className={`${getGridClassName(sortedModelStreams.length)} ${getGridRowsClass(sortedModelStreams.length)} flex-1 min-h-0 auto-rows-fr`}
              >
                <AnimatePresence mode="popLayout">
                  {sortedModelStreams.map((modelStream, index) => {
                    return (
                      <motion.div
                        key={modelStream.modelId}
                        layout
                        layoutId={`model-${modelStream.modelId}`}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        whileHover={{
                          scale: 1.02,
                          transition: { duration: 0.2 },
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 200,
                            damping: 25,
                            duration: 0.6,
                          },
                          opacity: {
                            duration: 0.6,
                            delay: index * 0.1,
                          },
                          scale: {
                            duration: 0.6,
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 200,
                            damping: 20,
                          },
                          y: {
                            duration: 0.6,
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 200,
                            damping: 20,
                          },
                        }}
                        className="min-h-0 flex"
                      >
                        <ModelStreamCard
                          modelStream={modelStream}
                          modelConfig={modelConfigMap.get(modelStream.modelId)}
                          isSelected={selectedModelId === modelStream.modelId}
                          onSelect={() => {
                            onModelSelect(modelStream.modelId);
                          }}
                          metricRanges={metricRanges}
                          showDiff={isDiffVisible}
                          autoShowDiff={false}
                          previousVersion={(() => {
                            const history = versionHistory[modelStream.modelId];
                            return history?.[history.length - 2];
                          })()}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
