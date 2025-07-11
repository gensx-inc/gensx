"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface WorkflowInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export default function WorkflowInput({
  input,
  onInputChange,
  onSubmit,
  onClear,
}: WorkflowInputProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          Workflow Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter your message here..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onSubmit} className="w-24">
            Run
          </Button>
          <Button variant="outline" onClick={onClear}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
