# HTML Example static image (linux/amd64, linux/arm64).
# This is not a Hardware Runtime: do not add GPIO / I2C tools or devices.
# Build context is docker/examples. Example files are bind-mounted at
# runtime from docs/examples so Editor saves are visible after reload.
FROM nginx:1.30.4-alpine

# wget is for HEALTHCHECK. GPIO / I2C tools are not installed.
RUN apk add --no-cache wget \
  && rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/examples.conf

VOLUME ["/usr/share/nginx/html"]

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4173/led-blink/ >/dev/null || exit 1
