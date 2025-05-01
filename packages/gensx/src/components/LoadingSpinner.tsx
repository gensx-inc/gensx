import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface Props {
  message?: string;
}

export function LoadingSpinner({ message = "Loading..." }: Props) {
  return (
    <Box>
      <Text>
        <Spinner type="dots" /> <Text dimColor>{message}</Text>
      </Text>
    </Box>
  );
}
