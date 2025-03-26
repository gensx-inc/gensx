#! /bin/bash

set -e

rm -rf /dist/*

# TODO: Don't mangle the user's node_modules
# TODO: Persist cache for ncc on disk between builds

cd /app

# Install required dependencies
npm install

WORKFLOW_PATH=${WORKFLOW_PATH:-"workflows.tsx"}

# Build with ncc - this should bundle all dependencies
ncc build ./${WORKFLOW_PATH} -o /dist --target es2022

# tar the dist directory
tar -czvf /dist.tar.gz /dist

mv /dist.tar.gz /dist
