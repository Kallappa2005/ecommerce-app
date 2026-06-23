FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY locations.conf /etc/nginx/conf.d/locations.conf
COPY proxy_params.conf /etc/nginx/conf.d/proxy_params.conf

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
