FROM node:20-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY services/cart-service/package.json ./services/cart-service/
WORKDIR /app/services/cart-service
RUN npm install --omit=dev

COPY services/cart-service/ ./

WORKDIR /app

EXPOSE 4003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4003/health || exit 1

CMD ["node", "services/cart-service/server.js"]
