"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface WorkflowInputProps {
  jsonInput: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export default function WorkflowInput({
  jsonInput,
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
          placeholder='Enter your JSON here...
Example:
{
  "name": "John Doe",
  "age": 30,
  "city": "New York"
}'
          value={jsonInput}
          onChange={(e) => onInputChange(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
        />
        <div className="flex gap-2">
          <Button onClick={onSubmit} className="flex-1">
            Submit
          </Button>
          <Button variant="destructive" onClick={onClear}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
