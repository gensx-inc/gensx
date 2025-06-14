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

      {/* Progress and Status */}
      {draftProgress && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg text-[#333333]">Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#333333]/70">Stage:</span>
              <span className="text-sm font-medium capitalize text-[#333333]">{draftProgress.stage}</span>
            </div>
            <div className="w-full bg-[#333333]/10 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${draftProgress.percentage}%` }}
              />
            </div>
            <div className="text-sm text-[#333333]/70">{draftProgress.message}</div>
          </CardContent>
        </Card>
      )}

      {/* Draft Statistics */}
      {draftProgress ? (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{draftProgress.wordCount}</div>
            <div className="text-sm text-[#333333]/70">Words</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{draftProgress.charCount}</div>
            <div className="text-sm text-[#333333]/70">Characters</div>
          </Card>

          <Card className="p-4 text-center col-span-2">
            <div className="text-xl font-bold text-purple-600 capitalize">{draftProgress.status}</div>
            <div className="text-sm text-[#333333]/70">Status</div>
          </Card>

          <Card className="p-4 text-center col-span-2">
            <div className="text-sm font-medium text-[#333333]">
              Last Updated
            </div>
            <div className="text-xs text-[#333333]/70">
              {new Date(draftProgress.lastUpdated).toLocaleTimeString()}
            </div>
          </Card>
        </div>
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
