"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { XCircle, MessageSquare } from "lucide-react";

interface WorkflowOutputProps {
  result: string | null;
  status: string | null;
  error: string | null;
}

export default function WorkflowOutput({
  result,
  status,
  error,
}: WorkflowOutputProps) {
  const getStatusBadge = () => {
    if (error) return { variant: "destructive" as const, label: "Error" };
    if (status === "completed")
      return { variant: "default" as const, label: "Completed" };
    if (status === "streaming")
      return { variant: "default" as const, label: "Streaming" };
    if (status === "starting")
      return { variant: "default" as const, label: "Starting" };
    return { variant: "default" as const, label: "Ready" };
  };

  console.log("error", error);

  const statusBadge = getStatusBadge();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            Workflow Output
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4 text-red-500" />
              <AlertDescription>Error: {error}</AlertDescription>
            </Alert>
          </div>
        ) : !result ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>
                Enter a message and click &quot;Run&quot; to execute the
                workflow.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="bg-background p-4 rounded-lg overflow-auto max-h-[400px] text-sm border border-border">
                <div className="whitespace-pre-wrap text-foreground">
                  {result}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
