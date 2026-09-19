# Static build served by nginx, which also proxies /api to the API (or to
# gatelimit in front of it) so the browser sees one origin and there is
# no CORS. API_UPSTREAM is substituted into the nginx config at start.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npx vite build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://eventgrain:4200
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=6 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
