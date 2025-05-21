FROM node:20-slim

# Install jq so we can manipulate tsconfig.json
RUN apt-get update && apt-get install -y jq

RUN npm install -g @vercel/ncc

COPY ./build.sh /build.sh
RUN chmod +x /build.sh

ENTRYPOINT ["/bin/bash"]

CMD ["/build.sh"]
