import { Box, Text } from "ink";
import { useCallback, useEffect, useState } from "react";

import { LoginUI } from "../commands/login.js";
import { getState, saveState } from "../utils/config.js";

export function FirstTimeSetup() {
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkFirstTimeSetup = useCallback(async () => {
    try {
      const state = await getState();
      if (!state.hasCompletedFirstTimeSetup) {
        // Ensure that we don't ask again.
        await saveState({ hasCompletedFirstTimeSetup: true });
        setIsLoading(false);
      } else {
        setIsComplete(true);
      }
    } catch (_error) {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkFirstTimeSetup();
  }, [checkFirstTimeSetup]);

  if (isLoading) {
    return null;
  }

  if (isComplete) {
    return null;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        <Text color="yellow">
          Welcome to GenSX! Let's get you set up first.
        </Text>
      </Text>
      <LoginUI />
    </Box>
  );
}
