# Build context is the REPO ROOT (set in docker-compose.yml: context: .)
# This allows the shared/ directory to be available during build

FROM node:20-alpine

WORKDIR /app

# Copy shared library first (layer caching optimization)
COPY shared/ ./shared/

# Copy service files
COPY services/user-service/package.json ./services/user-service/
WORKDIR /app/services/user-service
RUN npm install --omit=dev

COPY services/user-service/ ./

WORKDIR /app

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4001/health || exit 1

CMD ["node", "services/user-service/server.js"]
