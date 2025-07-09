"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText } from "lucide-react";

interface WorkflowOutputProps {
  result: {
    isValid: boolean;
    data?: unknown;
    error?: string;
    formatted?: string;
  } | null;
}

export default function WorkflowOutput({ result }: WorkflowOutputProps) {
  const getObjectInfo = (obj: unknown): string => {
    if (Array.isArray(obj)) {
      return `Array with ${obj.length} items`;
    } else if (typeof obj === "object" && obj !== null) {
      const keys = Object.keys(obj);
      return `Object with ${keys.length} properties`;
    }
    return typeof obj;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result?.isValid ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : result?.isValid === false ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground" />
          )}
          Results
          {result && (
            <Badge variant={result.isValid ? "default" : "destructive"}>
              {result.isValid ? "Valid" : "Invalid"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!result ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter JSON data and click &quot;Submit&quot; to see results</p>
            </div>
          </div>
        ) : result.isValid ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                ✅ Valid JSON!{" "}
                {result.data !== undefined && getObjectInfo(result.data)}
              </AlertDescription>
            </Alert>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">
                Formatted JSON:
              </h3>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[300px] text-sm font-mono border border-border text-foreground">
                {result.formatted}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4 text-red-500" />
              <AlertDescription>
                ❌ Invalid JSON: {result.error}
              </AlertDescription>
            </Alert>
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30">
              <h3 className="font-semibold text-destructive mb-2">
                Error Details:
              </h3>
              <p className="text-destructive text-sm font-mono">
                {result.error}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
