#!/bin/bash

set -e

echo "Publishing..."

docker login -u $DOCKER_USERNAME -p $DOCKER_ACCESS_TOKEN

docker build -t gensxeng/builder:$GIT_SHA .

docker push gensxeng/builder:$GIT_SHA

if [ "$PUBLISH_LATEST" = "true" ]; then
  docker image tag gensxeng/builder:$GIT_SHA gensxeng/builder:latest
  docker push gensxeng/builder:latest
fi

echo "Done!"
