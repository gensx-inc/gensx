#! /bin/bash

set -e

rm -rf /out/*

# TODO: Don't mangle the user's node_modules
# TODO: Persist cache for ncc on disk between builds

cd /app

# Install required dependencies
npm install

WORKFLOW_PATH=${WORKFLOW_PATH:-"workflows.tsx"}

# Build with ncc - this should bundle all dependencies
ncc build ./${WORKFLOW_PATH} -o /out/dist --target es2022

cd /out/dist

# tar the dist directory
tar -czvf ../dist.tar.gz *
