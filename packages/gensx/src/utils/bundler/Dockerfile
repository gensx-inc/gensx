FROM node:20-slim

RUN npm install -g @vercel/ncc

COPY ./build.sh /build.sh
RUN chmod +x /build.sh

# Entrypoint can be the runner or a shell for dev
ENTRYPOINT ["/bin/bash"]

CMD ["/build.sh"]
