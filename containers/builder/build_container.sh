#!/bin/bash

set -e

TAG=${1:-$GIT_SHA}

echo "Building..."

docker build --platform linux/x86_64 -t gensx/builder:$TAG .

if [ "$PUBLISH_LATEST" = "true" ]; then
  echo "Publishing..."

  docker login -u $DOCKER_USERNAME -p $DOCKER_ACCESS_TOKEN

  docker push gensx/builder:$TAG

  docker image tag gensx/builder:$TAG gensx/builder:latest
  docker push gensx/builder:latest
fi

echo "Done!"
