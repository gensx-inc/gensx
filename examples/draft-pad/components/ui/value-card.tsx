import { Card } from "@/components/ui/card";

interface ValueCardProps {
  title: string;
  value: unknown;
  className?: string;
}

export function ValueCard({ title, value, className = "" }: ValueCardProps) {
  return (
    <Card className={`p-4 ${className}`}>
      <h2 className="text-lg font-semibold mb-4 text-[#333333]">{title}</h2>
      <div className="text-xs text-[#333333] bg-white/5 backdrop-blur-sm p-2 rounded-xl overflow-auto max-h-[300px] border border-white/10">
        <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
      </div>
    </Card>
  );
}
