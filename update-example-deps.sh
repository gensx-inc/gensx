#!/bin/bash

# Iterate over each example and update all @gensx packages to the latest version
for example in examples/*; do
  if [ -d "$example" ]; then
    pushd "$example"
    pnpm update @gensx/core @gensx/storage @gensx/vercel-ai @gensx/openai @gensx/anthropic @gensx/client @gensx/react
    popd
  fi
done
