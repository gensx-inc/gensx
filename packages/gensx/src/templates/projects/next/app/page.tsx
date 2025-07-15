"use client";

import { useState } from "react";
import WorkflowInput from "@/components/WorkflowInput";
import WorkflowOutput from "@/components/WorkflowOutput";
import Header from "@/components/Header";
import { useWorkflow, useObject } from "@gensx/react";
import { ChatProps } from "@/gensx/workflows";

export default function Page() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  // Use the workflow hook
  const { error, execution, run, clear } = useWorkflow<ChatProps, string>({
    config: {
      baseUrl: "/api/gensx/StreamText",
    },
    onEvent: (event) => {
      if (event.type === "event" && event.label === "status") {
        setStatus(event.data as string);
      }
    },
  });

  const result = useObject<string>(execution, "text");

  const handleClear = () => {
    setMessage("");
    setStatus(null);
    clear();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 mt-18">
            <WorkflowInput
              input={message}
              onInputChange={setMessage}
              onSubmit={() => run({ inputs: { userMessage: message } })}
              onClear={handleClear}
            />
            <WorkflowOutput
              result={result as string | null}
              status={status ?? null}
              error={error ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
