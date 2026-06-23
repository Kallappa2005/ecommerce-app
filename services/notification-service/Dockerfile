FROM node:20-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY services/notification-service/package.json ./services/notification-service/
WORKDIR /app/services/notification-service
RUN npm install --omit=dev

COPY services/notification-service/ ./

WORKDIR /app

EXPOSE 4007

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4007/health || exit 1

CMD ["node", "services/notification-service/server.js"]
