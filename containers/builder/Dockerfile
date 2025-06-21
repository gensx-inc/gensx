FROM node:20-slim

RUN which yarn || npm install -g yarn
RUN which pnpm || npm install -g pnpm@latest-10

RUN apt-get update && apt-get install -y jq

RUN npm install -g @vercel/ncc

COPY ./build.sh /build.sh
RUN chmod +x /build.sh

ENTRYPOINT ["/bin/bash"]

CMD ["/build.sh"]
