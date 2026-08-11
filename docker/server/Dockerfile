FROM node:24-bookworm-slim AS base

WORKDIR /workspace

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

FROM base AS deps

# i2c-bus (via node-web-i2c) and other native addons need node-gyp at install time.
# Keep these packages in the deps/build stages only; runtime stays on slim base.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json tsconfig.json ./

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .

RUN pnpm nx build server

FROM base AS runtime

ENV NODE_ENV="production"
ENV HOST="0.0.0.0"
ENV PORT="33330"

COPY --from=build /workspace /workspace

EXPOSE 33330

CMD ["node", "apps/server/dist/main.js"]
