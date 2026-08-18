# Browser Web Demo static image (linux/amd64, linux/arm64).
# This is not a Hardware Runtime: do not add GPIO / I2C tools or devices.
# Build context is the repository root (Compose build.context: .).
# Vite production output is served by nginx on port 4200.
FROM node:24-bookworm-slim AS base

WORKDIR /workspace

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

FROM base AS deps

# pnpm install still pulls native addons from the lockfile (node-web-gpio /
# node-web-i2c). Keep node-gyp toolchain in deps/build only.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

ENV npm_config_nodedir=/usr/local

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json tsconfig.json ./

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .

RUN pnpm nx build web-demo

# Pin semver. Do not use latest. Official image is linux/amd64 and linux/arm64.
FROM nginx:1.30.4-alpine AS runtime

# wget is for HEALTHCHECK. GPIO / I2C tools are not installed.
RUN apk add --no-cache wget \
  && rm /etc/nginx/conf.d/default.conf

COPY docker/web-demo/nginx.conf /etc/nginx/conf.d/web-demo.conf
COPY --from=build /workspace/apps/web-demo/dist /usr/share/nginx/html

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4200/ >/dev/null || exit 1
