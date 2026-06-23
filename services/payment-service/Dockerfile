FROM node:20-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY services/payment-service/package.json ./services/payment-service/
WORKDIR /app/services/payment-service
RUN npm install --omit=dev

COPY services/payment-service/ ./

WORKDIR /app

EXPOSE 4005

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4005/health || exit 1

CMD ["node", "services/payment-service/server.js"]
