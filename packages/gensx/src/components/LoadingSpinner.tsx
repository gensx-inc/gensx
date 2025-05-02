import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface Props {
  message?: string;
}

// By default the message is empty, so just the spinner is shown
export function LoadingSpinner({ message = "" }: Props) {
  return (
    <Box>
      <Text>
        <Spinner type="dots" /> <Text dimColor>{message}</Text>
      </Text>
    </Box>
  );
}
