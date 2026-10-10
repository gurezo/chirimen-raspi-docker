# Browser Example Catalog static image (linux/amd64, linux/arm64).
# This is not a Hardware Runtime: do not add GPIO / I2C tools or devices.
# Build context is the repository root (Compose build.context: .).
# Vite production output is served by nginx on port 4200.
FROM node:24-bookworm-slim AS base

WORKDIR /workspace

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# corepack prepare reads package.json "packageManager". Do not pin a second version here.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

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

RUN corepack enable && corepack prepare --activate \
  && pnpm install --frozen-lockfile

FROM deps AS build

COPY . .

# The Nx daemon does not run reliably inside a Docker build.
ENV NX_DAEMON=false
ENV CI=true

RUN pnpm nx build catalog

# Pin semver. Do not use latest. Official image is linux/amd64 and linux/arm64.
FROM nginx:1.30.4-alpine AS runtime

# wget is for HEALTHCHECK. GPIO / I2C tools are not installed.
RUN apk add --no-cache wget \
  && rm /etc/nginx/conf.d/default.conf

COPY docker/example-catalog/nginx.conf /etc/nginx/conf.d/example-catalog.conf
COPY --from=build /workspace/apps/catalog/dist /usr/share/nginx/html

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4200/ >/dev/null || exit 1
