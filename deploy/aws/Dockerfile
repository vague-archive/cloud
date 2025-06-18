FROM ubuntu:24.04
COPY --from=denoland/deno:bin-1.46.3 /deno /usr/local/bin/deno

# create workdir and run as non root ubuntu user (uid: 1000, gid: 1000)
RUN apt -y update && \
    mkdir /app && \
    chown ubuntu:ubuntu /app
USER ubuntu
WORKDIR /app

# compile and cache dependencies as a layer
COPY deno.jsonc .
COPY src/deps.ts ./src/deps.ts
RUN deno cache src/deps.ts

# add project files
COPY --chown=ubuntu:ubuntu . .

# build asset bundles
# need to capture and pass-through the DENO_AUTH_TOKENS environment variable for this step
# YOU MUST SPECIFY --build-arg DENO_AUTH_TOKENS=${DENO_AUTH_TOKENS} WHEN BUILDING THIS IMAGE
ARG DENO_AUTH_TOKENS
ENV DENO_AUTH_TOKENS=${DENO_AUTH_TOKENS}
RUN deno task build

# compile and cache the main entry points so that they don't need to be compiled each startup/entry.
RUN deno cache cmd/web.ts
RUN deno cache cmd/files.ts
RUN deno cache cmd/minions.ts

# default CMD is to run cmd/web, but can be overriden by docker run args
ENTRYPOINT [ "deno", "run", "-A" ]
CMD ["cmd/web.ts"]
