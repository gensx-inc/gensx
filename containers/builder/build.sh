#! /bin/bash

set -e

rm -rf /out/*

# TODO: Persist cache for ncc on disk between builds

cd /app

mkdir -p /tmp/project

for file in * .*; do
  [[ "$file" == "." || "$file" == ".." ]] && continue
  [[ "$file" == "node_modules" || "$file" == "dist" || "$file" == "dist.tar.gz" || "$file" == ".gensx" ]] && continue
  cp -r "$file" /tmp/project/
done

# Install required dependencies
npm install

WORKFLOW_PATH=${WORKFLOW_PATH:-"workflows.tsx"}

# Build with ncc - this should bundle all dependencies
ncc build ./${WORKFLOW_PATH} -o /out/dist --target es2022

cd /out/dist

# tar the dist directory
tar -czvf ../dist.tar.gz *
