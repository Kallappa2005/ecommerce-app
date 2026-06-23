FROM node:20-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY services/product-service/package.json ./services/product-service/
WORKDIR /app/services/product-service
RUN npm install --omit=dev

COPY services/product-service/ ./

WORKDIR /app

EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4002/health || exit 1

CMD ["node", "services/product-service/server.js"]
