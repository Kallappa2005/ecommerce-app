FROM node:20-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY services/email-service/package.json ./services/email-service/
WORKDIR /app/services/email-service
RUN npm install --omit=dev

COPY services/email-service/ ./

WORKDIR /app

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD pgrep -f "node" || exit 1

CMD ["node", "services/email-service/index.js"]
