#!/bin/bash

EXCLUDE_EXAMPLES=(
  "salty-ocean-model-comparison"
  "typescript-compatibility"
  "openai-computer-use"
  "self-modifying-code"
  "commonjs-compatibility"
  "llm-games"
)

# Iterate over each example and update all @gensx packages to the latest version
for example in examples/*; do
  if [ -d "$example" ]; then
    example_name=$(basename "$example")
    if [[ ! " ${EXCLUDE_EXAMPLES[@]} " =~ " ${example_name} " ]]; then
      pushd "$example"
      pnpm update -L @gensx/core @gensx/storage @gensx/vercel-ai @gensx/openai @gensx/anthropic @gensx/client @gensx/react
      popd
    fi
  fi
done
