FROM node:24-bookworm-slim AS base

WORKDIR /workspace

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

FROM base AS deps

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
