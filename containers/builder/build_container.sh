#!/bin/bash

set -e

echo "Publishing..."

docker login -u $DOCKER_USERNAME -p $DOCKER_ACCESS_TOKEN

docker build -t gensx/builder:$GIT_SHA .

docker push gensx/builder:$GIT_SHA

if [ "$PUBLISH_LATEST" = "true" ]; then
  docker image tag gensx/builder:$GIT_SHA gensx/builder:latest
  docker push gensx/builder:latest
fi

echo "Done!"
