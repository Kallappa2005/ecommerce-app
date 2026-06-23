FROM node:20-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY gateway/package.json ./gateway/
WORKDIR /app/gateway
RUN npm install --omit=dev

COPY gateway/ ./

WORKDIR /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "gateway/server.js"]
