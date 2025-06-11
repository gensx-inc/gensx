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

cd /tmp/project

# Use yarn or pnpm if there is a yarn.lock or pnpm-lock.yaml
if [ -f "yarn.lock" ]; then
  yarn install
elif [ -f "pnpm-lock.yaml" ]; then
  pnpm install
else
  npm install
fi

WORKFLOW_PATH=${WORKFLOW_PATH:-"workflows.ts"}

# Build with ncc - this should bundle all dependencies
ncc build ./${WORKFLOW_PATH} -o /out/dist --target es2022 -e "@libsql/client"

cd /out/dist

# Work around an issue with @libsql/client and bundlers
# https://github.com/tursodatabase/libsql-client-ts/issues/112
sed -i 's/@libsql\/linux-arm64-gnu/@libsql\/linux-x64-gnu/g' index.js

npm install @libsql/client

# tar the dist directory
tar -czvf ../dist.tar.gz *
