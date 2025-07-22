import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { type Example, SUPPORTED_EXAMPLES } from "./supported-examples.js";

interface UseExamplesResult {
  examples: Example[];
  loading: boolean;
  error: Error | null;
}

function useExamples(): UseExamplesResult {
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    let mounted = true;

    function fetchData() {
      try {
        if (mounted) {
          setExamples(SUPPORTED_EXAMPLES);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [exit]);

  return { examples, loading, error };
}

export function ListExamplesUI() {
  const { examples, loading, error } = useExamples();
  const { exit } = useApp();

  useEffect(() => {
    if (!loading && !error) {
      // Exit after displaying the list
      const timer = setTimeout(() => {
        exit();
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [loading, error, exit]);

  if (loading) {
    return <LoadingSpinner message="Loading examples..." />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="blue">
        Available Examples:
      </Text>
      {examples.length === 0 ? (
        <Text color="yellow">No examples found.</Text>
      ) : (
        examples.map((example) => (
          <Box
            key={example.name}
            flexDirection="column"
            marginLeft={2}
            marginBottom={1}
            gap={0}
          >
            <Box>
              <Text bold color="green">
                {example.name}
              </Text>
              {example.category && (
                <Text color="cyan"> ({example.category})</Text>
              )}
            </Box>
            <Box marginLeft={2}>
              <Text color="gray">{example.description}</Text>
            </Box>
          </Box>
        ))
      )}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          › Run{" "}
          <Text color="yellow">gensx examples clone &lt;example-name&gt;</Text>{" "}
          to clone an example.
        </Text>
      </Box>
    </Box>
  );
}
