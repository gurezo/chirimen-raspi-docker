# Name-path redirect gateway (linux/amd64, linux/arm64).
# This is not a Hardware Runtime and not TLS termination.
# GET /{catalog|editor|example|runtime} 302 to the existing ports (#360).
FROM nginx:1.30.4-alpine

# wget is for HEALTHCHECK. GPIO / I2C tools are not installed.
RUN apk add --no-cache wget \
  && rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/gateway.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz | grep -q '^ok$' || exit 1
