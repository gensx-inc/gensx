#!/bin/bash

EXAMPLE_NAME=${1:-structuredOutputs}

if [ -z "$EXAMPLE_NAME" ]; then
  echo "Usage: $0 <example-name>"
  exit 1
fi

if [ ! -d "./examples/${EXAMPLE_NAME}" ]; then
  echo "Example ${EXAMPLE_NAME} not found"
  exit 1
fi

turbo run start --filter="./examples/${EXAMPLE_NAME}"
