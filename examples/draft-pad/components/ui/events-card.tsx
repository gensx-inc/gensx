import { Card } from "@/components/ui/card";

interface EventsCardProps<T> {
  title: string;
  events: T[];
  emptyMessage?: string;
  className?: string;
  maxHeight?: string;
}

export function EventsCard<T>({
  title,
  events,
  emptyMessage = "No events yet",
  className = "",
  maxHeight = "300px",
}: EventsCardProps<T>) {
  return (
    <Card className={`p-4 ${className}`}>
      <h2 className="text-lg font-semibold mb-4 text-[#333333]">{title}</h2>
      <div
        className="text-xs text-[#333333] bg-white/5 backdrop-blur-sm p-2 rounded-xl overflow-auto border border-white/10"
        style={{ maxHeight }}
      >
        {events.length === 0 ? (
          <p className="text-[#333333]/60">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {events
              .slice()
              .reverse()
              .map((event: T, i: number) => (
                <div
                  key={i}
                  className="border-b border-white/10 pb-2 last:border-b-0"
                >
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </div>
              ))}
          </div>
        )}
      </div>
    </Card>
  );
}
