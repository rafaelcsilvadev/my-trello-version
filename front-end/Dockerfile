# Build context is the repository root (pnpm workspace + single lockfile):
#   docker build -f front-end/Dockerfile --build-arg VITE_API_URL=http://localhost:3000 .
# VITE_API_URL is baked into the bundle at build time; another API origin
# needs a rebuild.
FROM node:24.17.0-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY front-end/package.json front-end/
COPY packages/api-contract/package.json packages/api-contract/

FROM base AS build
ARG VITE_API_URL=http://localhost:3000
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --filter front-end...
COPY packages/api-contract/ packages/api-contract/
COPY front-end/ front-end/
RUN VITE_API_URL="$VITE_API_URL" pnpm --filter front-end build

FROM nginxinc/nginx-unprivileged:1.31.7-alpine AS runtime
ARG VITE_API_URL=http://localhost:3000
# The image's entrypoint runs envsubst on /etc/nginx/templates/*.template, so
# the CSP connect-src follows the same origin the bundle was built with.
ENV API_ORIGIN=$VITE_API_URL
COPY front-end/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/front-end/dist /usr/share/nginx/html
EXPOSE 8080
