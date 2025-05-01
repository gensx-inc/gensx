import { Box, Text } from "ink";

interface Props {
  message: string;
  title?: string;
}

export function ErrorMessage({ message, title = "Error" }: Props) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="red">
          {title}: {message}
        </Text>
      </Box>
    </Box>
  );
}
