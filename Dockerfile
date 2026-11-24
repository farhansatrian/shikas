# =============================================================================
# shikas (雫) — Ultra-Light Static SPA Container (Multi-Stage)
# Runtime footprint: ~15 MB RAM (nginx:1.27-alpine), ideal for 1 GB RAM VM
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_SHIZUKU_URL=""
ARG VITE_SHIZUKU_API_URL=""
ENV VITE_SHIZUKU_URL=${VITE_SHIZUKU_URL}
ENV VITE_SHIZUKU_API_URL=${VITE_SHIZUKU_API_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
