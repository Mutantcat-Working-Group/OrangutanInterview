# OrangutanInterview 容器镜像：Node 多阶段构建前端静态产物，Nginx 托管。
FROM node:22-alpine AS build

ARG VERSION=1.0.20260920

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="OrangutanInterview" \
      org.opencontainers.image.description="Local interview practice tool with AI answers" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.vendor="Mutantcat Working Group"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]
