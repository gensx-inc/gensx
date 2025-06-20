import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type DraftProgress } from "@/gensx/workflows";

interface DraftStatsCardProps {
  draftProgress: DraftProgress | null;
}

export function DraftStatsCard({ draftProgress }: DraftStatsCardProps) {
  return (
    <div className="space-y-4 overflow-y-auto">
      <h2 className="text-2xl font-bold text-[#333333] font-atma text-center">
        Draft Stats
      </h2>

      {draftProgress ? (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg text-[#333333]">
                  {draftProgress.stage.charAt(0).toUpperCase() +
                    draftProgress.stage.slice(1)}
                </CardTitle>
                {/* Last updated right under the status */}
                <div className="text-xs text-[#333333]/60 mt-1">
                  Last Updated:{" "}
                  {new Date(draftProgress.lastUpdated).toLocaleTimeString()}
                </div>
              </div>

              {/* Words and Characters on top right */}
              <div className="flex gap-4 text-right">
                <div>
                  <div className="text-xl font-bold text-blue-600">
                    {draftProgress.modelStreams.reduce(
                      (sum, stream) => sum + stream.wordCount,
                      0,
                    )}
                  </div>
                  <div className="text-xs text-[#333333]/70">Words</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">
                    {draftProgress.modelStreams.reduce(
                      (sum, stream) => sum + stream.charCount,
                      0,
                    )}
                  </div>
                  <div className="text-xs text-[#333333]/70">Characters</div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 space-y-3">
            {/* Progress bar where the progress label used to be */}
            <div className="w-full bg-[#333333]/10 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${draftProgress.percentage}%` }}
              />
            </div>

            {/* Current progress message */}
            <div className="text-sm text-[#333333]/70">
              {draftProgress.message}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="text-center text-[#333333]/60">
            No statistics available yet
          </div>
        </Card>
      )}
    </div>
  );
}
