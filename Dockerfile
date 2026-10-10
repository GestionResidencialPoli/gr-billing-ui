# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
ARG BACKEND_API_URL=http://localhost:4000
ENV BACKEND_API_URL=$BACKEND_API_URL
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app

EXPOSE 3007
ENV PORT=3007
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -S -O /dev/null http://127.0.0.1:3007/healthz.txt 2>&1 | grep -q "HTTP/1\." || exit 1

CMD ["node", "server.js"]
