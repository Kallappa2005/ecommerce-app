FROM node:20-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY services/order-service/package.json ./services/order-service/
WORKDIR /app/services/order-service
RUN npm install --omit=dev

COPY services/order-service/ ./

WORKDIR /app

EXPOSE 4004

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4004/health || exit 1

CMD ["node", "services/order-service/server.js"]
