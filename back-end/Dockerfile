# Build context is the repository root (pnpm workspace + single lockfile):
#   docker build -f back-end/Dockerfile .
# The pnpm store and metadata cache live in BuildKit cache mounts so they stay
# out of the image layers.
FROM node:24.17.0-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY back-end/package.json back-end/

FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --filter back-end...
COPY back-end/ back-end/
RUN pnpm --filter back-end build

FROM base AS runtime
ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    pnpm install --prod --frozen-lockfile --filter back-end
COPY --from=build /app/back-end/dist back-end/dist
WORKDIR /app/back-end
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
