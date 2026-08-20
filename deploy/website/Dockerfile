# Static Astro + Starlight site (@kunk/website).
# Build context: repository root (needs project-tools/docs for sync-docs).

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/registration/package.json ./apps/registration/
COPY apps/kunk/package.json ./apps/kunk/
COPY apps/doc-sign/package.json ./apps/doc-sign/
COPY apps/website/package.json ./apps/website/
COPY packages ./packages

RUN npm ci

COPY apps/website ./apps/website
COPY project-tools/docs ./project-tools/docs

RUN npm run build -w @kunk/website

FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache gettext \
  && rm -f /etc/nginx/conf.d/default.conf \
  && sed -i 's/listen\s\+80;/listen 8080;/' /etc/nginx/conf.d/default.conf 2>/dev/null || true

COPY deploy/spa/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/spa/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=build /app/apps/website/dist /usr/share/nginx/html

ENV PORT=8080 \
    KUNK_API_PUBLIC_HOST=kunk-api-production.up.railway.app

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]

