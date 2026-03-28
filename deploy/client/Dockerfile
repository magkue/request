FROM node:22-alpine AS build

WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN mkdir -p /etc/nginx/extra.d

EXPOSE 8080

ENTRYPOINT ["/bin/sh", "-c", "sh /usr/share/nginx/html/vite-envs.sh && exec nginx -g 'daemon off;'"]
